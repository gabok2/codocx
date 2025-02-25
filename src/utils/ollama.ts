import chalk from "chalk";

interface OllamaResponse {
    model: string;
    response: string;
}

interface PromptResponse {
    text: string;
}

async function generateWithOllama(
    prompt: string,
    system?: string
): Promise<PromptResponse> {
    const fullPrompt = system ? `System: ${system}\n\nUser: ${prompt}` : prompt;

    try {
        console.log(chalk.blue("\n📤 Enviando prompt para o Ollama..."));
        console.log(
            chalk.gray("Aguardando resposta (pode levar alguns segundos)...")
        );
        process.stdout.write(chalk.dim("  "));

        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "phi4",
                prompt: fullPrompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
                `Erro na API do Ollama (${response.status}): ${response.statusText}\nDetalhes: ${errorData}`
            );
        }

        const data = (await response.json()) as OllamaResponse;

        if (!data.response) {
            throw new Error("Resposta vazia do Ollama");
        }

        console.log(chalk.green("\n✓ Resposta recebida com sucesso"));
        return { text: data.response };
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("fetch")) {
                throw new Error(
                    `Não foi possível conectar ao Ollama. Verifique se o serviço está rodando em http://localhost:11434\nErro: ${error.message}`
                );
            }
            throw new Error(
                `Erro ao gerar documentação com Ollama: ${error.message}`
            );
        }
        throw error;
    }
}

export function createPromptAbility(system: string) {
    async function getResult(prompt: string) {
        console.log(
            chalk.blue("\n🤖 Iniciando geração com contexto do sistema")
        );
        const response = await generateWithOllama(prompt, system);
        return response;
    }

    return { getResult };
}

export async function getPromptResult(prompt: string) {
    return generateWithOllama(prompt);
}
