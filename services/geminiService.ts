/**
 * Módulo para interagir com a API de IA (ApiFreeLLM).
 * Anteriormente usava a API Gemini, agora adaptado para a nova API gratuita.
 */

interface ApiFreeLLMResponse {
    status: 'success' | 'rate_limited' | 'error';
    response: string;
    error?: string;
    retry_after?: number;
}

/**
 * Chama a API de IA generativa com um prompt.
 * @param prompt O prompt a ser enviado para a IA.
 * @returns Uma promessa que resolve para a resposta de texto da IA.
 */
export const callGenerativeAI = async (prompt: string): Promise<string> => {
    const apiEndpoint = "https://apifreellm.com/api/chat";
    // A ApiFreeLLM não tem um campo de "system instruction", então o incluímos no início do prompt.
    const systemInstruction = "Você é um assistente especializado em educação, focado na criação de Planos Educacionais Individualizados (PEI). Suas respostas devem ser profissionais, bem estruturadas e direcionadas para auxiliar educadores.";
    
    const fullMessage = `${systemInstruction}\n\n---\n\n${prompt}`;

    try {
        const apiResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: fullMessage }),
        });

        // A documentação diz que a API sempre retorna HTTP 200, mas é uma boa prática verificar.
        if (!apiResponse.ok) {
            throw new Error(`A API retornou um erro HTTP inesperado: ${apiResponse.status}`);
        }

        const data: ApiFreeLLMResponse = await apiResponse.json();

        if (data.status === 'success') {
            if (!data.response) {
                throw new Error("A resposta da IA veio vazia.");
            }
            return data.response.trim();
        } else if (data.status === 'rate_limited') {
            const waitTime = data.retry_after || 5;
            throw new Error(`Limite de requisições atingido. Por favor, aguarde ${waitTime} segundos antes de tentar novamente.`);
        } else {
            // Cobre outros status de 'error'
            throw new Error(`Falha na comunicação com a IA. Detalhes: ${data.error || 'Erro desconhecido.'}`);
        }

    } catch (error) {
        console.error("AI Service Error:", error);
        if (error instanceof Error) {
             // Relança o erro específico que criamos acima ou o erro de rede.
             throw new Error(error.message);
        }
        // Fallback para erros totalmente inesperados.
        throw new Error("Ocorreu uma falha desconhecida na comunicação com a IA.");
    }
};