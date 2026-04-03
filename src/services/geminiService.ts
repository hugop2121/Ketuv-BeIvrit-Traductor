import { GoogleGenAI, Type } from "@google/genai";
import { VerseData, WordAnalysis } from "./types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getVerseAnalysis(book: string, chapter: number, verse: number): Promise<VerseData> {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Actúa como un experto en hebreo bíblico y lingüística semítica. 
  Proporciona el texto original, análisis morfosintáctico detallado y sugerencias de traducción para el siguiente versículo de la Torah:
  Libro: ${book}
  Capítulo: ${chapter}
  Versículo: ${verse}

  El análisis de cada palabra debe incluir: raíz (shoresh), forma léxica, categoría gramatical, morfología detallada (tiempo, modo, aspecto para verbos; género, número, estado para sustantivos), función sintáctica, transliteración y pronunciación.
  
  También proporciona una traducción sugerida al español y una breve explicación de las decisiones de traducción.`;

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hebrewText: { type: Type.STRING },
          words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                root: { type: Type.STRING },
                lexicalForm: { type: Type.STRING },
                category: { type: Type.STRING },
                morphology: { type: Type.STRING },
                function: { type: Type.STRING },
                transliteration: { type: Type.STRING },
                pronunciation: { type: Type.STRING },
              },
              required: ["word", "root", "lexicalForm", "category", "morphology", "function", "transliteration", "pronunciation"]
            }
          },
          aiTranslation: { type: Type.STRING },
          aiExplanation: { type: Type.STRING }
        },
        required: ["hebrewText", "words", "aiTranslation", "aiExplanation"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    book,
    chapter,
    verse,
    ...data
  };
}

export async function searchBible(query: string): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Busca en la Torah (Hebreo Bíblico) información sobre: "${query}". 
  Devuelve una lista de versículos relevantes con su referencia (Libro Capítulo:Versículo) y una breve explicación de por qué son relevantes.`;

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "No se encontraron resultados.";
}
