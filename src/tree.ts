import * as fsAsync from "node:fs/promises";
import * as path from "node:path";
import { IndentedStringWriter } from "./indentedStringWriter.js";
import { toIdentifier } from "./strings.js";

export class TreeNode<TLeaf> {
    constructor(
        readonly key: string,
        private readonly branches: Record<string, TreeNode<TLeaf>> = {},
        private readonly leaves: Record<string, TLeaf> = {}
    ) {}

    static fromFlatList<TLeaf>(
        flatList: TLeaf[],
        extractDottedKey: (item: TLeaf, index: number) => string,
        context: string
    ): TreeNode<TLeaf> {
        const root = new TreeNode<TLeaf>("");
        for (let i = 0; i < flatList.length; i++) {
            const dottedKey = extractDottedKey(flatList[i], i);
            const dotSplit = dottedKey.split(".").map(toIdentifier);
            const dotSplitLast =
                dotSplit.pop() ??
                (() => {
                    throw new Error("unreachable");
                })();
            const branch = root.getOrCreateBranches(...dotSplit);
            if (branch.hasLeaf(dotSplitLast)) {
                console.warn(`[WARN] duplicate ${context} key ${dottedKey}`);
                continue;
            }
            branch.setLeaf(dotSplitLast, flatList[i]);
        }
        return root;
    }

    hasBranch(key: string): boolean {
        return Object.hasOwn(this.branches, key);
    }

    hasLeaf(key: string): boolean {
        return Object.hasOwn(this.leaves, key);
    }

    getOrCreateBranch(key: string): TreeNode<TLeaf> {
        if (this.hasBranch(key)) {
            return this.branches[key];
        }
        const newBranch = new TreeNode<TLeaf>(key);
        this.branches[key] = newBranch;
        return newBranch;
    }

    getOrCreateBranches(...keys: string[]): TreeNode<TLeaf> {
        let current: TreeNode<TLeaf> = this;
        for (const key of keys) {
            current = current.getOrCreateBranch(key);
        }
        return current;
    }

    getLeaf(key: string): TLeaf | undefined {
        return this.leaves[key];
    }

    setLeaf(key: string, leaf: TLeaf): void {
        this.leaves[key] = leaf;
    }

    takeLeaf(key: string): TLeaf | undefined {
        const leaf = this.leaves[key];
        delete this.leaves[key];
        return leaf;
    }

    takeBranch(key: string): TreeNode<TLeaf> | undefined {
        const branch = this.branches[key];
        delete this.branches[key];
        return branch;
    }

    async visitAsync<TContext = undefined>(
        onStartBranch: (branchContext: BranchContext<TContext>) => void | Promise<void>,
        onLeaf: (leafContext: LeafContext<TLeaf, TContext>) => void | Promise<void>,
        onEndBranch: (branchContext: BranchContext<TContext>) => void | Promise<void>,
        parentPath: BranchContext<TContext>[] = [],
        childIndex: number = 0
    ): Promise<void> {
        const branchContext: BranchContext<TContext> = {
            parentPath: parentPath,
            branchKey: this.key,
            childIndex: childIndex,
        };
        await onStartBranch(branchContext);
        const thisPath = parentPath.concat(branchContext);
        let localChildIndex = 0;
        for (const branchKey of Object.keys(this.branches)) {
            await this.branches[branchKey].visitAsync(
                onStartBranch,
                onLeaf,
                onEndBranch,
                thisPath,
                localChildIndex
            );
            localChildIndex++;
        }
        let leafIndex = 0;
        for (const leafKey of Object.keys(this.leaves)) {
            await onLeaf({
                parentPath: thisPath,
                leafKey: leafKey,
                leafIndex: leafIndex,
                childIndex: localChildIndex,
                leaf: this.leaves[leafKey],
            });
            localChildIndex++;
            leafIndex++;
        }
        await onEndBranch(branchContext);
    }

    fixBranchLeafCollisions(context: string, parentPath: string[] = []): void {
        for (const key of Object.keys(this.branches)) {
            const childBranch = this.branches[key];
            if (Object.hasOwn(this.leaves, key)) {
                if (Object.hasOwn(childBranch.leaves, "self")) {
                    const fullPath = parentPath.concat(key).join(".");
                    throw new Error(
                        `[ERROR] collision on "${fullPath}" and "${fullPath}.self" ${context} node`
                    );
                }
                const leaf = this.leaves[key];
                delete this.leaves[key];
                childBranch.leaves.self = leaf;
            }
            childBranch.fixBranchLeafCollisions(context, parentPath.concat(key));
        }
    }

    pruneRootIfSingleBranch(key: string): TreeNode<TLeaf> {
        const keys = Object.keys(this.branches);
        if (
            Object.keys(this.leaves).length === 0 &&
            key !== undefined &&
            keys.length === 1 &&
            keys[0] === key
        ) {
            const branch = this.branches[key];
            return new TreeNode<TLeaf>("", branch.branches, branch.leaves);
        }
        return this;
    }

    async writeToModulesAsync(
        onLeaf: (
            leafContext: LeafContext<TLeaf, IndentedStringWriter>,
            writer: IndentedStringWriter
        ) => void | Promise<void>,
        directory: string,
        onStartBranch?: (
            branchContext: BranchContext<IndentedStringWriter>,
            writer: IndentedStringWriter
        ) => void | Promise<void>,
        onEndBranch?: (
            branchContext: BranchContext<IndentedStringWriter>,
            writer: IndentedStringWriter
        ) => void | Promise<void>
    ): Promise<void> {
        await this.visitAsync<IndentedStringWriter>(
            async (branchContext) => {
                const parentPath = branchContext.parentPath.map((item) => item.branchKey);
                const branchKey = branchContext.branchKey;
                const thisDir = path.join(directory, ...parentPath, branchKey);
                await fsAsync.mkdir(thisDir, { recursive: true });
                branchContext.context = new IndentedStringWriter();
                branchContext.context.writeGeneratedHeaderComment();
                if (branchContext.parentPath.length !== 0) {
                    const parentWriter = branchContext.parentPath[parentPath.length - 1].context;
                    if (parentWriter !== undefined) {
                        if (branchContext.childIndex !== 0) {
                            parentWriter.writeLine();
                        }
                        parentWriter.writeLines(
                            `import * as ${branchKey} from "./${branchKey}/index.js";`,
                            undefined,
                            `export { ${branchKey} };`
                        );
                    }
                }
                if (onStartBranch !== undefined) {
                    await onStartBranch(branchContext, branchContext.context);
                }
            },
            async (leafContext) => {
                const writer = leafContext.parentPath[leafContext.parentPath.length - 1].context;
                if (writer !== undefined) {
                    await onLeaf(leafContext, writer);
                }
            },
            async (branchContext) => {
                const writer = branchContext.context;
                if (writer !== undefined) {
                    if (onEndBranch !== undefined) {
                        await onEndBranch(branchContext, writer);
                    }
                    const parentPath = branchContext.parentPath.map((item) => item.branchKey);
                    const branchKey = branchContext.branchKey;
                    const fullPath = path.join(directory, ...parentPath, branchKey);
                    const indexPath = path.join(fullPath, "./index.ts");
                    await writer.writeFileAsync(indexPath);
                }
            }
        );
    }
}

export const PropagatedKey: unique symbol = Symbol();

export function propagateKey<T>(
    collection: Record<string, T[]>
): (T & { [PropagatedKey]: string })[] {
    return Object.keys(collection).flatMap((key) =>
        collection[key].map((value) => Object.assign({ [PropagatedKey]: key }, value))
    );
}

export interface BranchContext<TContext = undefined> {
    parentPath: BranchContext<TContext>[];
    branchKey: string;
    childIndex: number;
    context?: TContext;
}

export interface LeafContext<TLeaf, TContext = undefined> {
    parentPath: BranchContext<TContext>[];
    leafKey: string;
    leafIndex: number;
    childIndex: number;
    leaf: TLeaf;
}
