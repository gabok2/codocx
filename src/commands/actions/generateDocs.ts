import chalk from "chalk";
import { spinner } from "@clack/prompts";
import { writeFile } from "fs/promises";
import path from "path";

import { TreeItemFlatted } from "../../types/index.ts";
import { generateDoc } from "../../helpers/generateDoc.ts";
import { saveDocForFile } from "../../helpers/saveDocForFile.ts";
import { projectContext } from "../../utils/projectContext.ts";

export async function generateDocs(flattedTree: TreeItemFlatted[]) {
    const loading = spinner();
    const generation = createGenerationProgressController(flattedTree);

    console.log(chalk.blue("\n📋 Iniciando geração de documentação"));
    console.log(
        chalk.dim("Total de arquivos:"),
        chalk.cyan(flattedTree.length)
    );
    console.log(chalk.dim("Arquivos ignorados:"), chalk.yellow("9"));
    console.log("\n" + "─".repeat(50) + "\n");

    for (const item of flattedTree) {
        loading.start(
            `${chalk.blue("🔄")} Gerando documentação para ${chalk.cyan(
                item.path
            )}`
        );

        try {
            const doc = await generateDoc(item, flattedTree);
            await saveDocForFile(item.path, doc);

            loading.stop(
                `${chalk.green("✓")} Documentação gerada para ${chalk.cyan(
                    item.path
                )}`
            );
            generation.succeed(item);
        } catch (error) {
            let errorMessage =
                error instanceof Error ? error.message : String(error);
            const errorDetails = {
                file: item.path,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            };

            loading.stop(
                `\n${chalk.red("✖")} Erro ao gerar documentação de ${chalk.cyan(
                    item.path
                )}:\n` + `${chalk.red("→")} ${errorMessage}\n`
            );
            generation.failed(item, errorDetails);
        }

        await generation.logProgress();
    }
}

interface ErrorDetails {
    file: string;
    error: string;
    timestamp: string;
}

function createGenerationProgressController(flattedTree: TreeItemFlatted[]) {
    const progress = {
        succeed: [] as TreeItemFlatted[],
        failed: [] as Array<{ item: TreeItemFlatted; details: ErrorDetails }>,
    };

    return {
        failed: (item: TreeItemFlatted, details: ErrorDetails) =>
            progress.failed.push({ item, details }),
        succeed: (item: TreeItemFlatted) => progress.succeed.push(item),
        // Versão corrigida (usando o caminho do projeto)
        logProgress: async () => {
            const progressPath = path.join(
                projectContext.getProjectPath(),
                "codocx.progress.json"
            );

            await writeFile(
                progressPath,
                JSON.stringify(
                    {
                        total: flattedTree.length,
                        succeed: progress.succeed.length,
                        failed: progress.failed.length,
                        pending:
                            flattedTree.length -
                            progress.failed.length -
                            progress.succeed.length,

                        data: {
                            failed: progress.failed,
                            succeeded: progress.succeed,
                        },
                    },
                    null,
                    4
                )
            );
        },
    };
}
