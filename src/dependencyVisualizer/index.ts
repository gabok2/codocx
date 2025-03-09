import chalk from "chalk";
import * as path from "path";
import {
    classifyDependency,
    formatDependencyType,
} from "../dependencyAnalysis/DependencyClassifier";

/**
 * Exibe uma árvore de dependências organizada por tipo
 */
export function printDependencyTree(
    filesWithDeps: string[],
    dependencyGraph: Map<string, string[]>
) {
    console.log(chalk.dim("\nÁrvore de dependências:"));

    filesWithDeps.forEach((filePath, index) => {
        const isLast = index === filesWithDeps.length - 1;
        const prefix = isLast ? "└── " : "├── ";
        const deps = dependencyGraph.get(filePath) || [];

        console.log(`${chalk.dim(prefix)}${chalk.yellow(filePath)}`);

        // Agrupar dependências por tipo
        const groupedDeps = deps.reduce((acc, dep) => {
            const type = classifyDependency(dep, filePath);
            if (!acc[type]) acc[type] = [];
            acc[type].push(dep);
            return acc;
        }, {} as Record<string, string[]>);

        // Mostrar dependências agrupadas por tipo
        let typeIndex = 0;
        const typeCount = Object.keys(groupedDeps).length;

        for (const [type, typeDeps] of Object.entries(groupedDeps)) {
            const isLastType = typeIndex === typeCount - 1;
            const typePrefix = isLast ? "    " : "│   ";

            console.log(
                `${chalk.dim(typePrefix)}${formatDependencyType(type as any)}`
            );

            typeDeps.forEach((dep, depIndex) => {
                const depIsLast =
                    depIndex === typeDeps.length - 1 && isLastType;
                const depPrefix = isLast ? "    " : "│   ";
                const subPrefix = depIsLast ? "    └── " : "    ├── ";

                console.log(
                    `${chalk.dim(depPrefix + subPrefix)}${chalk.cyan(dep)}`
                );
            });

            typeIndex++;
        }
    });
    console.log(); // Linha em branco para separação
}

/**
 * Exibe uma lista simples de arquivos sem dependências
 */
export function printIndependentFiles(filesWithoutDeps: string[]) {
    console.log(chalk.dim("\nArquivos independentes:"));

    // Organizar por diretório
    const filesByDir = filesWithoutDeps.reduce((acc, file) => {
        const dir = path.dirname(file);
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(file);
        return acc;
    }, {} as Record<string, string[]>);

    const dirs = Object.keys(filesByDir).sort();

    dirs.forEach((dir, dirIndex) => {
        const isLastDir = dirIndex === dirs.length - 1;
        const dirPrefix = isLastDir ? "└── " : "├── ";

        if (dir === ".") {
            // Arquivos na raiz
            filesByDir[dir].forEach((file, fileIndex) => {
                const isLastFile = fileIndex === filesByDir[dir].length - 1;
                const filePrefix = isLastFile ? "└── " : "├── ";
                console.log(`${chalk.dim(filePrefix)}${chalk.cyan(file)}`);
            });
        } else {
            // Diretórios com arquivos
            console.log(`${chalk.dim(dirPrefix)}${chalk.yellow(dir)}/`);

            filesByDir[dir].forEach((file, fileIndex) => {
                const isLastFile = fileIndex === filesByDir[dir].length - 1;
                const filePrefix = isLastDir ? "    " : "│   ";
                const subPrefix = isLastFile ? "└── " : "├── ";
                console.log(
                    `${chalk.dim(filePrefix + subPrefix)}${chalk.cyan(
                        path.basename(file)
                    )}`
                );
            });
        }
    });

    console.log(); // Linha em branco para separação
}
