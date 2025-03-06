import { spinner } from "@clack/prompts";
import { createProvider, LLMProviderType } from "../utils/llm";
import { CONNECTION_ERRORS } from "../constants/errors";
import { providerContext } from "../utils/providerContext";
import chalk from "chalk";

export async function configConnection() {
    const loading = spinner();
    const provider = providerContext.getProvider();
    const llmProvider = createProvider(provider as LLMProviderType);
    const config = llmProvider.getConfig();

    loading.start(
        `\n${chalk.blue("📡")} Verificando conexão com ${chalk.cyan(
            provider
        )}...`
    );

    console.log(chalk.dim("\nConfiguração detectada:"));
    console.log(chalk.dim("- Provider:"), chalk.cyan(provider));
    console.log(chalk.dim("- Endpoint:"), chalk.cyan(config.endpoint));
    console.log(chalk.dim("- Modelo:"), chalk.cyan(config.model));

    try {
        const isConnected = await llmProvider.validateConnection();

        if (!isConnected) {
            loading.stop(chalk.red("✖ Conexão falhou"));
            throw new Error(CONNECTION_ERRORS[provider]);
        }

        loading.stop(chalk.green("✓ Conexão estabelecida com sucesso"));
    } catch (error) {
        loading.stop(
            error instanceof Error ? error.message : CONNECTION_ERRORS[provider]
        );
        throw error;
    }
}
