// src/gutenberg.ts
import chalk from "chalk";
import { htmlToText } from "html-to-text";
import fetch from "node-fetch";

export interface GutendexBookData {
   id: number;
   title: string;
   authors: { name: string }[];
   download_count: number;
   formats: Record<string, string>;
}

export interface GutenbergResult {
   id: number;
   title: string;
   authors: string[];
   downloadCount: number;
   formats: Record<string, string>;
}

const PREFERRED_FORMATS = [
   "text/plain; charset=utf-8",
   "text/plain",
   "text/html; charset=utf-8",
   "text/html"
];

export async function gutendexSearch(query: string): Promise<GutenbergResult[]> {
   console.log(chalk.green(`[gutenberg] searching for "${query}" on gutendex.com...`));
   const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
   const res = await fetch(url);
   if (!res.ok) {
      throw new Error(`gutendex search failed: ${res.status}`);
   }
   const jsonData = (await res.json()) as { results: GutendexBookData[] };

   console.log(chalk.green(`[gutenberg] got ${jsonData.results.length} results from gutendex.`));

   return jsonData.results.map((item) => ({
      id: item.id,
      title: item.title,
      authors: item.authors.map((a) => a.name),
      downloadCount: item.download_count,
      formats: item.formats,
   }));
}

function pickBestFormat(formats: Record<string, string>) {
   for (const fmt of PREFERRED_FORMATS) {
      if (formats[fmt]) {
         console.log(chalk.dim(`[gutenberg] found acceptable format: "${fmt}"`));
         return { chosenFormat: fmt, downloadUrl: formats[fmt] };
      }
   }
   throw new Error("no recognized text/plain or text/html format in gutendex data");
}

export async function fetchBookText(bookId: number) {
   console.log(chalk.yellowBright(`[gutenberg] requesting metadata for bookId=${bookId}...`));
   const metadataUrl = `https://gutendex.com/books/${bookId}`;
   const metaRes = await fetch(metadataUrl);
   if (!metaRes.ok) {
      throw new Error(`failed to fetch metadata for book ${bookId}`);
   }
   const data = (await metaRes.json()) as GutendexBookData;

   const title: string = data.title;
   const authors: string[] = data.authors.map((a) => a.name) || ["unknown"];

   const { chosenFormat, downloadUrl } = pickBestFormat(data.formats);

   console.log(
      chalk.yellowBright(`[gutenberg] chosenFormat="${chosenFormat}", downloadUrl="${downloadUrl}"`)
   );

   const textRes = await fetch(downloadUrl);
   if (!textRes.ok) {
      throw new Error(`failed to download text from ${downloadUrl}`);
   }
   const buf = await textRes.arrayBuffer();
   const utf8 = new TextDecoder("utf-8").decode(buf);

   let finalText = utf8;
   if (chosenFormat.includes("text/html")) {
      console.log(chalk.yellow(`[gutenberg] converting html to text...`));
      finalText = htmlToText(utf8, {
         wordwrap: false,
      });
   }

   console.log(chalk.yellowBright(`[gutenberg] fetched text length: ${finalText.length}`));
   return {
      title,
      authors,
      text: finalText,
   };
}
