import path from "path";
import { Command } from "commander";
import chalk from "chalk";

import { getTree } from "../helpers/getTree.ts";
import { generateIntroduction } from "./actions/generateIntroduction.ts";
import { generateDocs } from "./actions/generateDocs.ts";
import { generateGitDocs } from "./actions/generateGitDocs.ts";

import { projectContext } from "../utils/projectContext.ts";
import { providerContext } from "../utils/providerContext.ts";
import { configConnection } from "../helpers/validateConnection.ts";
import { selectProvider } from "../utils/providerSelector.ts";

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
        await generateGitDocs();
    } else {
        console.log(
            chalk.blue("\n🔄 Modo Padrão: Documentando todo o projeto")
        );
        const { flattedTree } = await getTree(targetPath);
        await generateIntroduction(flattedTree);
        await generateDocs(flattedTree);
    }
}
