import { select } from "@clack/prompts";
import chalk from "chalk";
import { LLMProviderType } from "./llm";

interface ProviderChoice {
    value: LLMProviderType;
    label: string;
    hint?: string;
}

const providers: ProviderChoice[] = [
    {
        value: LLMProviderType.OLLAMA,
        label: "Ollama",
        hint: "http://localhost:11434",
    },
    {
        value: LLMProviderType.LM_STUDIO,
        label: "LM Studio",
        hint: "Usa configurações do modelo atualmente carregado",
    },
];

export async function selectProvider(): Promise<LLMProviderType> {
    console.log(chalk.blue("\n🤖 Configure o provider LLM:"));

    const result = await select({
        message: "Selecione o provider:",
        options: providers,
    });

    // O select retorna symbol quando cancelado, nesse caso usamos Ollama como fallback
    return (
        typeof result === "string" ? result : LLMProviderType.OLLAMA
    ) as LLMProviderType;
}
