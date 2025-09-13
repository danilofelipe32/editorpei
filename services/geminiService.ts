import { Activity } from "../types";

const API_URL = "https://apifreellm.com/api/chat";

export const callGenerativeAI = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: prompt }),
        });

        if (!response.ok) {
            // This handles network errors, not API logic errors since API always returns 200.
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            if (data.response) {
                return data.response.trim();
            } else {
                throw new Error("A IA não retornou uma resposta válida.");
            }
        } else if (data.status === 'rate_limited') {
            throw new Error(`Limite de requisições atingido. Por favor, aguarde ${data.retry_after || 5} segundos antes de tentar novamente.`);
        } else {
            throw new Error(`Erro da API: ${data.error || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error("ApiFreeLLM Error:", error);
        if (error instanceof Error) {
             throw new Error(`Falha na comunicação com a IA. ${error.message}`);
        }
        throw new Error("Falha na comunicação com a IA. Verifique sua conexão.");
    }
};