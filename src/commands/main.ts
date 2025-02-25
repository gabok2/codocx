import path from "path";
import { Command } from "commander";
import chalk from "chalk";

import { getTree } from "../helpers/getTree.ts";
import { generateIntroduction } from "./actions/generateIntroduction.ts";
import { generateDocs } from "./actions/generateDocs.ts";

import { projectContext } from "../utils/projectContext.ts";
import { configOllamaConnection } from "../helpers/validateOllamaConnection.ts";

interface CommandOptions {
    Path: string;
}

export async function main(options: CommandOptions, command: Command) {
    await configOllamaConnection();

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
