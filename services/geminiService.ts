import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// A chave da API é gerenciada pelo ambiente de execução, conforme as diretrizes.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const callGenerativeAI = async (prompt: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "Você é um assistente especializado em educação, focado na criação de Planos Educacionais Individualizados (PEI). Suas respostas devem ser profissionais, bem estruturadas e direcionadas para auxiliar educadores.",
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("A resposta da IA veio vazia.");
        }
        return text.trim();

    } catch (error) {
        console.error("AI Service Error:", error);
        if (error instanceof Error) {
             if (error.message.includes('API key not valid')) {
                 throw new Error("A chave da API não é válida. Verifique a configuração do ambiente.");
             }
             throw new Error(`Falha na comunicação com a IA. Detalhes: ${error.message}`);
        }
        throw new Error("Ocorreu uma falha desconhecida na comunicação com a IA.");
    }
};
