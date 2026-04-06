import type { IView } from "./index.js";
import { toIdentifier, translate } from "./strings.js";
import { PropagatedKey, propagateKey, TreeNode } from "./tree.js";

export async function writeViewsAsync(
    views: Record<string, IView[]>,
    packageName: string | undefined,
    directory: string,
    translations?: Record<string, string>
): Promise<void> {
    let root = TreeNode.fromFlatList(
        propagateKey(views),
        (view, index) => view.id ?? `view${index}`,
        "view"
    );
    if (packageName !== undefined) {
        root = root.pruneRootIfSingleBranch(toIdentifier(packageName));
    }
    root.fixBranchLeafCollisions("view");
    await root.writeToModulesAsync(
        (
            { leafKey: viewKey, leaf: { id, name, [PropagatedKey]: container }, childIndex },
            writer
        ) => {
            if (childIndex !== 0) {
                writer.writeLine();
            }
            if (name === undefined) {
                writer.writeLine(`/** **Container**: ${container} */`);
            } else {
                writer.writeLines(
                    "/**",
                    ` * **Container**: ${container}`,
                    " *",
                    ` * **Name**: ${translate(name, translations)}`,
                    " */"
                );
            }
            writer.writeLine(`export const ${viewKey} = "${id}";`);
        },
        directory
    );
}
