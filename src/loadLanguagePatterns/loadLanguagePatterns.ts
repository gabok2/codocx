import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { LanguagePatternConfig } from "../universalAnalyzer/UniversalAnalyzer";
import { defaultResolvers, pythonResolvers } from "./defaultResolvers";

export interface PathResolver {
    pattern: string;
    resolve: (
        match: RegExpExecArray,
        sourceFile: string,
        projectRoot: string
    ) => string;
}

// Defina a interface sem auto-importação
export interface LanguageConfig {
    name: string;
    filePattern: string;
    dependencyPatterns: Array<{
        pattern: string;
        group: number;
        resolveStrategy?: string;
    }>;
    pathResolvers?: PathResolver[];
}

export interface DependencyType {
    type: string;
    description: string;
    color: string;
}

export const languagePatterns: { [key: string]: LanguageConfig } = {
    // JavaScript/TypeScript com React e outros frameworks
    javascript: {
        name: "JavaScript/TypeScript",
        filePattern: "\\.(js|jsx|ts|tsx)$",
        dependencyPatterns: [
            {
                pattern: "import\\s+(?:.+\\s+from\\s+)?['\"]([^'\"]+)['\"]",
                group: 1,
            },
            {
                pattern: "require\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)",
                group: 1,
            },
            {
                pattern: "import\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)",
                group: 1,
            },
            {
                pattern:
                    "lazy\\s*\\(\\s*\\(?\\s*\\(\\)\\s*=>\\s*import\\s*\\(\\s*['\"]([^'\"]+)['\"]",
                group: 1,
            },
            { pattern: "/// <reference path=['\"]([^'\"]+)['\"]", group: 1 },
        ],
        pathResolvers: defaultResolvers,
    },

    // C# com Entity Framework e outros frameworks .NET
    csharp: {
        name: "C#",
        filePattern: "\\.cs$",
        dependencyPatterns: [
            // Namespaces
            { pattern: "using\\s+([\\w.]+)\\s*;", group: 1 },
            // Herança e interfaces
            {
                pattern:
                    ":\\s*(?:public\\s+|private\\s+|internal\\s+|protected\\s+)?(I?[A-Z][A-Za-z0-9_<>]+)(?:[,)]|\\s)",
                group: 1,
            },
            // Injeção de Dependência
            {
                pattern:
                    "(?:public|private|internal|protected)\\s+\\w+\\([^)]*?\\b(I?[A-Z][A-Za-z0-9_<>]+)\\s+\\w+[,)]",
                group: 1,
            },
            // Entity Framework - DbSet
            { pattern: "DbSet<([A-Za-z0-9_<>]+)>", group: 1 },
            // Entity Framework - Relacionamentos
            {
                pattern:
                    "(?:HasOne|HasMany|WithOne|WithMany)<([A-Za-z0-9_<>]+)>",
                group: 1,
            },
        ],
    },

    // Python com Django, SQLAlchemy, ou frameworks similares
    python: {
        name: "Python",
        filePattern: "\\.py$",
        dependencyPatterns: [
            { pattern: "import\\s+([a-zA-Z0-9_.]+)", group: 1 },
            { pattern: "from\\s+([a-zA-Z0-9_.]+)\\s+import", group: 1 },
            // Django models
            { pattern: "ForeignKey\\(['\"]?([a-zA-Z0-9_]+)['\"]?", group: 1 },
            {
                pattern: "ManyToManyField\\(['\"]?([a-zA-Z0-9_]+)['\"]?",
                group: 1,
            },
            // SQLAlchemy
            { pattern: "relationship\\(['\"]?([a-zA-Z0-9_]+)['\"]?", group: 1 },
        ],
        pathResolvers: pythonResolvers,
    },

    // Java com Spring, JPA, etc.
    java: {
        name: "Java",
        filePattern: "\\.java$",
        dependencyPatterns: [
            { pattern: "import\\s+([\\w.]+)(?:\\s*;|\\s*\\*)", group: 1 },
            { pattern: "extends\\s+([A-Za-z0-9_]+)", group: 1 },
            { pattern: "implements\\s+([A-Za-z0-9_,\\s]+)", group: 1 },
            // Spring - Autowired
            {
                pattern:
                    "@Autowired[\\s\\n]+(?:private|public|protected)?\\s+([A-Za-z0-9_<>]+)",
                group: 1,
            },
            // JPA/Hibernate
            {
                pattern:
                    "@(?:OneToMany|ManyToOne|OneToOne|ManyToMany)[^(]*?\\([^)]*targetEntity\\s*=\\s*([A-Za-z0-9_]+)\\.class",
                group: 1,
            },
        ],
    },

    // PHP com Laravel, Symphony, etc.
    php: {
        name: "PHP",
        filePattern: "\\.php$",
        dependencyPatterns: [
            { pattern: "use\\s+([\\\\\\w\\\\]+)(?:;|\\s+as)", group: 1 },
            { pattern: "require(?:_once)?\\s*['\"]([^'\"]+)['\"]", group: 1 },
            { pattern: "include(?:_once)?\\s*['\"]([^'\"]+)['\"]", group: 1 },
            // Laravel - Models e Relações
            {
                pattern: "belongsTo\\s*\\(\\s*['\"]?([\\\\\\w\\\\]+)['\"]?",
                group: 1,
            },
            {
                pattern: "hasMany\\s*\\(\\s*['\"]?([\\\\\\w\\\\]+)['\"]?",
                group: 1,
            },
            {
                pattern: "hasOne\\s*\\(\\s*['\"]?([\\\\\\w\\\\]+)['\"]?",
                group: 1,
            },
        ],
    },
};

export async function loadLanguagePatterns(): Promise<LanguageConfig[]> {
    console.log(chalk.dim("📚 Carregando padrões de linguagens"));

    // Use os padrões definidos internamente
    const result = Object.values(languagePatterns);

    console.log(
        chalk.green(
            `✅ Carregados ${result.length} padrões de linguagem padrão`
        )
    );
    return result;
}
