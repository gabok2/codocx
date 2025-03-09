import path from "path";
import chalk from "chalk";
import { log, spinner } from "@clack/prompts";
import { readdir, stat } from "fs/promises";

import { TreeItem } from "../types/index.ts";
import { loadIgnorePatterns, shouldIgnore } from "./ignore.ts";
import { flattenTree } from "./flattenTree.ts";

export async function getTree(dirPath: string) {
    const loading = spinner();

    loading.start(
        `Analisando a árvore de arquivos e diretórios de ${chalk.cyan(dirPath)}`
    );

    const ignorePatterns = await loadIgnorePatterns(dirPath);
    const { tree, ignored } = await getTreeFromDirPath(ignorePatterns, dirPath);

    const flattedTree = flattenTree(tree);

    loading.stop(`Analise concluída de ${chalk.cyan(dirPath)}`);

    // Estatísticas gerais
    log.message(
        `${chalk.cyan(
            flattedTree.length
        )} arquivos/diretórios encontrados\n${chalk.red(
            ignored.length
        )} arquivos/diretórios ignorados\n${chalk.green(
            flattedTree.length - ignored.length
        )} documentos que vão ser gerados`
    );

    // Estrutura do projeto em árvore
    log.message("\n📂 Estrutura do projeto:");

    const printTree = (items: TreeItem[], prefix = "", isLastChild = true) => {
        items.forEach((item, index) => {
            const isLast = index === items.length - 1;
            const icon = item.type === "directory" ? "📁" : "📄";
            const itemColor =
                item.type === "directory" ? chalk.blue : chalk.cyan;
            const marker = isLast ? "└── " : "├── ";
            const line = `${prefix}${marker}${icon} ${itemColor(item.name)}`;

            log.message(line);

            if (item.type === "directory" && item.children?.length) {
                const newPrefix = prefix + (isLast ? "    " : "│   ");
                printTree(item.children, newPrefix, isLast);
            }
        });
    };

    printTree(tree);

    // Lista de arquivos ignorados
    if (ignored.length > 0) {
        log.message("\n❌ Arquivos ignorados:");
        ignored.forEach((ignoredPath) => {
            log.message(`  ${chalk.red(ignoredPath)}`);
        });
    }

    log.message("\n");
    return { items: tree, flattedTree };
}

async function getTreeFromDirPath(
    ignorePatterns: string[],
    dirPath: string,
    currentPath = ""
) {
    let tree: TreeItem[] = [];
    let ignored = [];

    const list = await readdir(dirPath);

    const promises = list.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const relativePath = path.join(currentPath, file);
        const stats = await stat(filePath);

        const isIgnored = shouldIgnore(ignorePatterns, relativePath);
        const isDirectory = stats.isDirectory();

        if (isIgnored) return ignored.push(relativePath);

        const item: TreeItem = {
            type: isDirectory ? "directory" : "file",
            name: file,
            path: relativePath,
            fullPath: path.resolve(filePath),
            children: isDirectory
                ? (
                      await getTreeFromDirPath(
                          ignorePatterns,
                          filePath,
                          relativePath
                      )
                  ).tree
                : undefined,
        };

        tree.push(item);
    });

    await Promise.all(promises);

    return { tree, ignored };
}
