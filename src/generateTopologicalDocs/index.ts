import chalk from "chalk";
import { spinner } from "@clack/prompts";
import { writeFile } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { TreeItemFlatted } from "../types/index.ts";
import { DependencyDetector } from "../dependencyAnalysis/DependencyDetector.ts";
import { projectContext } from "../utils/projectContext.ts";
import { saveDocForFile } from "../helpers/saveDocForFile.ts";
import { getPromptResult } from "../utils/ai.ts";
import { loadIgnorePatterns, shouldIgnore } from "../helpers/ignore.ts";
import {
    printDependencyTree,
    printIndependentFiles,
} from "../dependencyVisualizer";

interface DocumentationCache {
    [path: string]: {
        description: string;
        content: string;
    };
}

export async function generateTopologicalDocs(
    flattedTree: TreeItemFlatted[],
    options?: any
) {
    // Filtrar pastas vazias
    const nonEmptyItems = flattedTree.filter((item) => {
        // Se for arquivo, mantém
        if (item.type === "file") return true;

        // Se for diretório, verifica se tem conteúdo
        if (item.type === "directory") {
            // Verifica se existem arquivos dentro desse diretório
            const hasFilesInside = flattedTree.some(
                (file) =>
                    file.type === "file" &&
                    file.path.startsWith(item.path + "/")
            );
            return hasFilesInside;
        }

        return false;
    });

    // Filtrar arquivos que devem ser ignorados
    const ignorePatterns = await loadIgnorePatterns(
        projectContext.getProjectPath()
    );
    const filesToProcess = nonEmptyItems.filter(
        (file) => !shouldIgnore(ignorePatterns, file.path)
    );

    console.log(
        chalk.blue("\n🔄 Iniciando geração de documentação em ordem topológica")
    );
    console.log(
        chalk.dim("Total de arquivos a processar:"),
        chalk.cyan(filesToProcess.length)
    );
    console.log(
        chalk.dim("Arquivos ignorados/pastas vazias:"),
        chalk.yellow(flattedTree.length - filesToProcess.length)
    );

    const loading = spinner();
    const generation = createGenerationProgressController(
        filesToProcess.map((file) => file.path)
    );
    const cache: DocumentationCache = {};

    // Criar o detector de dependências
    loading.start(chalk.blue("🔍 Analisando dependências entre arquivos..."));
    const detector = new DependencyDetector(projectContext.getProjectPath());

    // Analisar arquivos e criar grafo de dependências
    await detector.analyzeFiles(filesToProcess);
    loading.stop(chalk.green("✅ Análise de dependências concluída"));

    // Obter ordem topológica
    loading.start(chalk.blue("📊 Calculando ordem de processamento..."));
    const topologicalOrder = detector.getTopologicalOrder();
    const dependencyGraph = detector.dependencyGraph;

    // Separar arquivos com e sem dependências
    const filesWithoutDeps = topologicalOrder.filter(
        (file) => !(dependencyGraph.get(file)?.length > 0)
    );
    const filesWithDeps = topologicalOrder.filter(
        (file) => dependencyGraph.get(file)?.length > 0
    );

    loading.stop(
        chalk.green(
            `✅ Ordem de processamento calculada: ${topologicalOrder.length} arquivos (${filesWithoutDeps.length} sem dependências, ${filesWithDeps.length} com dependências)`
        )
    );

    // Substitua o log atual por esta implementação mais detalhada

    // Obter a lista de arquivos que não foram incluídos na análise
    const unprocessedFiles = filesToProcess
        .map((file) => file.path)
        .filter((path) => !topologicalOrder.includes(path));

    // Exibir o número total
    console.log(
        chalk.dim(
            `ℹ️ Nota: ${unprocessedFiles.length} arquivos não puderam ser incluídos na análise de dependências:`
        )
    );

    // Exibir os arquivos em uma lista organizada
    if (unprocessedFiles.length > 0) {
        // Agrupar arquivos por diretório para melhor visualização
        const filesByDir = unprocessedFiles.reduce((acc, file) => {
            const dir = path.dirname(file);
            if (!acc[dir]) acc[dir] = [];
            acc[dir].push(file);
            return acc;
        }, {} as Record<string, string[]>);

        const dirs = Object.keys(filesByDir).sort();

        dirs.forEach((dir, dirIndex) => {
            const isLastDir = dirIndex === dirs.length - 1;
            const dirPrefix = isLastDir ? "  └── " : "  ├── ";

            if (dir === ".") {
                // Arquivos na raiz
                filesByDir[dir].forEach((file, fileIndex) => {
                    const isLastFile = fileIndex === filesByDir[dir].length - 1;
                    const filePrefix = isLastFile ? "     └── " : "     ├── ";
                    console.log(chalk.dim(`${filePrefix}${chalk.cyan(file)}`));
                });
            } else {
                // Diretórios com arquivos
                console.log(chalk.dim(`${dirPrefix}${chalk.yellow(dir)}/`));

                filesByDir[dir].forEach((file, fileIndex) => {
                    const isLastFile = fileIndex === filesByDir[dir].length - 1;
                    const filePrefix = isLastDir ? "     " : "  │  ";
                    const subPrefix = isLastFile ? "└── " : "├── ";
                    console.log(
                        chalk.dim(
                            `${filePrefix}${subPrefix}${chalk.cyan(
                                path.basename(file)
                            )}`
                        )
                    );
                });
            }
        });

        // Adicionar uma mensagem sobre possíveis motivos
        console.log(chalk.dim("\n  Possíveis motivos:"));
        console.log(
            chalk.dim("  - Formato de arquivo não suportado pelo detector")
        );
        console.log(
            chalk.dim(
                "  - Arquivo sem qualquer importação/dependência detectável"
            )
        );
        console.log(
            chalk.dim(
                "  - Arquivo com sintaxe não reconhecida pelos padrões configurados"
            )
        );
    }

    // Criar mapeamento de caminho para item - usar apenas arquivos na ordem topológica
    const pathToItem = new Map<string, TreeItemFlatted>();
    flattedTree.forEach((item) => {
        if (topologicalOrder.includes(item.path)) {
            pathToItem.set(item.path, item);
        }
    });

    // Processar arquivos na ordem topológica
    console.log(chalk.blue("\n📝 Gerando documentação em ordem topológica..."));

    // Primeiro processar arquivos sem dependências
    if (filesWithoutDeps.length > 0) {
        console.log(
            chalk.blue("\n🔹 Processando arquivos SEM dependências...")
        );

        // Visualizar arquivos independentes
        printIndependentFiles(filesWithoutDeps);

        // Processar arquivos sem dependências
        for (const filePath of filesWithoutDeps) {
            const item = pathToItem.get(filePath);
            if (!item) continue;

            await processFile(
                filePath,
                item,
                dependencyGraph,
                cache,
                loading,
                generation,
                flattedTree,
                options
            );
        }

        console.log(
            chalk.green(
                `\n✅ Concluído processamento de ${filesWithoutDeps.length} arquivos sem dependências`
            )
        );
    }

    // Depois processar arquivos com dependências
    if (filesWithDeps.length > 0) {
        console.log(
            chalk.yellow("\n🔸 Agora processando arquivos COM dependências...")
        );

        // Visualizar a árvore de dependências
        printDependencyTree(filesWithDeps, dependencyGraph);

        // Processar arquivos com dependências
        for (const filePath of filesWithDeps) {
            const item = pathToItem.get(filePath);
            if (!item) continue;

            await processFile(
                filePath,
                item,
                dependencyGraph,
                cache,
                loading,
                generation,
                flattedTree,
                options
            );
        }

        console.log(
            chalk.green(
                `\n✅ Concluído processamento de ${filesWithDeps.length} arquivos com dependências`
            )
        );
    }

    console.log(
        chalk.green("\n✨ Documentação gerada com sucesso em ordem topológica!")
    );
}

// Função para gerar documentação com contexto enriquecido
async function generateEnhancedDoc(
    item: TreeItemFlatted,
    tree: TreeItemFlatted[],
    dependencies: { path: string; summary: string }[]
) {
    // Ler conteúdo do arquivo
    let content;
    if (item.type === "file") {
        content = await fs.promises.readFile(item.fullPath, "utf-8");
    }

    // Mostrar dependências sendo utilizadas
    if (dependencies.length > 0) {
        console.log(
            chalk.dim(
                `  ↳ Usando contexto de ${dependencies.length} dependências:`
            )
        );
        for (const dep of dependencies) {
            console.log(chalk.dim(`    • ${chalk.cyan(dep.path)}`));
        }
    }

    // Formatar o prompt CARE com informações mais detalhadas das dependências
    const prompt = formatDetailedCarePrompt(item, tree, content, dependencies);

    // Gerar documentação
    const { text } = await getPromptResult(prompt);
    return text;
}

// Corrigir o erro de aspas na função formatDetailedCarePrompt
function formatDetailedCarePrompt(
    item: TreeItemFlatted,
    tree: TreeItemFlatted[],
    content: string,
    dependencies: { path: string; summary: string }[]
) {
    const context = tree.map((item) => item.path);

    // Formatação das dependências com mais detalhes
    const dependenciesText =
        dependencies.length > 0
            ? dependencies
                  .map((d) => `- **${d.path}**: ${d.summary}`)
                  .join("\n")
            : "Nenhuma dependência identificada.";

    // Adicionar seção de contexto detalhado para cada dependência
    let dependenciesContext = "";
    if (dependencies.length > 0) {
        dependenciesContext = "\n## Contexto das dependências:\n\n";
        for (const dep of dependencies) {
            dependenciesContext += `### ${dep.path}\n${dep.summary}\n\n`; // Corrigido a falta de aspas
        }
    }

    return `
Context (Contexto): 
- Este arquivo é ${item.path} ${getLanguageFromExt(item.path)}
- O arquivo faz parte do projeto ${path.basename(
        projectContext.getProjectPath()
    )}
- Dependências deste arquivo já documentadas:
${dependenciesText}
${dependenciesContext}
- Conteúdo do arquivo:
\`\`\`
${content || "Não disponível (É uma pasta)"}
\`\`\`

Action (Ação): Analise o código fornecido, compreendendo sua função, estrutura e como ele interage com suas dependências. Gere documentação técnica detalhada.

Result (Resultado): Uma documentação técnica em Markdown que sempre comece com "Documentação para: ${
        item.path
    }" seguido por uma seção "Descrição:" que resume brevemente o propósito do arquivo. Depois, explique detalhadamente:
- O propósito e responsabilidade do arquivo
- Estrutura e componentes principais (classes, métodos, funções)
- Como este arquivo utiliza e interage com suas dependências (referenciando-as explicitamente)
- Qualquer padrão de design ou arquitetura relevante

Example (Exemplo):
# Documentação para: src/services/auth.service.ts

## Descrição:
Este arquivo implementa o serviço de autenticação da aplicação, gerenciando operações de login, registro e validação de tokens.

## Dependências
- **user.repository.ts**: Utilizado para consultar e persistir dados de usuário
- **token.service.ts**: Responsável pela geração e validação de tokens JWT

## Estrutura
### Classe AuthService
Principal classe que expõe métodos para login, registro e validação de sessões.

#### Métodos principais
- \`login(credentials)\`: Verifica credenciais e gera token de acesso
- \`register(userData)\`: Cria nova conta de usuário com validações
- \`validateToken(token)\`: Verifica se um token é válido e atual

## Fluxo de autenticação
1. Cliente envia credenciais
2. AuthService valida com UserRepository
3. Token é gerado usando TokenService
4. Token é retornado ao cliente
`;
}

function getLanguageFromExt(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: { [key: string]: string } = {
        ".ts": "escrito em TypeScript",
        ".js": "escrito em JavaScript",
        ".tsx": "escrito em TypeScript React",
        ".jsx": "escrito em JavaScript React",
        ".py": "escrito em Python",
        ".java": "escrito em Java",
        ".cs": "escrito em C#",
        ".php": "escrito em PHP",
        ".rb": "escrito em Ruby",
        ".go": "escrito em Go",
        ".rs": "escrito em Rust",
        ".swift": "escrito em Swift",
        ".kt": "escrito em Kotlin",
        ".c": "escrito em C",
        ".cpp": "escrito em C++",
        ".h": "escrito em C/C++ (header)",
        ".hpp": "escrito em C++ (header)",
    };

    return langMap[ext] || "";
}

function extractDescription(doc: string): string {
    // Extrair a seção "Descrição" do documento
    const match = doc.match(/## Descrição:\s*\n([^\n#]+)/);
    return match ? match[1].trim() : "Sem descrição disponível";
}

interface ErrorDetails {
    file: string;
    error: string;
    timestamp: string;
}

function createGenerationProgressController(processableFiles: string[]) {
    const progress = {
        succeed: [] as TreeItemFlatted[],
        failed: [] as Array<{ item: TreeItemFlatted; details: ErrorDetails }>,
    };

    return {
        failed: (item: TreeItemFlatted, details: ErrorDetails) =>
            progress.failed.push({ item, details }),
        succeed: (item: TreeItemFlatted) => progress.succeed.push(item),
        logProgress: async () => {
            const progressPath = path.join(
                projectContext.getProjectPath(),
                "codocx.progress.json"
            );

            await writeFile(
                progressPath,
                JSON.stringify({
                    total: processableFiles.length, // Usar a contagem correta
                    succeed: progress.succeed.length,
                    failed: progress.failed.length,
                    pending:
                        processableFiles.length -
                        progress.failed.length -
                        progress.succeed.length,

                    data: {
                        failed: progress.failed,
                        succeeded: progress.succeed,
                    },
                })
            );
        },
    };
}

async function processFile(
    filePath: string,
    item: TreeItemFlatted,
    dependencyGraph: Map<string, string[]>,
    cache: DocumentationCache,
    loading: any,
    generation: any,
    flattedTree: TreeItemFlatted[],
    options?: any
) {
    // Verificar se é modo Git e se o arquivo deve ser processado
    if (
        options?.git &&
        options.gitFiles &&
        !options.gitFiles.includes(filePath)
    ) {
        return;
    }

    loading.start(
        `${chalk.blue("🔄")} Gerando documentação para ${chalk.cyan(item.path)}`
    );

    try {
        // Obter dependências deste arquivo diretamente do grafo
        const dependencies = (dependencyGraph.get(item.path) || [])
            .map((dep) => {
                if (cache[dep]) {
                    return {
                        path: dep,
                        summary: cache[dep].description,
                    };
                }
                return null;
            })
            .filter(Boolean) as { path: string; summary: string }[];

        // Mostrar dependências sendo utilizadas
        if (dependencies.length > 0) {
            console.log(
                chalk.dim(
                    `  ↳ Usando contexto de ${dependencies.length} dependências:`
                )
            );
            for (const dep of dependencies) {
                console.log(chalk.dim(`    • ${chalk.cyan(dep.path)}`));
            }
        }

        // Gerar documentação com contexto enriquecido
        const doc = await generateEnhancedDoc(item, flattedTree, dependencies);

        // Salvar documentação
        await saveDocForFile(item.path, doc);

        // Extrair e armazenar descrição para uso em arquivos dependentes
        const description = extractDescription(doc);
        cache[item.path] = {
            description,
            content: doc,
        };

        loading.stop(
            `${chalk.green("✓")} Documentação gerada para ${chalk.cyan(
                item.path
            )}`
        );
        generation.succeed(item);
    } catch (error) {
        let errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorDetails = {
            file: item.path,
            error: errorMessage,
            timestamp: new Date().toISOString(),
        };

        loading.stop(
            `\n${chalk.red("✖")} Erro ao gerar documentação de ${chalk.cyan(
                item.path
            )}:\n` + `${chalk.red("→")} ${errorMessage}\n`
        );
        generation.failed(item, errorDetails);
    }

    await generation.logProgress();
}
