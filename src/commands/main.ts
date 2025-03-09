import path from "path";
import { Command } from "commander";
import chalk from "chalk";

import { getTree } from "../helpers/getTree.ts";
import { generateIntroduction } from "./actions/generateIntroduction.ts";
import { generateDocs } from "./actions/generateDocs.ts";
import { generateGitDocs } from "./actions/generateGitDocs.ts";
import { generateTopologicalDocs } from "../generateTopologicalDocs/index.ts"; // Importar o gerador topológico

import { projectContext } from "../utils/projectContext.ts";
import { providerContext } from "../utils/providerContext.ts";
import { configConnection } from "../helpers/validateConnection.ts";
import { selectProvider } from "../utils/providerSelector.ts";

import { getGitChanges } from "../helpers/getGitChanges.ts"; // Usar a função existente

import * as fs from "fs";

interface CommandOptions {
    Path: string;
    git?: boolean;
}

export async function main(options: CommandOptions, command: Command) {
    // Configura o provider selecionado
    providerContext.setProvider(await selectProvider());

    // Testa a conexão com o provider selecionado
    await configConnection();

    const targetPath = options.Path || path.resolve();
    projectContext.setProjectPath(targetPath);

    console.log(
        chalk.blue("\n📂 Projeto detectado em:"),
        chalk.cyan(targetPath)
    );
    console.log(
        chalk.blue("📄 A documentação será gerada em:"),
        chalk.cyan(path.join(targetPath, "docs"))
    );

    if (options.git) {
        console.log(
            chalk.blue(
                "\n🔍 Modo Git: Documentando apenas alterações do último commit"
            )
        );

        // Obter alterações do git
        const { changes } = await getGitChanges(targetPath);

        if (changes.length === 0) {
            console.log(
                chalk.yellow("Nenhuma alteração encontrada para documentar")
            );
            return;
        }

        // Converter arquivos Git para o formato TreeItem
        const gitFiles = changes.map((change) => ({
            type: "file" as const,
            name: path.basename(change.path),
            path: change.path,
            fullPath: path.join(targetPath, change.path),
        }));

        // Gerar docs com lista de arquivos Git usando ordem topológica
        await generateTopologicalDocs(gitFiles, {
            git: true,
            gitFiles: changes.map((c) => c.path),
        });
    } else {
        console.log(
            chalk.blue("\n🔄 Modo Padrão: Documentando todo o projeto")
        );
        const { flattedTree } = await getTree(targetPath);
        await generateIntroduction(flattedTree);

        // Usar a geração topológica por padrão
        await generateTopologicalDocs(flattedTree);
    }
}

export const initCommands = (program: Command) => {
    // ... outros comandos existentes ...

    program
        .command("document")
        .description(
            "Gera documentação para todo o projeto ou arquivos específicos"
        )
        .option(
            "-p, --path <path>",
            "Caminho do projeto para gerar documentação",
            process.cwd()
        )
        .option(
            "-g, --git",
            "Gera documentação apenas para arquivos alterados no último commit"
        )
        .option(
            "--no-dependency-order",
            "Desativa a geração baseada na ordem de dependências"
        )
        .option(
            "-v, --verbose",
            "Exibe informações detalhadas durante o processo",
            false
        )
        .action(async (options) => {
            try {
                console.log(chalk.blue("Codocx - Gerando documentação"));

                const targetPath = options.path || process.cwd();
                projectContext.setProjectPath(targetPath);

                // Sempre configurar o provedor e testar a conexão
                providerContext.setProvider(await selectProvider());
                await configConnection();

                if (options.dependencyOrder === false) {
                    console.log(
                        chalk.yellow(
                            "Desativada a ordenação baseada em dependências"
                        )
                    );
                    // Fluxo original sem análise de dependências
                    if (options.git) {
                        await generateGitDocs();
                    } else {
                        const { flattedTree } = await getTree(targetPath);
                        await generateIntroduction(flattedTree);
                        await generateDocs(flattedTree);
                    }
                } else {
                    // Novo fluxo padrão com análise de dependências
                    console.log(
                        chalk.blue(
                            "Utilizando análise de dependências para ordenação"
                        )
                    );

                    if (options.git) {
                        // Modo Git com ordem topológica
                        const { changes } = await getGitChanges(targetPath);

                        if (changes.length === 0) {
                            console.log(
                                chalk.yellow(
                                    "Nenhuma alteração encontrada para documentar"
                                )
                            );
                            return;
                        }

                        // Converter arquivos Git para o formato TreeItem
                        const gitFiles = changes.map((change) => ({
                            type: "file" as const,
                            name: path.basename(change.path),
                            path: change.path,
                            fullPath: path.join(targetPath, change.path),
                        }));

                        // Gerar docs com lista de arquivos Git
                        await generateTopologicalDocs(gitFiles, {
                            git: true,
                            gitFiles: changes.map((c) => c.path),
                        });
                    } else {
                        // Modo regular com ordem topológica
                        const { flattedTree } = await getTree(targetPath);
                        await generateIntroduction(flattedTree);
                        await generateTopologicalDocs(flattedTree);
                    }
                }

                console.log(chalk.green("✓ Documentação gerada com sucesso!"));
            } catch (error) {
                console.error(
                    chalk.red("✗ Erro ao gerar documentação:"),
                    error
                );
                process.exit(1);
            }
        });
};

// Remover a função documentWithDependencyAnalysis e funções auxiliares,
// já que agora usamos generateTopologicalDocs diretamente
