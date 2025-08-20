// src/chunk.ts
export const DEFAULT_CHUNK_SIZE = 10000

export function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE): string[] {
   console.log("chunking text, maxSize:", maxSize)

   // first, attempt to split by double newlines => paragraphs
   let paragraphs = fullText.split("\n\n")
   // if there's only one piece, fallback to splitting by single newlines instead
   if (paragraphs.length < 2) {
      paragraphs = fullText.split("\n")
   }

   console.log("paragraphs:", paragraphs.length)

   const chunks: string[] = []
   let current: string[] = []
   let currentSize = 0

   for (const para of paragraphs) {
      // if the entire paragraph is bigger than maxSize, fallback to splitting by single lines
      if (para.length > maxSize) {
         const lines = para.split("\n")

         // chunk each line the same way we chunk paragraphs
         for (const line of lines) {
            const sizeWithBuffer = line.length + 2 // +2 for spacing/newlines
            if (currentSize + sizeWithBuffer > maxSize) {
               // finalize the current chunk
               if (current.length) {
                  chunks.push(current.join("\n\n"))
               }
               current = [line]
               currentSize = sizeWithBuffer
            } else {
               current.push(line)
               currentSize += sizeWithBuffer
            }
         }
      } else {
         // original paragraph-chunking logic
         const sizeWithBuffer = para.length + 2
         if (currentSize + sizeWithBuffer > maxSize) {
            chunks.push(current.join("\n\n"))
            current = [para]
            currentSize = sizeWithBuffer
         } else {
            current.push(para)
            currentSize += sizeWithBuffer
         }
      }
   }

   // leftover in current
   if (current.length) {
      chunks.push(current.join("\n\n"))
   }

   return chunks
}
