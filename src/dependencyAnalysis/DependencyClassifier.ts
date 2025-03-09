import * as path from "path";
import chalk from "chalk";

// Tipos de dependência
export type DependencyTypeKey =
    | "Interface"
    | "Model"
    | "Repository"
    | "Service"
    | "Controller"
    | "Component"
    | "Hook"
    | "Store"
    | "Entity"
    | "DbContext"
    | "View"
    | "Module"
    | "Dependency"
    | "Inherits"
    | "Implements";

// Configurações visuais para tipos de dependência
export const dependencyTypeConfig: Record<
    DependencyTypeKey,
    { prefix: string; color: string }
> = {
    Interface: { prefix: "[Interface]", color: "blue" },
    Model: { prefix: "[Model]", color: "cyan" },
    Repository: { prefix: "[Repository]", color: "yellow" },
    Service: { prefix: "[Service]", color: "green" },
    Controller: { prefix: "[Controller]", color: "magenta" },
    Component: { prefix: "[Component]", color: "cyan" },
    Hook: { prefix: "[Hook]", color: "blue" },
    Store: { prefix: "[Store]", color: "yellow" },
    Entity: { prefix: "[Entity]", color: "cyan" },
    DbContext: { prefix: "[DbContext]", color: "magenta" },
    View: { prefix: "[View]", color: "green" },
    Module: { prefix: "[Module]", color: "white" },
    Dependency: { prefix: "[Dependency]", color: "gray" },
    Inherits: { prefix: "[Inherits]", color: "red" },
    Implements: { prefix: "[Implements]", color: "blue" },
};

/**
 * Classifica uma dependência com base no seu caminho e no arquivo de origem
 */
export function classifyDependency(
    dependency: string,
    sourceFile: string
): DependencyTypeKey {
    const ext = path.extname(sourceFile).toLowerCase();

    // C# / .NET
    if (ext === ".cs") {
        // Interfaces em C# começam com I seguido de maiúscula
        if (dependency.startsWith("I") && /^I[A-Z]/.test(dependency))
            return "Interface";
        if (dependency.endsWith("Context") || dependency.includes("DbContext"))
            return "DbContext";
        if (dependency.endsWith("Repository")) return "Repository";
        if (dependency.endsWith("Service")) return "Service";
        if (dependency.endsWith("Controller")) return "Controller";
        if (
            (!dependency.startsWith("I") && sourceFile.includes("Model")) ||
            dependency.endsWith("Entity") ||
            dependency.endsWith("Model")
        )
            return "Entity";
    }

    // JavaScript/TypeScript/React/Vue, etc.
    if ([".ts", ".js", ".tsx", ".jsx"].includes(ext)) {
        if (
            dependency.includes("component") ||
            dependency.includes("Component")
        )
            return "Component";
        if (dependency.includes("hook") || dependency.includes("Hook"))
            return "Hook";
        if (
            dependency.includes("store") ||
            dependency.includes("Store") ||
            dependency.includes("context") ||
            dependency.includes("Context")
        )
            return "Store";
        if (dependency.includes("service") || dependency.includes("Service"))
            return "Service";
        if (dependency.includes("model") || dependency.includes("Model"))
            return "Model";
    }

    // Python / Django
    if (ext === ".py") {
        if (dependency.endsWith("models") || dependency.includes("models."))
            return "Model";
        if (dependency.endsWith("views") || dependency.includes("views."))
            return "View";
        if (
            dependency.endsWith("serializers") ||
            dependency.includes("serializers.")
        )
            return "Module";
    }

    // Java / Spring
    if (ext === ".java") {
        if (dependency.endsWith("Repository")) return "Repository";
        if (dependency.endsWith("Service")) return "Service";
        if (dependency.endsWith("Controller")) return "Controller";
        if (dependency.endsWith("Entity") || dependency.endsWith("Model"))
            return "Entity";
    }

    return "Module"; // Tipo padrão
}

/**
 * Obtém a formatação visual para um tipo de dependência
 */
export function formatDependencyType(type: DependencyTypeKey): string {
    const config = dependencyTypeConfig[type];
    return chalk[config.color](config.prefix);
}
