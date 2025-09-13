import { GoogleGenAI } from "@google/genai";

// As per guidelines, initialize the GoogleGenAI client with an API key from environment variables.
// This instance will be reused for all AI calls.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const callGenerativeAI = async (prompt: string) => {
    try {
        // Use the official SDK's `generateContent` method with the recommended model for text tasks.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // As per guidelines, extract the text directly from the `response.text` property.
        return response.text.trim();

    } catch (error) {
        console.error("Google GenAI Error:", error);
        // Provide a user-friendly error message while logging the technical details.
        if (error instanceof Error) {
             throw new Error(`Falha na comunicação com a IA. ${error.message}`);
        }
        throw new Error("Falha na comunicação com a IA. Verifique sua conexão e a configuração da chave de API.");
    }
};
