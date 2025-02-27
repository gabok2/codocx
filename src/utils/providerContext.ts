import { LLMProviderType } from "./llm/types";

class ProviderContext {
    private static instance: ProviderContext;
    private currentProvider: LLMProviderType = LLMProviderType.OLLAMA;

    private constructor() {}

    public static getInstance(): ProviderContext {
        if (!ProviderContext.instance) {
            ProviderContext.instance = new ProviderContext();
        }
        return ProviderContext.instance;
    }

    public setProvider(provider: LLMProviderType): void {
        this.currentProvider = provider;
        // Também mantemos no process.env para retrocompatibilidade
        process.env.LLM_PROVIDER = provider;
    }

    public getProvider(): LLMProviderType {
        return this.currentProvider;
    }
}

export const providerContext = ProviderContext.getInstance();
