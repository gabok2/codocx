import chalk from "chalk";
import { DependencyAnalyzer } from "../dependencyAnalysis/DependencyDetector";
import { PathResolver } from "../loadLanguagePatterns/loadLanguagePatterns";

interface PatternConfig {
    pattern: string;
    group: number;
    resolveStrategy?: string;
}

export interface LanguagePatternConfig {
    name: string;
    filePattern: string;
    dependencyPatterns: PatternConfig[];
}

export class UniversalAnalyzer implements DependencyAnalyzer {
    private patterns: Array<{
        pattern: RegExp;
        group: number;
        resolveStrategy?: string;
    }>;
    private filePattern: RegExp;
    private name: string;
    private pathResolvers: PathResolver[];

    constructor(config: {
        name: string;
        filePattern: string;
        dependencyPatterns: Array<{
            pattern: string;
            group: number;
            resolveStrategy?: string;
        }>;
        pathResolvers?: PathResolver[];
    }) {
        this.name = config.name || "Analisador personalizado";
        this.filePattern = new RegExp(config.filePattern);
        this.patterns = config.dependencyPatterns.map((p) => ({
            pattern: new RegExp(p.pattern, "g"),
            group: p.group,
            resolveStrategy: p.resolveStrategy,
        }));
        this.pathResolvers = config.pathResolvers || [];

        // Remover este log
        // console.log(chalk.dim(`🔍 Registrado analisador: ${chalk.cyan(this.name)}`));
    }

    // Método para acessar os resolvedores de caminho
    getPathResolvers(): PathResolver[] {
        return this.pathResolvers;
    }

    canProcess(filePath: string): boolean {
        return this.filePattern.test(filePath);
    }

    analyzeDependencies(filePath: string, content: string): string[] {
        const dependencies: string[] = [];

        for (const patternObj of this.patterns) {
            const { pattern, group, resolveStrategy } = patternObj;
            let match;

            // Reset regex state
            pattern.lastIndex = 0;

            while ((match = pattern.exec(content)) !== null) {
                if (match[group]) {
                    const dep = match[group];

                    if (resolveStrategy === "splitByComma") {
                        // Para casos como "implements A, B, C" em Java
                        dep.split(",")
                            .map((part) => part.trim())
                            .filter(Boolean)
                            .forEach((d) => dependencies.push(d));
                    } else {
                        dependencies.push(dep);
                    }
                }
            }
        }

        return [...new Set(dependencies)]; // Remove duplicados
    }
}
