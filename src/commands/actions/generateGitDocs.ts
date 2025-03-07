import { projectContext } from "../../utils/projectContext.ts";
import { TreeItemFlatted } from "../../types/index.ts";
import path from "path";
import { getGitChanges } from "../../helpers/getGitChanges.ts";
import { generateDoc } from "../../helpers/generateDoc.ts";
import { saveDocForFile } from "../../helpers/saveDocForFile.ts";
import { getFileContent } from "../../utils/git.ts";
import chalk from "chalk";

/**
 * Gera documentação apenas para os arquivos alterados no último commit
 */
export async function generateGitDocs() {
    const projectPath = projectContext.getProjectPath();

    let gitInfo;
    try {
        gitInfo = await getGitChanges(projectPath);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.log(chalk.red("\n❌ Erro ao acessar informações do Git:"));
        console.log(chalk.dim("└── Erro:"), chalk.red(errorMessage));
        return;
    }

    const { changes: changedFiles, commitInfo } = gitInfo;

    const shortHash = commitInfo.hash.substring(0, 7);
    const hasChanges = commitInfo.changes.length > 0;

    if (!hasChanges) {
        console.log(chalk.yellow("\n⚠️ Não foram encontradas alterações"));
        console.log(chalk.cyan(`Hash do commit: ${shortHash}`));
        return;
    }

    const stats = {
        total: commitInfo.changes.length,
        ignored: commitInfo.changes.filter((c) =>
            changedFiles.every((f) => f.path !== c.path)
        ).length,
        deleted: commitInfo.changes.filter((c) => c.status === "deleted")
            .length,
        toDocument: changedFiles.length,
    };

    console.log(chalk.blue("\n📦 Commit"), chalk.dim(`(${shortHash})`));
    console.log(chalk.dim("└──"), chalk.cyan(commitInfo.message));

    console.log(chalk.blue("\n📊 Estatísticas:"));
    console.log(chalk.dim("├── Total:"), chalk.cyan(stats.total));
    console.log(chalk.dim("├── Ignorados:"), chalk.yellow(stats.ignored));
    console.log(chalk.dim("├── Deletados:"), chalk.red(stats.deleted));
    console.log(
        chalk.dim("└── Para documentar:"),
        chalk.green(stats.toDocument)
    );

    if (stats.toDocument === 0) {
        return;
    }

    console.log(chalk.blue("\n📝 Alterações:"));
    changedFiles.forEach((file, index, array) => {
        const isLast = index === array.length - 1;
        const prefix = isLast ? "└──" : "├──";
        const statusColor =
            file.status === "added" ? chalk.green : chalk.yellow;
        console.log(
            chalk.dim(prefix),
            statusColor(`[${file.status}]`),
            chalk.cyan(file.path)
        );
    });

    console.log(chalk.blue("\n🔄 Processando arquivos..."));

    for (const file of changedFiles) {
        try {
            // Pega o conteúdo do arquivo diretamente do commit
            const fileContent = await getFileContent(
                projectPath,
                file.path,
                commitInfo.hash
            );

            // Prepara o item para geração de documentação
            const item: TreeItemFlatted = {
                type: "file" as const,
                path: file.path,
                fullPath: path.join(projectPath, file.path),
                name: path.basename(file.path),
            };

            // Gera documentação com o conteúdo do arquivo do commit
            const doc = await generateDoc(item, [item], fileContent);

            // Salva a documentação
            await saveDocForFile(path.join(projectPath, file.path), doc);

            console.log(
                chalk.green(`✅ Documentação atualizada: ${file.path}`)
            );
        } catch (error) {
            let errorMessage =
                error instanceof Error ? error.message : String(error);

            if (errorMessage.includes("ENOENT")) {
                errorMessage =
                    "Arquivo não encontrado ou sem permissão de acesso";
            } else if (errorMessage.includes("EACCES")) {
                errorMessage = "Sem permissão para acessar o arquivo";
            } else if (errorMessage.includes("does not exist in")) {
                errorMessage = "Arquivo não encontrado no commit";
            }

            console.log(chalk.red("\n❌ Erro ao gerar documentação:"));
            console.log(chalk.dim("├── Arquivo:"), chalk.yellow(file.path));
            console.log(
                chalk.dim("├── Tipo:"),
                chalk.red(
                    error instanceof Error ? error.name : "Erro Desconhecido"
                )
            );
            console.log(chalk.dim("└── Detalhes:"), chalk.red(errorMessage));
        }
    }

    console.log(
        chalk.green(
            "\n✨ Documentação dos arquivos alterados atualizada com sucesso!"
        )
    );
}
