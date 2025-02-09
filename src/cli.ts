// src/cli.ts
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { gutendexSearch, fetchBookText } from "./gutenberg";
import { translateFullText } from "./translator";
import * as fs from "node:fs";
import * as path from "node:path";

const program = new Command();

program
   .name("brainrot-translations")
   .description("cli for searching and translating public domain books with meltdown-tier slang");

program
   .command("search")
   .description("search project gutenberg for a title/author")
   .argument("<query>", "search query")
   .option("--limit <number>", "limit search results", "5")
   .action(async (query: string, options: { limit: string }) => {
      const spinner = ora({
         text: chalk.greenBright("searching for your next brainrot..."),
         spinner: "dots",
      }).start();
      try {
         const results = await gutendexSearch(query);
         spinner.succeed(`found ${results.length} results for "${query}"`);
         const limit = parseInt(options.limit, 10);
         console.log(chalk.blueBright("\nTop results:"));
         results.slice(0, limit).forEach((b, i) => {
            console.log(
               chalk.yellow(
                  `[${i + 1}] id=${b.id}  title="${b.title}"  authors="${b.authors.join(", ")}"  downloads=${b.downloadCount}`
               )
            );
         });
      } catch (err) {
         spinner.fail(chalk.red("search failed"));
         console.error(err);
         process.exit(1);
      }
   });

program
   .command("translate")
   .description("fetch & translate a book from project gutenberg")
   .requiredOption("--bookId <number>", "the gutendex book id")
   .option("--model <string>", "which model to use", "o3-mini")
   .option("--notes <string>", "extra notes to pass to system prompt", "")
   .action(async (opts: { bookId: string; model: string; notes: string }) => {
      const { bookId, model, notes } = opts;
      // always display which model is being used
      console.log(chalk.magentaBright(`using model: ${model}`));
      const fetchSpinner = ora({
         text: chalk.greenBright(`fetching book id=${bookId}...`),
         spinner: "dots",
      }).start();
      try {
         const { title, authors, text } = await fetchBookText(Number(bookId));
         const authorStr = authors.join(", ");
         fetchSpinner.succeed(`fetched "${title}" by ${authorStr} (length: ${text.length})`);

         const translateSpinner = ora({
            text: chalk.cyanBright("initiating dank translation..."),
            spinner: "line",
         }).start();

         const translation = await translateFullText(text, authorStr, title, {
            model,
            notes,
            openaiApiKey: process.env.OPENAI_API_KEY,
            openrouterApiKey: process.env.OPENROUTER_API_KEY,
         });
         translateSpinner.succeed(chalk.cyanBright("translation complete!"));
         console.log(chalk.greenBright(`translation was executed using model: ${model}`));

         // additional dank logging / easter egg message
         console.log(chalk.magentaBright("fr fr shit is dank, run it back fam"));

         const slug = title.replace(/\W+/g, "_").toLowerCase();
         const dirPath = path.join("translations", slug);
         if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
         }

         const sourcePath = path.join(dirPath, "source.txt");
         fs.writeFileSync(sourcePath, text, "utf-8");

         const translationPath = path.join(dirPath, "translation.txt");
         fs.writeFileSync(translationPath, translation, "utf-8");

         const meta = {
            title,
            authors,
            modelUsed: model,
            date: new Date().toISOString(),
            notes,
         };
         const metaPath = path.join(dirPath, "metadata.json");
         fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

         console.log(chalk.greenBright("done! files saved to:"));
         console.log(chalk.yellow(`  ${sourcePath}`));
         console.log(chalk.yellow(`  ${translationPath}`));
         console.log(chalk.yellow(`  ${metaPath}`));
      } catch (err) {
         fetchSpinner.fail(chalk.red("error during translation"));
         console.error(err);
         process.exit(1);
      }
   });

program.parseAsync(process.argv).catch((err) => {
   console.error(chalk.red("cli error:"), err);
   process.exit(1);
});
