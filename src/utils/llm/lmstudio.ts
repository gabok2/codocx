import chalk from "chalk";
import { LLMConfig, LLMProvider, PromptResponse } from "./types";

export class LMStudioProvider implements LLMProvider {
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
            console.log(chalk.blue("\n📤 Enviando prompt para o LM Studio..."));
            console.log(
                chalk.gray(
                    "Aguardando resposta (pode levar alguns segundos)..."
                )
            );
            process.stdout.write(chalk.dim("  "));

            const response = await fetch(
                `${this.config.endpoint}/v1/chat/completions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: "user",
                                content: fullPrompt,
                            },
                        ],
                        stream: false,
                        // Não especificamos model aqui pois o LM Studio
                        // já usa o modelo carregado e configurado
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(
                    `Erro na API do LM Studio (${response.status}): ${response.statusText}\nDetalhes: ${errorData}`
                );
            }

            const data = await response.json();
            const generatedText = data.choices?.[0]?.message?.content;

            if (!generatedText) {
                throw new Error("Resposta vazia do LM Studio");
            }

            console.log(chalk.green("\n✓ Resposta recebida com sucesso"));
            return { text: generatedText };
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("fetch")) {
                    throw new Error(
                        `Não foi possível conectar ao LM Studio em ${this.config.endpoint}\nErro: ${error.message}`
                    );
                }
                throw new Error(
                    `Erro ao gerar documentação com LM Studio: ${error.message}`
                );
            }
            throw error;
        }
    }

    async validateConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.endpoint}/v1/models`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
