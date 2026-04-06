#!/usr/bin/env node

import * as fsAsync from "node:fs/promises";
import * as path from "node:path";
import { exit } from "node:process";
import { Command } from "commander";
import { writeCommandsAsync } from "./commands.js";
import { writeConfigurationAsync } from "./configuration.js";
import { type PackageJson, readPackageJsonAsync } from "./index.js";
import { writePackageMetadataAsync } from "./packageMetadata.js";
import { writeViewsAsync } from "./views.js";
import { writeViewsContainersAsync } from "./viewsContainers.js";

const program: Command = new Command();

await program
    .option("-p, --package <path>", "path to package.json", "./package.json")
    .option("-o, --out <path>", "output directory", undefined)
    .parseAsync();

const parsedOptions: {
    package: string;
    out?: string;
} = program.opts();

try {
    await fsAsync.access(parsedOptions.package);
} catch (e) {
    program.error(`Cannot access package file [${parsedOptions.package}]:\ne${e}`);
}

if (parsedOptions.out === undefined) {
    parsedOptions.out = path.join(path.dirname(parsedOptions.package), "./generated");
}

const outDir: string = parsedOptions.out;

console.info(`Using [${outDir}] as output directory`);

const packageJson: PackageJson = await readPackageJsonAsync(parsedOptions.package);
const translations: Record<string, string> | undefined = await (async () => {
    const defaultLanguagePath = path.join(
        path.dirname(parsedOptions.package),
        "./package.nls.json"
    );
    let translations: Record<string, string> | undefined;
    try {
        translations = JSON.parse(await fsAsync.readFile(defaultLanguagePath, "utf-8"));
    } catch (_e) {}
    return translations;
})();

await writePackageMetadataAsync(packageJson.name, packageJson.version, outDir);

if (packageJson.contributes === undefined) {
    console.warn("[WARN] `package.json` does not contain a contributes section");
    exit(1);
}

if (packageJson.contributes.commands !== undefined) {
    await writeCommandsAsync(
        packageJson.contributes.commands,
        packageJson.name,
        path.join(outDir, "./commands"),
        translations
    );
}

if (packageJson.contributes.configuration !== undefined) {
    await writeConfigurationAsync(
        packageJson.contributes.configuration,
        packageJson.name,
        path.join(outDir, "./configuration"),
        translations
    );
}

if (packageJson.contributes.views !== undefined) {
    await writeViewsAsync(
        packageJson.contributes.views,
        packageJson.name,
        path.join(outDir, "./views"),
        translations
    );
}

if (packageJson.contributes.viewsContainers !== undefined) {
    await writeViewsContainersAsync(
        packageJson.contributes.viewsContainers,
        packageJson.name,
        path.join(outDir, "./viewsContainers"),
        translations
    );
}
