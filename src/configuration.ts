import { exit } from "node:process";
import { pascalCase } from "change-case";
import { compile, type JSONSchema } from "json-schema-to-typescript";
import { DecreaseIndent, IncreaseIndent } from "./indentedStringWriter.js";
import type { IConfigurationHeader, IPropertyMetadata } from "./index.js";
import { toIdentifier, translate } from "./strings.js";
import { TreeNode } from "./tree.js";

/**
 * Generate nested modules of types and wrapper functions for the given configuration
 * @param configuration The configuration to declare types and wrappers for
 * @param packageName The name of the package these were read from - this name is trimmed from the root if it is common across all declared commands
 * @param directory The directory root to generate files to
 * @param translations The values read from `package.nls.json`
 * @returns A promise that resolves when writing is complete
 */
export async function writeConfigurationAsync(
    configuration: IConfigurationHeader | IConfigurationHeader[],
    packageName: string | undefined,
    directory: string,
    translations?: Record<string, string>
): Promise<void> {
    if (!Array.isArray(configuration)) {
        configuration = [configuration];
    }
    const configs = configuration
        .map((header) => header.properties)
        .filter((properties) => properties !== undefined);
    {
        const allKeys = configs.flatMap((properties) => Object.keys(properties));
        const duplicates = allKeys.filter((property, index) => allKeys.indexOf(property) !== index);
        if (duplicates.length !== 0) {
            console.error("[ERROR] duplicate configuration keys found");
            for (const duplicate of duplicates) {
                console.error(`    > ${duplicate}`);
            }
            exit(1);
        }
    }
    const merged: [string, IPropertyMetadata & JSONSchema][] = configs.flatMap(Object.entries);
    let root = TreeNode.fromFlatList(
        merged,
        ([key, _], index) => key ?? `property${index}`,
        "configuration"
    );
    if (packageName !== undefined) {
        root = root.pruneRootIfSingleBranch(toIdentifier(packageName));
    }
    root.fixBranchLeafCollisions("configuration");
    await root.writeToModulesAsync(
        async (
            {
                parentPath,
                leafKey: configurationKey,
                leaf: [configurationFullKey, propertyHeader],
                leafIndex,
                childIndex,
            },
            writer
        ) => {
            const propertyMetadata: IPropertyMetadata = propertyHeader;
            const propertyType: JSONSchema = propertyHeader;
            const propertyNamePascal = pascalCase(configurationKey);
            const propertyTypeName = `${propertyNamePascal}Type`;
            if (leafIndex === 0) {
                if (childIndex !== 0) {
                    writer.writeLine();
                }
                writer.writeLine('import * as vscode from "vscode";');
                if (parentPath.length !== 1) {
                    writer.writeLines(
                        undefined,
                        `import type { Inspect } from "${"../".repeat(parentPath.length - 1)}index.js";`
                    );
                }
            }
            writer.writeLines(
                undefined,
                ...(await getTypeStringLines(propertyType, propertyTypeName)),
                undefined
            );
            const description = translate(
                propertyMetadata.description ?? propertyMetadata.markdownDescription,
                translations
            );
            const deprecated = translate(
                propertyMetadata.deprecationMessage ?? propertyMetadata.markdownDeprecationMessage,
                translations
            );
            let jsdoc: string[] = [];
            if (description !== undefined && deprecated !== undefined) {
                jsdoc = [
                    "/**",
                    ` * **Description**: ${description}`,
                    " *",
                    ` * @deprecated ${deprecated}`,
                    " */",
                ];
            } else if (description !== undefined) {
                jsdoc = [`/** **Description**: ${description} */`];
            } else if (deprecated !== undefined) {
                jsdoc = [`/** @deprecated ${deprecated} */`];
            }
            const section = configurationFullKey.slice(0, configurationFullKey.lastIndexOf("."));
            const originalKey = configurationFullKey.slice(
                configurationFullKey.lastIndexOf(".") + 1
            );
            writer.writeLines(
                ...jsdoc,
                `export function get${propertyNamePascal}(): ${propertyTypeName} {`,
                IncreaseIndent,
                `return vscode.workspace.getConfiguration("${section}").get<${propertyTypeName}>("${originalKey}", ${JSON.stringify(propertyHeader.default)});`,
                DecreaseIndent,
                "}",
                undefined,
                ...jsdoc,
                `export function update${propertyNamePascal}(value?: ${propertyTypeName}, configurationTarget?: boolean | vscode.ConfigurationTarget | null, overrideInLanguage?: boolean): Thenable<void> {`,
                IncreaseIndent,
                `return vscode.workspace.getConfiguration("${section}").update("${originalKey}", value, configurationTarget, overrideInLanguage);`,
                DecreaseIndent,
                "}",
                undefined,
                ...jsdoc,
                `export function inspect${propertyNamePascal}(): Inspect<${propertyTypeName}> {`,
                IncreaseIndent,
                `const inspect = vscode.workspace.getConfiguration("${section}").inspect<${propertyTypeName}>("${originalKey}");`,
                "if (inspect === undefined) {",
                IncreaseIndent,
                "throw new Error();",
                DecreaseIndent,
                "}",
                "return inspect;",
                DecreaseIndent,
                "}"
            );
        },
        directory,
        (branchContext, writer) => {
            if (branchContext.parentPath.length === 0) {
                writer.writeLines(...InterfaceInspect);
            }
        }
    );
}

/**
 * Invoke `json-schema-to-typescript` with specific parameters
 * @param typeObject The JSON schema type
 * @param name The name to give the object
 * @returns A promise that resolves to the type string split into lines
 */
async function getTypeStringLines(typeObject: JSONSchema, name: string): Promise<string[]> {
    return (
        await compile(typeObject, name, {
            additionalProperties: false,
            bannerComment: "",
            format: true,
            style: {
                bracketSpacing: true,
                printWidth: 120,
                semi: true,
                singleQuote: false,
                tabWidth: 4,
                trailingComma: "all",
                useTabs: false,
            },
        })
    )
        .trimEnd()
        .split("\n")
        .filter((s) => s !== undefined && s !== null && s.trim() !== "");
}

/** A preformatted set of lines to define the result for the `inspect*` functions */
const InterfaceInspect: readonly (
    | string
    | typeof IncreaseIndent
    | typeof DecreaseIndent
    | undefined
)[] = [
    "export interface Inspect<T> {",
    IncreaseIndent,
    "/**",
    " * The fully qualified key of the configuration value",
    " */",
    "key: string;",
    undefined,
    "/**",
    " * The default value which is used when no other value is defined",
    " */",
    "defaultValue?: T;",
    undefined,
    "/**",
    " * The global or installation-wide value.",
    " */",
    "globalValue?: T;",
    undefined,
    "/**",
    " * The workspace-specific value.",
    " */",
    "workspaceValue?: T;",
    undefined,
    "/**",
    " * The workspace-folder-specific value.",
    " */",
    "workspaceFolderValue?: T;",
    undefined,
    "/**",
    " * Language specific default value when this configuration value is created for a {@link vscode.ConfigurationScope language scope}.",
    " */",
    "defaultLanguageValue?: T;",
    undefined,
    "/**",
    " * Language specific global value when this configuration value is created for a {@link vscode.ConfigurationScope language scope}.",
    " */",
    "globalLanguageValue?: T;",
    undefined,
    "/**",
    " * Language specific workspace value when this configuration value is created for a {@link vscode.ConfigurationScope language scope}.",
    " */",
    "workspaceLanguageValue?: T;",
    undefined,
    "/**",
    " * Language specific workspace-folder value when this configuration value is created for a {@link vscode.ConfigurationScope language scope}.",
    " */",
    "workspaceFolderLanguageValue?: T;",
    undefined,
    "/**",
    " * All language identifiers for which this configuration is defined.",
    " */",
    "languageIds?: string[];",
    DecreaseIndent,
    "}",
    undefined,
] as const;
