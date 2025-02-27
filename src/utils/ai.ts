import { createProvider, LLMConfig, LLMProviderType } from "./llm";

function getCustomConfig(): Partial<LLMConfig> {
    const config: Partial<LLMConfig> = {};
    if (process.env.LLM_ENDPOINT) config.endpoint = process.env.LLM_ENDPOINT;
    if (process.env.LLM_MODEL) config.model = process.env.LLM_MODEL;
    return config;
}

export function createPromptAbility(
    system: string,
    providerType?: LLMProviderType
) {
    const provider = createProvider(
        providerType || LLMProviderType.OLLAMA,
        getCustomConfig()
    );

    async function getResult(prompt: string) {
        return provider.generateResponse(prompt, system);
    }

    return { getResult };
}

export async function getPromptResult(
    prompt: string,
    providerType?: LLMProviderType
) {
    const provider = createProvider(
        providerType || LLMProviderType.OLLAMA,
        getCustomConfig()
    );
    return provider.generateResponse(prompt);
}
