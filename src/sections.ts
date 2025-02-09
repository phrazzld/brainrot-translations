// src/sections.ts
import { createOpenRouterClient } from "./translator";

/**
 * each recognized logical subdivision
 */
export interface BookSection {
   title: string;
   content: string;
}

/**
 * calls the gemini-pro-1.5 model via openrouter to parse the text into logical sections
 * uses "response_format: { type: 'json_schema', ... }" for strict JSON
 */
export async function identifyBookSections(text: string, openrouterApiKey: string): Promise<BookSection[]> {
   // system instructions:
   //   * parse into major subdivisions (chapters, acts, etc.)
   //   * do NOT omit or shorten the main body text
   //   * ignore disclaimers / licensing if outside main body
   //   * produce strictly valid JSON with no extra keys
   //   * do not wrap the array in triple-backticks or any other markup

   const systemPrompt = `
you are a text-structure analyst. given a public-domain text, your job is to identify all major logical subdivisions (chapters, parts, acts, scenes, etc.) in the main body.
you must not omit or summarize text for brevity. for every major subdivision, include its text in full, unabridged.
if the text doesn't contain explicit chapter headings, do your best to break it into roughly chapter-like sections.
ignore disclaimers, licensing boilerplate, or table-of-contents duplication if they appear outside the main body.
but if disclaimers or licensing text are obviously embedded in the actual content (rare but possible), you must preserve them.
no disclaimers or partial text unless they are truly part of the main body.
output strictly valid json with an array of objects in the form:
[
  {
    "title": "some heading here",
    "content": "the full text of that section"
  },
  ...
]
no extra properties, no additional keys. no markdown fences or triple-backticks around the json.
return every line of the main text. do not omit anything with phrases like "(omitted)" or "(content omitted)"—just provide the full text in each section.
`;

   // user prompt is the entire text
   const userPrompt = `please identify the main subdivisions (chapters, acts, etc.) in this text, returning them in the required JSON format:
"""
${text}
"""`;

   // create openrouter client for gemini-pro
   const client = createOpenRouterClient(openrouterApiKey);

   // here's the critical structured output usage:
   const response = await client.chat.completions.create({
      model: "google/gemini-pro-1.5",
      messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt },
      ],
      temperature: 0.2,

      // the structured output:
      response_format: {
         type: "json_schema",
         json_schema: {
            name: "sections",
            strict: true,
            // the schema expects an array of { title, content }
            schema: {
               type: "array",
               items: {
                  type: "object",
                  properties: {
                     title: {
                        type: "string",
                        description: "The heading/title for this subdivision (e.g. 'chapter 1')"
                     },
                     content: {
                        type: "string",
                        description: "The full text for this subdivision, with no omissions"
                     }
                  },
                  required: ["title", "content"],
                  additionalProperties: false
               }
            }
         }
      },
   });

   const content = response.choices[0]?.message?.content;
   if (!content) {
      throw new Error("gemini-pro returned no content in structured output call.");
   }

   let sections: BookSection[] = [];
   try {
      sections = JSON.parse(content);
   } catch (err) {
      throw new Error(
         `failed to parse JSON from gemini-pro output: ${err}\nmodel output was:\n${content}`
      );
   }

   // quick sanity check
   if (!Array.isArray(sections)) {
      throw new Error(
         `expected an array of sections, but got something else. raw output:\n${content}`
      );
   }

   return sections;
}
