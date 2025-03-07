import path from "path";
import fs from "fs";
import chalk from "chalk";
import { projectContext } from "../utils/projectContext.ts";

export async function saveDocForFile(
    filePath: string,
    content: string | undefined
) {
    if (!content) {
        throw new Error("Conteúdo vazio ou indefinido");
    }

    const { outputDir, fileName } = getDocPath(filePath);
    content = content.trim();

    if (!fs.existsSync(outputDir)) {
        console.log(
            chalk.dim("📁 Criando estrutura em:"),
            chalk.gray(
                path.relative(projectContext.getProjectPath(), outputDir)
            )
        );
        await fs.promises.mkdir(outputDir, { recursive: true });
    }

    if (content.startsWith("```") && content.endsWith("```")) {
        content = content.slice(3, -3);
    }

    const targetPath = path.join(outputDir, fileName);
    await fs.promises.writeFile(targetPath, content, "utf8");

    console.log(
        chalk.dim("💾 Arquivo salvo em:"),
        chalk.gray(path.relative(projectContext.getProjectPath(), targetPath))
    );

    return { path: targetPath };
}

function getDocPath(filePath: string) {
    // Garante que o caminho é relativo
    const relativePath = path.isAbsolute(filePath)
        ? path.relative(projectContext.getProjectPath(), filePath)
        : filePath;

    const fileDir = path.dirname(relativePath);
    const fileName =
        path.basename(relativePath, path.extname(relativePath)) + ".md";

    const outputDir = path.join(
        projectContext.getProjectPath(),
        "docs",
        "code",
        fileDir
    );

    const docPath = path.join(outputDir, fileName);

    return {
        path: docPath,
        outputDir,
        fileDir,
        fileName,
    };
}
