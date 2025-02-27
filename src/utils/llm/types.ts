export interface PromptResponse {
    text: string;
}

export interface LLMProvider {
    generateResponse(prompt: string, system?: string): Promise<PromptResponse>;
    validateConnection(): Promise<boolean>;
    getConfig(): LLMConfig;
}

export enum LLMProviderType {
    OLLAMA = "ollama",
    LM_STUDIO = "lm-studio",
}

export interface LLMConfig {
    endpoint: string;
    model: string;
}
