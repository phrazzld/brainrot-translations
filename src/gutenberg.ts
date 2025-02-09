// src/gutenberg.ts
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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
   const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
   const res = await fetch(url);
   if (!res.ok) {
      throw new Error(`gutendex search failed: ${res.status}`);
   }
   const jsonData = (await res.json()) as { results: GutendexBookData[] };

   return jsonData.results.map((item) => ({
      id: item.id,
      title: item.title,
      authors: item.authors.map((a) => a.name),
      downloadCount: item.download_count,
      formats: item.formats
   }));
}

function pickBestFormat(formats: Record<string, string>) {
   for (const fmt of PREFERRED_FORMATS) {
      if (formats[fmt]) {
         return { chosenFormat: fmt, downloadUrl: formats[fmt] };
      }
   }
   throw new Error("no recognized text/html format found in gutendex data");
}

function parseHtmlIntoText(html: string): string {
   const $ = cheerio.load(html);
   $("script, style").remove();

   const lines: string[] = [];
   $("h1, h2, h3, p, br").each((_, el) => {
      const tag = el.tagName.toLowerCase();
      if (["h1", "h2", "h3"].includes(tag)) {
         const heading = $(el).text().trim();
         if (heading) {
            lines.push(heading.toUpperCase(), "");
         }
      } else if (tag === "p") {
         const txt = $(el).text().trim().replace(/\s+/g, " ");
         if (txt) {
            lines.push(txt, "");
         }
      } else if (tag === "br") {
         lines.push("");
      }
   });
   const combined = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
   return combined;
}

export async function fetchBookText(bookId: number) {
   const metadataUrl = `https://gutendex.com/books/${bookId}`;
   const metaRes = await fetch(metadataUrl);
   if (!metaRes.ok) {
      throw new Error(`failed to fetch metadata for book ${bookId}`);
   }
   const data = (await metaRes.json()) as GutendexBookData;

   const title: string = data.title;
   const authors: string[] = data.authors.map((a) => a.name) || ["unknown"];

   const { chosenFormat, downloadUrl } = pickBestFormat(data.formats);
   const textRes = await fetch(downloadUrl);
   if (!textRes.ok) {
      throw new Error(`failed to download text from ${downloadUrl}`);
   }
   const buf = await textRes.arrayBuffer();
   const utf8 = new TextDecoder("utf-8").decode(buf);

   let finalText = "";
   if (chosenFormat.includes("text/plain")) {
      finalText = utf8;
   } else if (chosenFormat.includes("text/html")) {
      finalText = parseHtmlIntoText(utf8);
   } else {
      throw new Error("no plain text/html found; only epub/mobi. cannot parse.");
   }

   return {
      title,
      authors,
      text: finalText
   };
}
