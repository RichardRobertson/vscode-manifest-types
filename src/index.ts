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

export async function readPackageJsonAsync(path: PathLike): Promise<PackageJson> {
    const fileContents = await readFile(path, "utf-8");
    const parsed = JSONC.parse(fileContents);
    return parsed;
}

export interface PackageJson {
    name?: string;
    version?: string;
    contributes?: IExtensionContributions;
}

export interface IExtensionContributions {
    commands?: ICommand[];
    configuration?: IConfigurationHeader | IConfigurationHeader[];
    views?: Record<string, IView[]>;
    viewsContainers?: Record<string, IViewContainer[]>;
}

export interface ICommand {
    command?: string;
    title?: string;
    category?: string;
}

export interface IView {
    id?: string;
    name?: string;
}

export interface IViewContainer {
    id?: string;
    title?: string;
}

export interface IConfigurationHeader {
    title?: string;
    order?: number;
    properties?: Record<string, IPropertyMetadata & JSONSchema>;
}

export interface IPropertyMetadata {
    description?: string;
    markdownDescription?: string;
    order?: number;
    deprecationMessage?: string;
    markdownDeprecationMessage?: string;
}
