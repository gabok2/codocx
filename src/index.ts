#! /usr/bin/env node

import { Command } from "commander";

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf8")
);
import { withErrorCatcher } from "./middlewares/errorCatcher.ts";
import { main } from "./commands/main.ts";

const program = new Command();

program
    .version(pkg.version, "-v, --version", "Exibir a versão atual da CLI")
    .name("codocx")
    .option("-p, ---path <path>", "Caminho do projeto")
    .option(
        "-g, --git",
        "Gerar documentação apenas para arquivos alterados no último commit"
    )
    .action(withErrorCatcher(main));

program.parse(process.argv);
