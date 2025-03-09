import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { TreeItemFlatted } from "../types/index.ts";
import { loadIgnorePatterns, shouldIgnore } from "../helpers/ignore.ts";

import { loadLanguagePatterns } from "../loadLanguagePatterns/loadLanguagePatterns.ts";
import { UniversalAnalyzer } from "../universalAnalyzer/UniversalAnalyzer.ts";

export interface DependencyAnalyzer {
    canProcess(filePath: string): boolean;
    analyzeDependencies(filePath: string, content: string): string[];
}

export class DependencyDetector {
    private analyzers: DependencyAnalyzer[] = [];
    private _dependencyGraph: Map<string, string[]> = new Map();
    private projectRoot: string;
    private _notFoundPaths = new Set<string>();

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
        console.log(chalk.blue("🔍 Inicializando detector de dependências"));
        this.loadAnalyzers();
    }

    registerAnalyzer(analyzer: DependencyAnalyzer): void {
        this.analyzers.push(analyzer);
    }

    // Adicione este getter para expor o grafo de dependências
    get dependencyGraph(): Map<string, string[]> {
        return this._dependencyGraph;
    }

    async analyzeFiles(
        files: TreeItemFlatted[]
    ): Promise<Map<string, string[]>> {
        console.log(
            chalk.blue(
                `\n📊 Analisando dependências entre ${chalk.cyan(
                    files.length
                )} arquivos`
            )
        );

        // Obter padrões de ignorar usando o caminho do projeto
        const ignorePatterns = await loadIgnorePatterns(this.projectRoot);

        // Filtrar arquivos que devem ser ignorados
        const filesToProcess = files.filter(
            (file) => !shouldIgnore(ignorePatterns, file.path)
        );

        console.log(
            chalk.dim(
                `🔍 Ignorados ${files.length - filesToProcess.length} arquivos`
            )
        );

        // Carregar analisadores
        await this.loadAnalyzers();

        for (const file of filesToProcess) {
            try {
                // Analisa o conteúdo do arquivo
                const content = fs.readFileSync(file.fullPath, "utf-8");
                const analyzer = this.getAnalyzerForFile(file.path);

                if (analyzer) {
                    const deps = analyzer.analyzeDependencies(
                        file.path,
                        content
                    );
                    const normalizedDeps = deps
                        .map((dep) => this.normalizeDepPath(file.path, dep))
                        .filter((dep) =>
                            this.fileExistsInList(dep, filesToProcess)
                        );

                    this._dependencyGraph.set(file.path, normalizedDeps);
                }
            } catch (error) {
                console.warn(
                    chalk.yellow(
                        `⚠️ Aviso: Erro ao analisar dependências de ${file.path}`
                    )
                );
            }
        }

        // Modo debug: Log de todas as dependências detectadas
        console.log("\n===== DEBUG: DEPENDÊNCIAS DETECTADAS =====");
        for (const [file, deps] of this._dependencyGraph.entries()) {
            if (deps.length > 0) {
                console.log(`\n${chalk.yellow(file)}:`);
                for (const dep of deps) {
                    console.log(`  ${chalk.cyan(dep)}`);
                }
            }
        }
        console.log("\n=======================================");

        // Log de caminhos que tentamos resolver mas não foram encontrados
        if (this._notFoundPaths.size > 0) {
            console.log("\n⚠️  CAMINHOS NÃO ENCONTRADOS:");
            Array.from(this._notFoundPaths).forEach((path) => {
                console.log(`  ${chalk.red(path)}`);
            });
            console.log("");
        }

        return this._dependencyGraph;
    }

    async analyzeFile(filePath: string): Promise<string[]> {
        try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const analyzer = this.getAnalyzerForFile(filePath);

            if (analyzer) {
                return analyzer.analyzeDependencies(filePath, content);
            }

            return [];
        } catch (error) {
            console.error(
                chalk.red(`Erro ao analisar ${path.basename(filePath)}:`),
                error
            );
            return [];
        }
    }

    getTopologicalOrder(): string[] {
        console.log(chalk.blue("📊 Calculando ordem topológica..."));
        const visited = new Set<string>();
        const temp = new Set<string>();
        const order: string[] = [];

        const visit = (node: string) => {
            if (temp.has(node)) {
                console.warn(
                    chalk.yellow(
                        `Aviso: Dependência circular detectada envolvendo ${node}`
                    )
                );
                return;
            }

            if (!visited.has(node)) {
                temp.add(node);

                const dependencies = this._dependencyGraph.get(node) || [];
                for (const dep of dependencies) {
                    visit(dep);
                }

                temp.delete(node);
                visited.add(node);
                order.push(node);
            }
        };

        for (const node of this._dependencyGraph.keys()) {
            if (!visited.has(node)) {
                visit(node);
            }
        }

        // ADICIONAR esta filtragem para contagens consistentes
        const validFiles = order.filter((file) =>
            Array.from(this._dependencyGraph.keys()).includes(file)
        );

        // MODIFICAR esta linha para usar validFiles.length
        console.log(
            chalk.green(
                `✅ Ordem topológica calculada: ${validFiles.length} arquivos`
            )
        );

        return validFiles;
    }

    private getAnalyzerForFile(
        filePath: string
    ): DependencyAnalyzer | undefined {
        return this.analyzers.find((analyzer) => analyzer.canProcess(filePath));
    }

    private normalizeDepPath(sourceFile: string, depPath: string): string {
        try {
            // Obter o analisador que processou o arquivo
            const analyzer = this.getAnalyzerForFile(sourceFile);

            if (!analyzer || !(analyzer instanceof UniversalAnalyzer)) {
                // Usar lógica de fallback simples se não for UniversalAnalyzer
                if (depPath.startsWith(".")) {
                    const sourceDirPath = path.dirname(sourceFile);
                    return path.join(sourceDirPath, depPath);
                }
                return depPath;
            }

            // Tentar cada resolvedor definido para a linguagem
            const resolvers = analyzer.getPathResolvers();
            if (resolvers && resolvers.length > 0) {
                for (const resolver of resolvers) {
                    const regex = new RegExp(resolver.pattern);
                    const match = regex.exec(depPath);
                    if (match) {
                        return resolver.resolve(
                            match,
                            sourceFile,
                            this.projectRoot
                        );
                    }
                }
            }

            // Comportamento padrão se nenhum resolvedor corresponder
            if (depPath.startsWith(".")) {
                const sourceDirPath = path.dirname(sourceFile);
                return path.join(sourceDirPath, depPath);
            }

            return depPath;
        } catch (error) {
            console.warn(
                chalk.yellow(
                    `⚠️ Aviso: Erro ao normalizar caminho ${depPath}: ${error}`
                )
            );
            return depPath;
        }
    }

    // Método melhorado de verificação de existência de arquivo
    private fileExistsInList(
        filePath: string,
        files: TreeItemFlatted[]
    ): boolean {
        // Adicionar logs para debugging
        console.log(`Verificando: ${filePath}`);

        // 1. Verificar o caminho exato
        if (files.some((f) => f.path === filePath)) {
            console.log(`Encontrado caminho exato: ${filePath}`);
            return true;
        }

        // 2. Verificar para diretórios com index.*
        // Muitos projetos React/Next.js têm estrutura de app/components/Button/index.tsx
        if (!filePath.endsWith("/index")) {
            const indexPath = `${filePath}/index`;
            for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
                if (files.some((f) => f.path === `${indexPath}${ext}`)) {
                    console.log(
                        `Encontrado como diretório com index: ${indexPath}${ext}`
                    );
                    return true;
                }
            }
        }

        // 3. Verificar sem extensão
        const withoutExt = filePath.replace(/\.\w+$/, "");
        const filesWithoutExt = files.map((f) => f.path.replace(/\.\w+$/, ""));
        if (filesWithoutExt.includes(withoutExt)) {
            console.log(`Encontrado sem extensão: ${withoutExt}`);
            return true;
        }

        // 4. Verificar adicionando extensões comuns
        if (!path.extname(filePath)) {
            for (const ext of [".ts", ".tsx", ".js", ".jsx", ".json", ".md"]) {
                if (files.some((f) => f.path === `${filePath}${ext}`)) {
                    console.log(`Encontrado com extensão: ${filePath}${ext}`);
                    return true;
                }
            }
        }

        // 5. Verificar diretórios sem a barra final
        // Ex: '../Icons' pode referir-se a '../Icons/index.tsx'
        if (!filePath.endsWith("/")) {
            for (const file of files) {
                if (file.path.startsWith(`${filePath}/`)) {
                    console.log(`Encontrado como diretório: ${file.path}`);
                    return true;
                }
            }
        }

        // Adicionar caminho não encontrado ao conjunto
        this._notFoundPaths.add(filePath);

        console.log(`Não encontrado: ${filePath}`);
        return false;
    }

    private async loadAnalyzers() {
        // Carregar os padrões de linguagem
        const patterns = await loadLanguagePatterns();

        // Adicionamos todos os analisadores primeiro
        for (const patternConfig of patterns) {
            this.registerAnalyzer(new UniversalAnalyzer(patternConfig));
        }

        // Depois adicionamos uma única mensagem resumida
        console.log(
            chalk.dim(
                `📚 Registrados ${patterns.length} analisadores de linguagens`
            )
        );

        // Carregar padrões de linguagem personalizados
        const customPatternsDir = path.join(
            this.projectRoot,
            ".codocx/language-patterns"
        );

        if (fs.existsSync(customPatternsDir)) {
            try {
                const files = await fs.promises.readdir(customPatternsDir);
                const jsonFiles = files.filter((f) => f.endsWith(".json"));

                console.log(
                    chalk.dim(
                        `📚 Encontrados ${jsonFiles.length} padrões personalizados`
                    )
                );

                for (const file of jsonFiles) {
                    try {
                        const content = await fs.promises.readFile(
                            path.join(customPatternsDir, file),
                            "utf-8"
                        );
                        const config = JSON.parse(content);
                        this.registerAnalyzer(new UniversalAnalyzer(config));
                        console.log(
                            chalk.dim(
                                `✅ Carregado padrão personalizado: ${file}`
                            )
                        );
                    } catch (e) {
                        console.error(
                            chalk.red(`❌ Erro ao carregar padrão ${file}:`),
                            e
                        );
                    }
                }
            } catch (e) {
                console.error(
                    chalk.red(`❌ Erro ao ler diretório de padrões:`),
                    e
                );
            }
        }
    }
}
