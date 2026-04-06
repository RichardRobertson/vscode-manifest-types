import * as fsAsync from "node:fs/promises";
import * as path from "node:path";
import { IndentedStringWriter } from "./indentedStringWriter.js";

export async function writePackageMetadataAsync(
    packageName: string | undefined,
    packageVersion: string | undefined,
    directory: string
): Promise<void> {
    const writer = new IndentedStringWriter();
    writer.writeGeneratedHeaderComment();

    if (packageName !== undefined) {
        writer.writeLine(`export const packageName = "${packageName}";`);
    }

    if (packageVersion !== undefined) {
        if (packageName !== undefined) {
            writer.writeLine();
        }
        writer.writeLine(`export const packageVersion = "${packageVersion}";`);
    }

    if (packageName !== undefined || packageVersion !== undefined) {
        await fsAsync.mkdir(directory, { recursive: true });
        await writer.writeFileAsync(path.join(directory, "./index.ts"));
    }
}
