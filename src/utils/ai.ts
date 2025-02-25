import {
    createPromptAbility as ollamaPromptAbility,
    getPromptResult as ollamaGetPromptResult,
} from "./ollama";
import { SYSTEM_PROMPT } from "../constants/index.ts";

export const createPromptAbility = ollamaPromptAbility;
export const getPromptResult = ollamaGetPromptResult;
