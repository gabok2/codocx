import { LLMConfig, LLMProvider, LLMProviderType } from "./types";
import { OllamaProvider } from "./ollama";
import { LMStudioProvider } from "./lmstudio";

function getDefaultConfig(provider: LLMProviderType): LLMConfig {
    switch (provider) {
        case LLMProviderType.OLLAMA:
            return {
                endpoint: "http://localhost:11434",
                model: "phi4",
            };
        case LLMProviderType.LM_STUDIO:
            return {
                endpoint: "http://localhost:1234",
                model: "(usa o modelo carregado)",
            };
        default:
            throw new Error(`Provider não suportado: ${provider}`);
    }
}

export function createProvider(
    type: LLMProviderType,
    config?: Partial<LLMConfig>
): LLMProvider {
    const defaultConfig = getDefaultConfig(type);
    const finalConfig: LLMConfig = {
        ...defaultConfig,
        ...config,
    };

    switch (type) {
        case LLMProviderType.OLLAMA:
            return new OllamaProvider(finalConfig);
        case LLMProviderType.LM_STUDIO:
            return new LMStudioProvider(finalConfig);
        default:
            throw new Error(`Provider não suportado: ${type}`);
    }
}

export type { LLMConfig, LLMProvider } from "./types";
export { LLMProviderType } from "./types";
