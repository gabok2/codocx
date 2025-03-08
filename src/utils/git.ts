import { exec } from "./exec.ts";

export interface GitChange {
    path: string;
    status: "added" | "modified" | "deleted";
}

export interface GitCommitInfo {
    hash: string;
    message: string;
    branch: string;
    changes: GitChange[];
}

/**
 * Verifica se o diretório é um repositório git válido
 */
async function validateGitRepo(projectPath: string): Promise<void> {
    try {
        const { error } = await exec(
            `git --git-dir="${projectPath}/.git" rev-parse --is-inside-work-tree`
        );
        if (error) {
            throw new Error(
                `O diretório '${projectPath}' não é um repositório git válido.`
            );
        }

        const { stdout: hasCommits } = await exec(
            `git --git-dir="${projectPath}/.git" rev-list -n 1 --all`
        );
        if (!hasCommits.trim()) {
            throw new Error(`O repositório não possui nenhum commit.`);
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Erro ao validar repositório git: ${error}`);
    }
}

/**
 * Normaliza um caminho para o formato usado pelo git (forward slashes)
 * @param filePath Caminho do arquivo
 * @returns Caminho normalizado
 */
function normalizeGitPath(filePath: string): string {
    // Converte para forward slashes e remove possíveis './' no início
    return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Obtém o conteúdo de um arquivo específico em um commit
 * @param projectPath Caminho do projeto
 * @param filePath Caminho do arquivo no repositório (relativo à raiz do repositório)
 * @param commitHash Hash do commit
 * @returns Conteúdo do arquivo no commit especificado
 */
export async function getFileContent(
    projectPath: string,
    filePath: string,
    commitHash: string
): Promise<string> {
    const normalizedPath = normalizeGitPath(filePath);
    try {
        // Primeiro verifica se o arquivo existe no commit
        console.log("📄 Verificando arquivo no commit:", normalizedPath);
        const { error } = await exec(
            `git -C "${projectPath}" cat-file -e ${commitHash}:${normalizedPath}`
        );

        if (error) {
            throw new Error(
                `Arquivo '${normalizedPath}' não existe no commit ${commitHash}`
            );
        }

        // Se existe, pega o conteúdo completo
        const { stdout: content } = await exec(
            `git -C "${projectPath}" show ${commitHash}:${normalizedPath}`
        );

        return content;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("Not a valid object name")) {
            throw new Error(`Hash do commit inválido: ${commitHash}`);
        }
        throw error;
    }
}

/**
 * Obtém informações detalhadas do último commit de qualquer branch
 * @param projectPath Caminho do projeto
 * @returns Promise com informações do commit e arquivos alterados
 */
export async function getLastCommitInfo(
    projectPath: string
): Promise<GitCommitInfo> {
    await validateGitRepo(projectPath);

    // Obtém o hash do último commit (de qualquer branch)
    const hashCommand = `git -C "${projectPath}" log -n 1 --all --format=%H`;
    const { stdout: hash } = await exec(hashCommand);

    if (!hash) {
        throw new Error("Não foi possível encontrar o último commit");
    }

    // Obtém informações do commit e alterações
    const infoCommand = `git -C "${projectPath}" log -1 --format="%H%n%s%n%D" ${hash.trim()}`;
    const changesCommand = `git -C "${projectPath}" diff-tree -r -m --name-status ${hash.trim()}`;

    const { stdout: infoOutput } = await exec(infoCommand);
    const { stdout: changesOutput, stderr } = await exec(changesCommand);

    if (stderr) {
        console.log("Git stderr:", stderr);
    }

    // Processa informações do commit
    const [commitHash, commitMessage, refs = ""] = infoOutput.split("\n");

    // Processa as alterações
    const changes = changesOutput
        .split("\n")
        .filter((line) => line.trim() && line.includes("\t"))
        .map((line) => {
            const [status, path] = line.split("\t");
            return {
                path,
                status: parseGitStatus(status.trim()),
            };
        });

    // Extrai o nome da branch das referências
    const branch =
        refs
            .split(",")
            .map((ref) => ref.trim())
            .find((ref) => ref.includes("HEAD -> ") || ref.startsWith("* "))
            ?.replace(/^HEAD -> /, "")
            ?.replace(/^\* /, "") || "unknown";

    return {
        hash: commitHash ? commitHash.trim() : hash.trim(),
        message: commitMessage ? commitMessage.trim() : "",
        branch: branch.trim(),
        changes,
    };
}

/**
 * Converte o status do git para um formato mais amigável
 * @param status Status retornado pelo git (pode ser um ou mais caracteres)
 * @returns Status normalizado (added/modified/deleted)
 * @private Função interna auxiliar
 */
function parseGitStatus(status: string): GitChange["status"] {
    // Para casos onde temos dois caracteres (ex: MM, AM), pegamos apenas o primeiro
    const firstStatus = status.charAt(0);

    switch (firstStatus) {
        case "A":
            return "added";
        case "M":
            return "modified";
        case "D":
            return "deleted";
        default:
            throw new Error(
                `Status git desconhecido: ${status} (primeiro caractere: ${firstStatus})`
            );
    }
}
