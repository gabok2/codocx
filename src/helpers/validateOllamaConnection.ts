import { spinner } from "@clack/prompts";
import { OLLAMA_CONNECTION_ERROR } from "../constants/errors";

export async function configOllamaConnection() {
    const loading = spinner();
    loading.start("Verificando conexão com o Ollama...");

    try {
        const response = await fetch("http://localhost:11434/api/tags");
        if (!response.ok) {
            throw new Error(OLLAMA_CONNECTION_ERROR);
        }
        loading.stop("Conexão com Ollama estabelecida");
    } catch (error) {
        loading.stop(
            "Erro ao conectar com Ollama. Certifique-se que o serviço está rodando em http://localhost:11434"
        );
        throw error;
    }
}
