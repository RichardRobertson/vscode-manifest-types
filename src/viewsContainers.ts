import type { IViewContainer } from "./index.js";
import { toIdentifier, translate } from "./strings.js";
import { PropagatedKey, propagateKey, TreeNode } from "./tree.js";

export async function writeViewsContainersAsync(
    viewsContainers: Record<string, IViewContainer[]>,
    packageName: string | undefined,
    directory: string,
    translations?: Record<string, string>
): Promise<void> {
    let root = TreeNode.fromFlatList(
        propagateKey(viewsContainers),
        (view, index) => view.id ?? `view${index}`,
        "viewsContainer"
    );
    if (packageName !== undefined) {
        root = root.pruneRootIfSingleBranch(toIdentifier(packageName));
    }
    root.fixBranchLeafCollisions("view");
    await root.writeToModulesAsync(
        (
            { leafKey: viewKey, leaf: { id, title, [PropagatedKey]: container }, childIndex },
            writer
        ) => {
            if (childIndex !== 0) {
                writer.writeLine();
            }
            if (title === undefined) {
                writer.writeLine(`/** **Container**: ${container} */`);
            } else {
                writer.writeLines(
                    "/**",
                    ` * **Container**: ${container}`,
                    " *",
                    ` * **Title**: ${translate(title, translations)}`,
                    " */"
                );
            }
            writer.writeLine(`export const ${viewKey} = "${id}";`);
        },
        directory
    );
}
