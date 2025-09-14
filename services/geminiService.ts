// Este serviço agora fornece uma interface genérica para chamar uma API LLM gratuita e compatível com OpenAI.
// A implementação anterior usando @google/genai foi substituída conforme solicitação do usuário.

const API_URL = 'https://api.pawan.krd/v1/chat/completions'; // Um endpoint conhecido e gratuito compatível com OpenAI.
const MODEL_NAME = 'pai-001-light'; // Usando um modelo leve, adequado para níveis gratuitos.

export const callGenerativeAI = async (prompt: string) => {
    try {
        // Usando fetch para chamar a API compatível com OpenAI.
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // A chave da API é passada no cabeçalho de Autorização.
                // Conforme as diretrizes, a chave deve vir de process.env.API_KEY.
                // O usuário deve garantir que esta variável de ambiente esteja disponível
                // no lado do cliente, por exemplo, através de uma substituição em tempo de compilação no Netlify.
                'Authorization': `Bearer ${process.env.API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Lida com respostas de erro que não são JSON.
            console.error("API Error Response:", errorData);
            const errorMessage = errorData?.error?.message || response.statusText;
            throw new Error(`A API retornou um erro: ${response.status}. ${errorMessage}`);
        }

        const data = await response.json();
        
        // Extrai o texto da resposta seguindo a estrutura padrão compatível com OpenAI.
        const text = data.choices?.[0]?.message?.content?.trim();
        
        if (!text) {
            console.error("Invalid API response structure:", data);
            throw new Error("A resposta da IA não continha o texto esperado.");
        }

        return text;

    } catch (error) {
        console.error("AI Service Error:", error);
        if (error instanceof Error) {
             throw new Error(`Falha na comunicação com a IA. ${error.message}`);
        }
        throw new Error("Falha na comunicação com a IA. Verifique sua conexão e a configuração da chave de API.");
    }
};
