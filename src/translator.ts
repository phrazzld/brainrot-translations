// src/translator.ts
import chalk from "chalk";
import OpenAI from "openai";
import { DEFAULT_CHUNK_SIZE, flexibleChunkText } from "./chunk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

const OPENAI_MODELS = ["o3-mini", "o1", "gpt-4o"];
const OPENROUTER_MODELS = ["deepseek/deepseek-r1", "google/gemini-pro-1.5"];

const MAX_RETRIES = 3;

export interface TranslateOptions {
   openaiApiKey?: string;
   openrouterApiKey?: string;
   model: string;
   notes?: string;
}

export function createOpenRouterClient(openrouterApiKey: string): OpenAI {
   return new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
   });
}

function instantiateOpenAiClient(opts: TranslateOptions): OpenAI {
   const { model, openaiApiKey, openrouterApiKey } = opts;
   console.log(chalk.blueBright(`\n[translator] instantiatingOpenAiClient for model=${model}`));

   if (OPENAI_MODELS.includes(model)) {
      if (!openaiApiKey) {
         throw new Error("missing OPENAI_API_KEY for openai model");
      }
      return new OpenAI({ apiKey: openaiApiKey });
   } else if (OPENROUTER_MODELS.includes(model)) {
      if (!openrouterApiKey) {
         throw new Error("missing OPENROUTER_API_KEY for openrouter usage");
      }
      console.log(chalk.blueBright(`[translator] using openrouter with baseURL=https://openrouter.ai/api/v1`));
      return createOpenRouterClient(openrouterApiKey);
   }
   throw new Error(`unknown or unsupported model: '${model}'`);
}

async function callChatCompletion(
   client: OpenAI,
   model: string,
   systemPrompt: string,
   userPrompt: string,
   temperature: number
): Promise<string> {
   console.log(chalk.cyan(`[translator] callChatCompletion => model=${model}`));
   console.log(chalk.cyan(`[translator] systemPromptLength=${systemPrompt.length}, userPromptLength=${userPrompt.length}`));

   const requestArgs = {
      model,
      messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt },
      ],
      ...(["o3-mini", "o1"].includes(model)
         ? { reasoning_effort: "high" }
         : { temperature }),
   } as any;

   console.log(chalk.cyanBright(`[translator] sending request to openai`));
   console.log(chalk.dim(`[translator] request preview (start):\n${userPrompt.slice(0, 300)}...\n`))
   console.log(chalk.dim(`[translator] request preview (end):\n${userPrompt.slice(-300)}...\n`))

   const response = await client.chat.completions.create(requestArgs);

   const choice = response.choices[0];
   if (!choice || !choice.message || !choice.message.content) {
      throw new Error("no content returned from openai");
   }
   console.log(chalk.cyanBright(`[translator] chat completion returned content length=${choice.message.content.length}`));

   // print out start and end of the chunk
   console.log(chalk.dim(`[translator] response preview (start):\n${choice.message.content.slice(0, 300)}...\n`))
   console.log(chalk.dim(`[translator] response preview (end):\n${choice.message.content.slice(-300)}...\n`))

   return choice.message.content;
}

async function translateChunkWithRetries(
   client: OpenAI,
   systemPrompt: string,
   userPrompt: string,
   chunk: string,
   model: string,
   temperature: number,
   chunkIndex: number,
   chunkCount: number
): Promise<string> {
   let attempts = 0;
   while (attempts < MAX_RETRIES) {
      attempts++;
      try {
         console.log(chalk.bgBlueBright.black(
            `\n[translator] translating chunk ${chunkIndex}/${chunkCount}, attempt ${attempts}`
         ));
         console.log(chalk.blueBright(`[translator] chunk length=${chunk.length}`));
         console.log(chalk.dim(`[translator] chunk content (preview, start):\n${chunk.slice(0, 300)}...\n`));
         console.log(chalk.dim(`[translator] chunk content (preview, end):\n${chunk.slice(-300)}...\n`));

         const text = `${userPrompt}

---

original text chunk:

${chunk}`;

         const result = await callChatCompletion(client, model, systemPrompt, text, temperature);
         console.log(chalk.greenBright(`[translator] chunk ${chunkIndex} translated successfully, result length=${result.length}\n`));
         return result;
      } catch (err) {
         console.log(chalk.redBright(`[translator] error in chunk ${chunkIndex}/${chunkCount}, attempt ${attempts}: ${String(err)}`));
         if (attempts >= MAX_RETRIES) {
            throw err;
         }
         console.log(chalk.yellow(`[translator] waiting 3s before retry...`));
         await new Promise((r) => setTimeout(r, 3000));
      }
   }
   throw new Error("exceeded max retries");
}

export async function translateFullText(
   text: string,
   author: string,
   title: string,
   opts: TranslateOptions
): Promise<string> {
   console.log(chalk.greenBright(`[translator] starting translation for "${title}" by ${author}`));
   const { model, notes = "" } = opts;
   const client = instantiateOpenAiClient(opts);

   console.log(chalk.greenBright(`[translator] splitting text with flexibleChunkText...`));
   const chunks = flexibleChunkText(text);
   console.log(chalk.greenBright(`[translator] split into ${chunks.length} chunk(s). default chunk size is ${DEFAULT_CHUNK_SIZE}`));

   const systemPrompt = buildSystemPrompt(author, title, notes);
   const userPrompt = buildUserPrompt(author, title);

   const translations: string[] = [];
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(chalk.magentaBright(`\n[translator] processing chunk #${i + 1}`));
      const chunkTranslation = await translateChunkWithRetries(
         client,
         systemPrompt,
         userPrompt,
         chunk,
         model,
         0.6,
         i + 1,
         chunks.length
      );
      translations.push(chunkTranslation);
   }

   const combined = translations.join("\n\n");
   console.log(chalk.bgGreenBright.black(`[translator] final combined translation length=${combined.length}`));
   return combined;
}
