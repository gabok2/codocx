import { LLMProviderType } from "../utils/llm";

export const CONNECTION_ERRORS = {
    [LLMProviderType.OLLAMA]:
        "Não foi possível se conectar ao Ollama. Verifique se o serviço está rodando em http://localhost:11434",
    [LLMProviderType.LM_STUDIO]:
        "Não foi possível se conectar ao LM Studio. Verifique se o serviço está rodando em http://localhost:1234",
};
