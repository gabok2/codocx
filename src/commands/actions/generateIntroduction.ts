import fs from "fs";
import chalk from "chalk";
import { spinner } from "@clack/prompts";

import { TreeItemFlatted } from "../../types/index.ts";
import {
    ASK_FOR_METADATA_PROMPT,
    SYSTEM_PROMPT,
    TREE_CONTEXT_PROMPT,
} from "../../constants/index.ts";
import { createPromptAbility } from "../../utils/ollama.ts";
import { saveDocForFile } from "../../helpers/saveDocForFile.ts";

export async function generateIntroduction(itemsList: TreeItemFlatted[]) {
    const context = itemsList.map((item) => item.path);

    const loading = spinner();

    try {
        loading.start(
            `${chalk.blue("📝")} Preparando geração da introdução...`
        );

        const packageJson = itemsList.find((i) => i.name === "package.json");
        const readme = itemsList.find(
            (i) => i.name.toLowerCase() === "readme.md"
        );

        loading.stop(`${chalk.dim("📚")} Analisando arquivos do projeto...`);
        loading.start(`${chalk.dim("→")} Lendo package.json...`);

        const packageJsonContent = packageJson
            ? await fs.promises.readFile(packageJson?.fullPath, "utf-8")
            : "not found";

        loading.stop(`${chalk.green("✓")} package.json carregado`);
        loading.start(`${chalk.dim("→")} Lendo README.md...`);

        const readmeContent = readme
            ? await fs.promises.readFile(readme?.fullPath, "utf-8")
            : "not found";

        loading.stop(`${chalk.green("✓")} README.md carregado`);
        loading.start(`${chalk.blue("🤖")} Gerando introdução com Ollama...`);

        console.log(chalk.dim("\nPreparando prompt com:"));
        console.log(chalk.dim("- Estrutura do projeto"));
        console.log(chalk.dim("- Conteúdo do package.json"));
        console.log(chalk.dim("- Conteúdo do README.md"));

        const prompt = [
            "Baseado na estrutura de pastas/arquivos fornecida, gere uma introdução geral sobre em formato Markdown.",
            "A introdução deve conter toda a parte de visão geral do projeto, sobre o que o projeto se trata, como rodar o projeto, requisitos, e etc",
            ASK_FOR_METADATA_PROMPT,
            TREE_CONTEXT_PROMPT.replace("{{JSON}}", JSON.stringify(context)),
            `package.json: \`\`\`${packageJsonContent}\`\`\``,
            `README: \`\`\`${readmeContent}\`\`\``,
            "Introdução (Não é necessário envolver a resposta com crases '```'):",
        ].join("\n");

        const { text } = await createPromptAbility(SYSTEM_PROMPT).getResult(
            prompt
        );

        if (!text) {
            throw new Error("Resposta vazia ao gerar introdução");
        }

        loading.stop(`${chalk.green("✓")} Introdução gerada com sucesso`);
        loading.start(`${chalk.dim("💾")} Salvando documentação...`);

        const { path } = await saveDocForFile("introduction", text);

        loading.stop(
            `${chalk.green("✨")} Introdução finalizada e salva em ${chalk.cyan(
                path
            )}`
        );
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        loading.stop(
            `\n${chalk.red("✖")} Erro ao gerar introdução da documentação:\n` +
                `${chalk.red("→")} ${errorMessage}\n`
        );
        throw error; // Re-throw para ser tratado pelo errorCatcher
    }
}
