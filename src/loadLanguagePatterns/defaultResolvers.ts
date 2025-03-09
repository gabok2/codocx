import * as path from "path";
import { PathResolver } from "./loadLanguagePatterns";

export const defaultResolvers: PathResolver[] = [
    // Alias padrão usado em muitos projetos JavaScript/TypeScript
    {
        pattern: "^@/(.+)$",
        resolve: (match, sourceFile, projectRoot) => {
            return match[1]; // Remover o @/ e retornar o caminho relativo
        },
    },

    // Caminhos relativos (./algo ou ../algo)
    {
        pattern: "^(\\.\\.?)/(.+)$", // Captura ./ ou ../ separadamente
        resolve: (match, sourceFile, projectRoot) => {
            const sourceDirPath = path.dirname(sourceFile);
            const prefix = match[1]; // ./ ou ../
            const restPath = match[2]; // o restante do caminho
            return path.normalize(path.join(sourceDirPath, prefix, restPath));
        },
    },

    // Caminhos alias com ~ (comuns em Vue, Nuxt, etc)
    {
        pattern: "^~/(.+)$",
        resolve: (match, sourceFile, projectRoot) => {
            return match[1]; // Remover o ~/ e retornar o caminho relativo
        },
    },

    // Imports absolutos de pacotes
    {
        pattern: "^([a-zA-Z@][a-zA-Z0-9_\\-@/]+)$",
        resolve: (match, sourceFile, projectRoot) => {
            return match[1]; // Manter o nome do pacote como está
        },
    },
];

// Resolvedores específicos para linguagens comuns
export const pythonResolvers: PathResolver[] = [
    {
        pattern: "^([a-zA-Z0-9_.]+)$",
        resolve: (match) => match[1].replace(/\./g, "/"),
    },
];
