import path from "path";
import { Command } from "commander";
import chalk from "chalk";

import { getTree } from "../helpers/getTree.ts";
import { generateIntroduction } from "./actions/generateIntroduction.ts";
import { generateDocs } from "./actions/generateDocs.ts";

import { projectContext } from "../utils/projectContext.ts";
import { providerContext } from "../utils/providerContext.ts";
import { configConnection } from "../helpers/validateConnection.ts";
import { selectProvider } from "../utils/providerSelector.ts";

interface CommandOptions {
    Path: string;
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

    const { flattedTree } = await getTree(targetPath);

    await generateIntroduction(flattedTree);
    await generateDocs(flattedTree);
}
