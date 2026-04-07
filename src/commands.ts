import type { ICommand } from "./index.js";
import { toIdentifier, translate } from "./strings.js";
import { TreeNode } from "./tree.js";

export async function writeCommandsAsync(
    commands: ICommand[],
    packageName: string | undefined,
    directory: string,
    translations?: Record<string, string>
): Promise<void> {
    let root = TreeNode.fromFlatList(
        commands,
        (command, index) => command.command ?? `command${index}`,
        "command"
    );
    if (packageName !== undefined) {
        root = root.pruneRootIfSingleBranch(toIdentifier(packageName));
    }
    root.fixBranchLeafCollisions("command");
    await root.writeToModulesAsync(
        ({ leafKey: commandKey, leaf: { command, title, category }, childIndex }, writer) => {
            title = translate(title, translations);
            category = translate(category, translations);
            if (childIndex !== 0) {
                writer.writeLine();
            }
            if (title !== undefined && category !== undefined) {
                writer.writeLines(
                    "/**",
                    ` * **Title**: ${title}`,
                    " *",
                    ` * **Category**: ${category}`,
                    " */"
                );
            } else if (title !== undefined) {
                writer.writeLine(`/** **Title**: ${title} */`);
            } else if (category !== undefined) {
                writer.writeLine(`/** **Category**: ${category} */`);
            }
            writer.writeLine(`export const ${commandKey} = "${command}";`);
        },
        directory
    );
}
