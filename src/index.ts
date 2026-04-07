import type { PathLike } from "node:fs";
import { readFile } from "node:fs/promises";
import type { JSONSchema } from "json-schema-to-typescript";
import * as JSONC from "jsonc-parser";

export { writeCommandsAsync } from "./commands.js";
export { writeConfigurationAsync } from "./configuration.js";
export { DecreaseIndent, IncreaseIndent, IndentedStringWriter } from "./indentedStringWriter.js";
export { writePackageMetadataAsync } from "./packageMetadata.js";
export { BranchContext, LeafContext, PropagatedKey, propagateKey, TreeNode } from "./tree.js";
export { writeViewsAsync } from "./views.js";
export { writeViewsContainersAsync } from "./viewsContainers.js";

/**
 * Read the specified file as UTF-8 and parse it as JSON with comments
 * @param path Path to the `package.json` file
 * @returns A promise that resolves to a {@link PackageJson}
 */
export async function readPackageJsonAsync(path: PathLike): Promise<PackageJson> {
    const fileContents = await readFile(path, "utf-8");
    const parsed = JSONC.parse(fileContents);
    return parsed;
}

/** Represents specified entries from a `package.json` file */
export interface PackageJson {
    /** The package name */
    name?: string;

    /** The package version */
    version?: string;

    /** A VSCode extension `contributes` section */
    contributes?: IExtensionContributions;
}

/** A VSCode extension `contributes` section */
export interface IExtensionContributions {
    /** Declared commands */
    commands?: ICommand[];

    /** Declared configuration items */
    configuration?: IConfigurationHeader | IConfigurationHeader[];

    /** Declared views */
    views?: Record<string, IView[]>;

    /** Declared view containers */
    viewsContainers?: Record<string, IViewContainer[]>;
}

/** A single command declaration */
export interface ICommand {
    /** The ID of the command */
    command?: string;

    /** The title of the command */
    title?: string;

    /** The category of the command */
    category?: string;
}

/** A single view declaration */
export interface IView {
    /** The ID of the view */
    id?: string;

    /** The name of the view */
    name?: string;
}

/** A single view container declaration */
export interface IViewContainer {
    /** The ID of the view container */
    id?: string;

    /** The title of the view container */
    title?: string;
}

/** A single configuration header */
export interface IConfigurationHeader {
    /** The title of this header */
    title?: string;

    /** A number indicating where this header should be displayed relative to others */
    order?: number;

    /** The configuration items that belong to this header */
    properties?: Record<string, IPropertyMetadata & JSONSchema>;
}

/** Details about a single property item */
export interface IPropertyMetadata {
    /** The plain text description of this property */
    description?: string;

    /** The Markdown description of this property */
    markdownDescription?: string;

    /** A number indicating where this property should be displayed relative to others */
    order?: number;

    /** The plain text reason this property is deprecated */
    deprecationMessage?: string;

    /** The Markdown reason this property is deprecated */
    markdownDeprecationMessage?: string;
}
