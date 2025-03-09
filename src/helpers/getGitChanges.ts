import { getLastCommitInfo, GitChange, GitCommitInfo } from "../utils/git.ts";
import { loadIgnorePatterns, shouldIgnore } from "./ignore.ts";
import path from "path";

interface GitFileChange {
    path: string;
    status: "added" | "modified" | "deleted";
    isIgnored: boolean;
}

/**
 * Obtém as alterações do último commit e filtra arquivos ignorados
 * @param projectPath Caminho do projeto
 * @returns Array de objetos com informações dos arquivos alterados
 */

export async function getGitChanges(
    projectPath: string
): Promise<{ changes: GitFileChange[]; commitInfo: GitCommitInfo }> {
    const commitInfo = await getLastCommitInfo(projectPath);

    // Verifica cada arquivo contra as regras de ignore
    const changesWithIgnoreStatus = await Promise.all(
        commitInfo.changes.map(async (change) => {
            // Carrega padrões de ignore
            const ignorePatterns = await loadIgnorePatterns(projectPath);
            const relativePath = change.path;

            return {
                ...change,
                isIgnored: shouldIgnore(ignorePatterns, relativePath),
            };
        })
    );

    // Remove arquivos deletados e ignorados
    const filteredChanges = changesWithIgnoreStatus.filter((change) => {
        // Não incluir arquivos deletados
        if (change.status === "deleted") {
            return false;
        }

        // Não incluir arquivos ignorados
        if (change.isIgnored) {
            return false;
        }

        // Não incluir arquivos que já têm documentação igual
        // TODO: Futuramente implementar comparação com docs existentes
        return true;
    });

    // Se não houver arquivos válidos para documentar após a filtragem,
    // ainda retorna o commitInfo para mostrar informações do commit
    return {
        changes: filteredChanges,
        commitInfo,
    };
}
