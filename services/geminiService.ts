// Este serviço agora fornece uma interface genérica para chamar a API ApiFreeLMM.
// A implementação anterior foi substituída conforme a nova documentação.

const API_URL = 'https://apifreellm.com/api/chat'; // Endpoint da ApiFreeLMM.

export const callGenerativeAI = async (prompt: string) => {
    try {
        // Usando fetch para chamar a API ApiFreeLMM.
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: prompt
            })
        });

        // A API sempre retorna HTTP 200, então verificamos a resposta JSON para o status.
        if (!response.ok) {
            // Este bloco lida com erros de rede, não com erros da API.
            throw new Error(`Erro de rede: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            const text = data.response?.trim();
            if (!text) {
                console.error("Invalid API response structure:", data);
                throw new Error("A resposta da IA veio vazia, embora o status seja de sucesso.");
            }
            return text;
        } else {
            // Lida com erros da API, como 'rate_limited' ou 'error'.
            const errorMessage = data.error || 'Erro desconhecido da API.';
            console.error("API Error Response:", data);
            throw new Error(`A API retornou um erro: ${errorMessage}`);
        }

    } catch (error) {
        console.error("AI Service Error:", error);
        if (error instanceof Error) {
             throw new Error(`Falha na comunicação com a IA. ${error.message}`);
        }
        throw new Error("Ocorreu uma falha desconhecida na comunicação com a IA.");
    }
};
