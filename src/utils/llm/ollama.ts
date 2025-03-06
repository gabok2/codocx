import chalk from "chalk";
import { LLMConfig, LLMProvider, PromptResponse } from "./types";

export class OllamaProvider implements LLMProvider {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    getConfig(): LLMConfig {
        return this.config;
    }

    async generateResponse(
        prompt: string,
        system?: string
    ): Promise<PromptResponse> {
        const fullPrompt = system
            ? `System: ${system}\n\nUser: ${prompt}`
            : prompt;

        try {
            console.log(chalk.blue("\n📤 Enviando prompt para o Ollama..."));
            console.log(
                chalk.gray(
                    "Aguardando resposta (pode levar alguns segundos)..."
                )
            );
            process.stdout.write(chalk.dim("  "));

            const response = await fetch(
                `${this.config.endpoint}/api/generate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: this.config.model,
                        prompt: fullPrompt,
                        stream: false,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(
                    `Erro na API do Ollama (${response.status}): ${response.statusText}\nDetalhes: ${errorData}`
                );
            }

            const data = (await response.json()) as { response: string };

            if (!data.response) {
                throw new Error("Resposta vazia do Ollama");
            }

            console.log(chalk.green("\n✓ Resposta recebida com sucesso"));
            return { text: data.response };
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("fetch")) {
                    throw new Error(
                        `Não foi possível conectar ao Ollama em ${this.config.endpoint}\nErro: ${error.message}`
                    );
                }
                throw new Error(
                    `Erro ao gerar documentação com Ollama: ${error.message}`
                );
            }
            throw error;
        }
    }

    async validateConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.endpoint}/api/version`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
