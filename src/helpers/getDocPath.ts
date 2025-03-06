import path from "path";
import { projectContext } from "../utils/projectContext.ts";

export function getDocPath(filePath: string) {
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath)) + ".md";

    const outputDir = path.join(
        projectContext.getProjectPath(),
        "docs",
        "code",
        fileDir
    );

    return {
        path: path.join(outputDir, fileName),
        outputDir,
        fileDir,
        fileName,
    };
}
