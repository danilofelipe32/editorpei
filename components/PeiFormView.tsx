import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fieldOrderForPreview, disciplineOptions } from '../constants.tsx';
import { TextAreaWithActions } from './TextAreaWithActions.tsx';
import { callGenerativeAI } from '../services/geminiService.ts';
import { savePei, getPeiById, getAllRagFiles, addActivitiesToBank } from '../services/storageService.ts';
import { Modal } from './Modal.tsx';

const helpTexts = {
    'id-diagnostico': 'Descreva o diagnóstico do aluno (se houver) e as necessidades educacionais específicas decorrentes dele. Ex: TDAH, Dislexia, TEA.',
    'id-contexto': 'Apresente um breve resumo do contexto familiar e da trajetória escolar do aluno. Fatores relevantes podem incluir apoio familiar, mudanças de escola, etc.',
    'aval-habilidades': 'Detalhe as competências e dificuldades do aluno em áreas acadêmicas como leitura, escrita e matemática. Use exemplos concretos.',
    'aval-social': 'Descreva como o aluno interage com colegas e professores, seu comportamento em sala e habilidades de comunicação.',
    'aval-coord': 'Aborde aspectos da coordenação motora fina e grossa, bem como a autonomia do aluno em atividades diárias e escolares.',
    'metas-curto': "Defina um objetivo específico e alcançável para os próximos 3 meses. Ex: 'Ler e interpretar frases simples com 80% de precisão'.",
    'metas-medio': 'Estabeleça uma meta para os próximos 6 meses, que represente um avanço em relação à meta de curto prazo.',
    'metas-longo': 'Descreva o objetivo principal a ser alcançado ao final do ano letivo. Deve ser uma meta ampla e significativa.',
    'est-adaptacoes': 'Liste as adaptações necessárias em materiais, avaliações e no ambiente para facilitar o aprendizado. Ex: Provas com fonte ampliada, tempo extra.',
    'est-metodologias': 'Descreva as abordagens pedagógicas que serão utilizadas. Ex: Aulas expositivas com apoio visual, aprendizado baseado em projetos, gamificação.',
    'est-parcerias': 'Indique como será a colaboração com a família, terapeutas e outros profissionais que acompanham o aluno.',
    'resp-regente': 'Descreva as responsabilidades do professor regente na implementação e acompanhamento do PEI.',
    'resp-coord': 'Detalhe o papel do coordenador pedagógico, como supervisão, apoio ao professor e articulação com a família.',
    'resp-familia': 'Especifique como a família participará do processo, apoiando as atividades em casa e mantendo a comunicação com a escola.',
    'resp-apoio': 'Liste outros profissionais (psicólogos, fonoaudiólogos, etc.) e suas respectivas atribuições no plano.',
    'revisao': 'Defina a periodicidade (ex: bimestral, trimestral) e os critérios que serão usados para avaliar o progresso do aluno e a necessidade de ajustes no plano.',
    'revisao-ajustes': 'Resuma as principais modificações feitas no PEI desde a última revisão. Ex: "A meta de curto prazo foi ajustada para focar na interpretação de textos", "Novas estratégias visuais foram incorporadas".',
    'atividades-content': 'Use a IA para sugerir atividades com base nas metas ou descreva suas próprias propostas de atividades adaptadas.',
    'dua-content': 'Descreva como os princípios do Desenho Universal para a Aprendizagem (DUA) serão aplicados para remover barreiras e promover a inclusão.'
};

const requiredFields = [
    ...fieldOrderForPreview.find(s => s.title.startsWith("1."))!.fields.map(f => f.id),
    ...fieldOrderForPreview.find(s => s.title.startsWith("2."))!.fields.map(f => f.id)
];

export const PeiFormView = ({ editingPeiId, onSaveSuccess }) => {
    const [currentPeiId, setCurrentPeiId] = useState(editingPeiId);
    const [peiData, setPeiData] = useState({});
    const [loadingStates, setLoadingStates] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', content: null, footer: null });
    
    const [isGeneratingFullPei, setIsGeneratingFullPei] = useState(false);
    const [isFullPeiModalOpen, setIsFullPeiModalOpen] = useState(false);
    const [fullPeiContent, setFullPeiContent] = useState('');

    const [aiGeneratedFields, setAiGeneratedFields] = useState(new Set());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editModalData, setEditModalData] = useState(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [smartAnalysisResults, setSmartAnalysisResults] = useState({});
    const [openSmartAnalysis, setOpenSmartAnalysis] = useState({});
    const [errors, setErrors] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState('ocioso'); // 'ocioso', 'salvando', 'salvo'

    // Auto-save logic
    const autoSaveDataRef = useRef({ peiData, aiGeneratedFields, smartAnalysisResults, currentPeiId });

    useEffect(() => {
        autoSaveDataRef.current = { peiData, aiGeneratedFields, smartAnalysisResults, currentPeiId };
    }, [peiData, aiGeneratedFields, smartAnalysisResults, currentPeiId]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const {
                peiData: currentPeiData,
                aiGeneratedFields: currentAiFields,
                smartAnalysisResults: currentSmartResults,
                currentPeiId: currentId,
            } = autoSaveDataRef.current;
            
            const studentName = currentPeiData['aluno-nome']?.trim();

            if (studentName) {
                setAutoSaveStatus('salvando');
                const recordData = {
                    data: currentPeiData,
                    aiGeneratedFields: Array.from(currentAiFields),
                    smartAnalysisResults: currentSmartResults,
                };
                
                const savedRecord = savePei(recordData, currentId, studentName);
                
                if (!currentId && savedRecord.id) {
                    setCurrentPeiId(savedRecord.id);
                }

                setTimeout(() => {
                    setAutoSaveStatus('salvo');
                    setTimeout(() => setAutoSaveStatus('ocioso'), 2000);
                }, 500);
            }
        }, 5000); // 5 seconds

        return () => clearInterval(intervalId);
    }, []); // Run only once on mount

    useEffect(() => {
        if (editingPeiId) {
            const peiToLoad = getPeiById(editingPeiId);
            if (peiToLoad) {
                setCurrentPeiId(peiToLoad.id);
                setPeiData(peiToLoad.data);
                setAiGeneratedFields(new Set(peiToLoad.aiGeneratedFields || []));
                setSmartAnalysisResults(peiToLoad.smartAnalysisResults || {});
                setOpenSmartAnalysis({});
            }
        } else {
            handleClearForm();
        }
    }, [editingPeiId]);


    const areRequiredFieldsFilled = useMemo(() => {
        return requiredFields.every(fieldId => peiData[fieldId]?.trim());
    }, [peiData]);

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;
        for (const fieldId of requiredFields) {
            if (!peiData[fieldId]?.trim()) {
                newErrors[fieldId] = 'Este campo é obrigatório.';
                isValid = false;
            }
        }
        setErrors(newErrors);
        if (!isValid) {
            const firstErrorField = document.getElementById(Object.keys(newErrors)[0]);
            firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert('Por favor, preencha todos os campos obrigatórios destacados.');
        }
        return isValid;
    };

    const handleInputChange = useCallback((e) => {
        const { id, value } = e.target;
        setPeiData(prev => ({ ...prev, [id]: value }));
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    }, [errors]);

    const handleTextAreaChange = useCallback((id, value) => {
        setPeiData(prev => ({ ...prev, [id]: value }));
        setAiGeneratedFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    }, [errors]);
    
    const buildAiContext = (fieldIdToExclude) => {
        // RAG Context from selected files
        const allRagFiles = getAllRagFiles();
        const selectedFiles = allRagFiles.filter(f => f.selected);
        let ragContext = '';
        if (selectedFiles.length > 0) {
            ragContext = '--- INÍCIO DOS FICHEIROS DE APOIO ---\n\n' +
                selectedFiles.map(f => `Ficheiro: ${f.name}\nConteúdo:\n${f.content}\n\n`).join('') +
                '--- FIM DOS FICHEIROS DE APOIO ---\n\n';
        }

        // Chain of Thought (CoT) Context from current form
        const formContext = '--- INÍCIO DO CONTEXTO DO PEI ATUAL ---\n\n' +
            fieldOrderForPreview
                .flatMap(section => section.fields)
                .map(field => {
                    const value = peiData[field.id];
                    return value && field.id !== fieldIdToExclude ? `${field.label}: ${value}` : null;
                })
                .filter(Boolean)
                .join('\n') +
            '\n--- FIM DO CONTEXTO DO PEI ATUAL ---\n\n';

        return { ragContext, formContext };
    };

    const handleActionClick = async (fieldId, action) => {
        if (action === 'ai' && !areRequiredFieldsFilled) {
            validateForm();
            return;
        }

        setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: true }));
        try {
            const { ragContext, formContext } = buildAiContext(fieldId);
            let response = '';
            
            // This is a minimal context for actions that don't need the full form, like SMART analysis.
            const studentInfoForSimpleActions = `
                Aluno: ${peiData['aluno-nome'] || 'Não informado'}
                Diagnóstico: ${peiData['id-diagnostico'] || 'Não informado'}
            `;
    
            switch (action) {
                case 'ai':
                    const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                    const aiPrompt = `Aja como um especialista em educação inclusiva. Sua tarefa é preencher o campo "${fieldLabel}" de um Plano Educacional Individualizado (PEI).
                    
Para garantir coesão e coerência (Chain of Thought), analise CUIDADOSAMENTE os ficheiros de apoio (se houver) e os campos já preenchidos do PEI antes de gerar sua resposta.

${ragContext}
${formContext}
                    
Agora, com base em TODO o contexto fornecido, gere o conteúdo para o campo: "${fieldLabel}".
Sua resposta deve ser apenas o texto para este campo, sem introduções ou títulos.`;

                    response = await callGenerativeAI(aiPrompt);
                    setPeiData(prev => ({ ...prev, [fieldId]: response }));
                    setAiGeneratedFields(prev => new Set(prev).add(fieldId));
                    break;
                    
                case 'smart':
                    const goalText = peiData[fieldId] || '';
                    if (!goalText) {
                        alert('Por favor, preencha o campo da meta antes de solicitar a análise SMART.');
                        return;
                    }
                    const smartPrompt = `Analise a seguinte meta de um PEI com base nos critérios SMART (Específica, Mensurável, Atingível, Relevante, Temporal). Forneça uma crítica construtiva e uma sugestão de melhoria para cada critério.
    
Meta para Análise: "${goalText}"

Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto adicional antes ou depois. Use a seguinte estrutura:
{
  "isSpecific": { "critique": "...", "suggestion": "..." },
  "isMeasurable": { "critique": "...", "suggestion": "..." },
  "isAchievable": { "critique": "...", "suggestion": "..." },
  "isRelevant": { "critique": "...", "suggestion": "..." },
  "isTimeBound": { "critique": "...", "suggestion": "..." }
}`;
                    response = await callGenerativeAI(smartPrompt);
                    try {
                        const startIndex = response.indexOf('{');
                        const endIndex = response.lastIndexOf('}');
                        if (startIndex === -1 || endIndex === -1) {
                            throw new Error("Valid JSON object not found in response.");
                        }
                        const jsonString = response.substring(startIndex, endIndex + 1);
                        const analysis = JSON.parse(jsonString);
                        setSmartAnalysisResults(prev => ({ ...prev, [fieldId]: analysis }));
                        setOpenSmartAnalysis(prev => ({ ...prev, [fieldId]: true }));
                    } catch (e) {
                        console.error("Failed to parse SMART analysis JSON:", e, "Raw response:", response);
                        alert("A IA retornou uma resposta em um formato inesperado para a análise SMART. Por favor, tente novamente.");
                    }
                    break;
    
                case 'suggest':
                    const goalForActivities = peiData[fieldId] || '';
                    if (!goalForActivities) {
                        alert('Por favor, preencha o campo da meta antes de solicitar sugestões de atividades.');
                        return;
                    }
                    const suggestPrompt = `Com base na seguinte meta de um PEI e nas informações do aluno, sugira 3 a 5 atividades educacionais adaptadas.
                    
Informações do Aluno:
${studentInfoForSimpleActions}

Meta: "${goalForActivities}"

Sua resposta DEVE ser um array de objetos JSON válido, sem nenhum texto adicional antes ou depois. Use a seguinte estrutura:
[
  {
    "title": "...",
    "description": "...",
    "discipline": "...",
    "skills": ["...", "..."],
    "needs": ["...", "..."],
    "goalTags": ["..."]
  }
]`;
                    response = await callGenerativeAI(suggestPrompt);
                    try {
                        const startIndex = response.indexOf('[');
                        const endIndex = response.lastIndexOf(']');
                        if (startIndex === -1 || endIndex === -1) {
                            throw new Error("Valid JSON array not found in response.");
                        }
                        const jsonString = response.substring(startIndex, endIndex + 1);
                        const activities = JSON.parse(jsonString);

                        if (!Array.isArray(activities)) {
                            throw new Error("Response is not an array.");
                        }

                        const handleSaveActivities = () => {
                            addActivitiesToBank(activities, currentPeiId);
                            alert(`${activities.length} atividades foram salvas com sucesso no Banco de Atividades!`);
                            setIsModalOpen(false);
                        };

                        setModalContent({
                            title: `Atividades Sugeridas para "${fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label}"`,
                            content: renderSuggestedActivities(activities),
                            footer: (
                                <>
                                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                                        Fechar
                                    </button>
                                    <button onClick={handleSaveActivities} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                        <i className="fa-solid fa-plus"></i> Adicionar ao Banco
                                    </button>
                                </>
                            )
                        });
                        setIsModalOpen(true);
                    } catch(e) {
                        console.error("Failed to parse suggested activities JSON:", e, "Raw response:", response);
                        alert("A IA retornou uma resposta em um formato inesperado para as sugestões de atividades. Por favor, tente novamente.");
                    }
                    break;
            }
    
        } catch (error) {
            console.error(`Error during '${action}' action for '${fieldId}':`, error);
            const errorMessage = error instanceof Error ? error.message : "Verifique o console para mais detalhes.";
            alert(`Ocorreu um erro ao executar a ação de IA. ${errorMessage}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [`${fieldId}-${action}`]: false }));
        }
    };

    const handleGenerateFullPei = async () => {
        if (!validateForm()) {
            return;
        }

        setIsGeneratingFullPei(true);
        setFullPeiContent('');

        try {
            const { ragContext, formContext } = buildAiContext('');

            const prompt = `
                Aja como um especialista em educação especial e psicopedagogia.
                Com base nos dados de ficheiros de apoio e do formulário, elabore um Plano Educacional Individualizado (PEI) completo, coeso e profissional.
                O documento final deve ser bem estruturado, com parágrafos claros e uma linguagem técnica, mas compreensível.
                Conecte as diferentes seções de forma lógica (ex: as metas devem refletir o diagnóstico e a avaliação, e as atividades devem estar alinhadas às metas).
                Se houver campos não preenchidos, use seu conhecimento para fazer inferências razoáveis.
                O tom deve ser formal e respeitoso.

                ${ragContext}
                ${formContext}

                Elabore o PEI completo a seguir.
            `;

            const response = await callGenerativeAI(prompt);
            setFullPeiContent(response);
            setIsFullPeiModalOpen(true);

        } catch (error) {
            console.error('Error generating full PEI:', error);
            alert('Ocorreu um erro ao gerar o PEI completo. Tente novamente.');
        } finally {
            setIsGeneratingFullPei(false);
        }
    };
    
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditModalData(null);
        setRefinementInstruction('');
    };

    const handleEditModalRegenerate = async () => {
        if (!editModalData) return;
        setIsRegenerating(true);
        try {
            const { fieldId, label, text } = editModalData;
            const instruction = refinementInstruction || 'Por favor, refine e aprimore este texto.';
            const { ragContext, formContext } = buildAiContext(fieldId);

            const prompt = `Aja como um especialista em educação. O usuário está editando o campo "${label}" de um PEI.
            
            Texto Atual:
            ---
            ${text}
            ---

            O usuário forneceu a seguinte instrução para refinar o texto: "${instruction}".

            Considere também o seguinte contexto de documentos de apoio e do restante do PEI para manter a coerência:
            ${ragContext}
            ${formContext}

            Refine o texto atual com base na instrução e no contexto. Mantenha o propósito original, mas aprimore a clareza e a estrutura. Devolva apenas o texto aprimorado.`;

            const response = await callGenerativeAI(prompt);
            setEditModalData(prev => prev ? { ...prev, text: response } : null);
            setAiGeneratedFields(prev => new Set(prev).add(fieldId));
            setRefinementInstruction(''); 
        } catch (error) {
            console.error('Error during regeneration:', error);
            alert('Ocorreu um erro ao refinar o conteúdo.');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleEditModalSave = () => {
        if (editModalData) {
            setPeiData(prev => ({ ...prev, [editModalData.fieldId]: editModalData.text }));
        }
        closeEditModal();
    };
    
    const handleClearForm = useCallback(() => {
        setPeiData({});
        setAiGeneratedFields(new Set());
        setSmartAnalysisResults({});
        setOpenSmartAnalysis({});
        setErrors({});
        setCurrentPeiId(null);
    }, []);

    const handleSavePei = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        const recordData = {
            data: peiData,
            aiGeneratedFields: Array.from(aiGeneratedFields),
            smartAnalysisResults: smartAnalysisResults,
        };

        const studentName = peiData['aluno-nome'] || 'PEI sem nome';
        const savedRecord = savePei(recordData, currentPeiId, studentName);
        setCurrentPeiId(savedRecord.id);
        
        alert('PEI salvo com sucesso!');
        onSaveSuccess();
    };

    // FIX: Typed the 'analysis' parameter to resolve property access errors.
    const renderSmartAnalysis = (analysis: Record<string, {critique: string; suggestion: string}>) => {
        const criteriaMap = {
            isSpecific: "Específica (Specific)", isMeasurable: "Mensurável (Measurable)",
            isAchievable: "Atingível (Achievable)", isRelevant: "Relevante (Relevant)", isTimeBound: "Temporal (Time-Bound)",
        };
        return (
            <div className="space-y-4 text-sm">
                {Object.entries(analysis).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800">{criteriaMap[key]}</h4>
                        <p className="text-gray-600 mt-1"><span className="font-medium">Crítica:</span> {value.critique}</p>
                        <p className="text-green-700 mt-1"><span className="font-medium">Sugestão:</span> {value.suggestion}</p>
                    </div>
                ))}
            </div>
        );
    };
    
    const renderSuggestedActivities = (activities) => {
        return (
            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        <h4 className="font-semibold text-gray-800">{activity.title}</h4>
                        <p className="text-gray-600 mt-1">{activity.description}</p>
                        <div className="mt-2 text-xs flex flex-wrap gap-x-4">
                            <p><span className="font-medium">Disciplina:</span> {activity.discipline}</p>
                            <p><span className="font-medium">Habilidades:</span> {Array.isArray(activity.skills) ? activity.skills.join(', ') : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleEditClick = (fieldId) => {
        if (aiGeneratedFields.has(fieldId)) {
            const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
            setEditModalData({
                fieldId,
                label: fieldLabel,
                text: peiData[fieldId] || '',
            });
            setIsEditModalOpen(true);
        } else {
            // FIX: Cast element to HTMLTextAreaElement to access properties like 'value' and 'selectionStart'.
            const textarea = document.getElementById(fieldId) as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            }
        }
    };
    
    const renderField = (field) => {
        const { id, label } = field;
        const hasError = !!errors[id];
        const textAreaFields = [
            'id-diagnostico', 'id-contexto', 'aval-habilidades', 'aval-social', 'aval-coord',
            'metas-curto', 'metas-medio', 'metas-longo', 'est-adaptacoes', 'est-metodologias',
            'est-parcerias', 'resp-regente', 'resp-coord', 'resp-familia', 'resp-apoio',
            'revisao', 'revisao-ajustes', 'atividades-content', 'dua-content'
        ];

        const goalFields = ['metas-curto', 'metas-medio', 'metas-longo'];

        if (textAreaFields.includes(id)) {
            return (
                <div key={id} className="md:col-span-2">
                    <TextAreaWithActions
                        id={id}
                        label={label}
                        value={peiData[id] || ''}
                        onChange={(value) => handleTextAreaChange(id, value)}
                        onAiClick={() => handleActionClick(id, 'ai')}
                        onSmartClick={goalFields.includes(id) ? () => handleActionClick(id, 'smart') : undefined}
                        onSuggestClick={goalFields.includes(id) ? () => handleActionClick(id, 'suggest') : undefined}
                        onEditClick={() => handleEditClick(id)}
                        isAiLoading={loadingStates[`${id}-ai`]}
                        isSmartLoading={loadingStates[`${id}-smart`]}
                        isSuggestLoading={loadingStates[`${id}-suggest`]}
                        isGoal={goalFields.includes(id)}
                        placeholder={`Descreva sobre "${label}" aqui...`}
                        rows={goalFields.includes(id) ? 6 : 5}
                        helpText={helpTexts[id]}
                        error={errors[id]}
                        isAiActionDisabled={!areRequiredFieldsFilled}
                    />
                    {goalFields.includes(id) && smartAnalysisResults[id] && (
                        <div className="mt-2 border border-gray-200 rounded-lg shadow-sm">
                            <button
                                type="button"
                                onClick={() => setOpenSmartAnalysis(prev => ({ ...prev, [id]: !prev[id] }))}
                                className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                aria-expanded={!!openSmartAnalysis[id]}
                                aria-controls={`smart-analysis-${id}`}
                            >
                                <span className="font-medium text-sm text-indigo-700">Resultado da Análise SMART</span>
                                <i className={`fa-solid fa-chevron-down text-gray-500 transition-transform duration-200 ${openSmartAnalysis[id] ? 'rotate-180' : ''}`}></i>
                            </button>
                            {openSmartAnalysis[id] && (
                                <div id={`smart-analysis-${id}`} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                                    {renderSmartAnalysis(smartAnalysisResults[id])}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (id === 'disciplina') {
            return (
                 <div key={id}>
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <select
                        id={id}
                        value={peiData[id] || ''}
                        onChange={handleInputChange}
                        className={`w-full p-2.5 border rounded-lg bg-gray-50 transition-all duration-200 focus:outline-none
                            ${hasError 
                                ? 'border-red-500 focus:ring-2 focus:ring-red-300 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500'
                            }`}
                    >
                        <option value="">Selecione uma disciplina...</option>
                        {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {hasError && <p className="text-red-600 text-xs mt-1">{errors[id]}</p>}
                </div>
            );
        }

        const inputType = id.includes('-nasc') || id.includes('-data-elab') || id.includes('-data') ? 'date' : 'text';
        
        return (
            <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                    type={inputType}
                    id={id}
                    value={peiData[id] || ''}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 border rounded-lg bg-gray-50 transition-all duration-200 focus:outline-none
                        ${hasError 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-300 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500'
                        }`}
                />
                {hasError && <p className="text-red-600 text-xs mt-1">{errors[id]}</p>}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            <Modal
                id="ai-results-modal"
                title={modalContent.title}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                footer={modalContent.footer}
                wide
            >
                {modalContent.content}
            </Modal>
            
            <Modal
                id="full-pei-modal"
                title="PEI Gerado por IA"
                isOpen={isFullPeiModalOpen}
                onClose={() => setIsFullPeiModalOpen(false)}
                footer={
                    <>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(fullPeiContent);
                                alert('Texto copiado para a área de transferência!');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Copiar Texto
                        </button>
                        <button
                            onClick={() => setIsFullPeiModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                            Fechar
                        </button>
                    </>
                }
                wide
            >
                <div className="prose max-w-none whitespace-pre-wrap font-serif text-gray-800 p-2 bg-gray-50 rounded-md">
                    {fullPeiContent}
                </div>
            </Modal>

            <Modal
                id="preview-pei-modal"
                title="Pré-visualização do PEI"
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                footer={
                    <button
                        onClick={() => setIsPreviewModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                        Fechar
                    </button>
                }
                wide
            >
                <div className="prose max-w-none text-gray-800">
                    {fieldOrderForPreview.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-8 last:mb-0">
                            <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">{section.title}</h2>
                            <div className="space-y-4">
                                {section.fields.map(field => {
                                    const value = peiData[field.id];
                                    return (
                                        <div key={field.id}>
                                            <h3 className="font-semibold text-gray-700">{field.label}</h3>
                                            <div className="mt-1 whitespace-pre-wrap text-gray-600 bg-gray-50 p-3 rounded-md border">
                                                {value || <span className="text-gray-400 italic">Não preenchido</span>}
                                            </div>
                                        </div>
                                    );

                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {editModalData && (
                 <Modal
                    id="edit-ai-modal"
                    title={`Editar: ${editModalData.label}`}
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    footer={
                        <>
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                             <button 
                                type="button" 
                                onClick={handleEditModalRegenerate} 
                                disabled={isRegenerating}
                                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 disabled:bg-indigo-50 flex items-center gap-2"
                            >
                                {isRegenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                        Refinando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                                        Refinar com IA
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleEditModalSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                Salvar Alterações
                            </button>
                        </>
                    }
                    wide
                >
                    <textarea
                        value={editModalData.text}
                        onChange={(e) => setEditModalData(prev => prev ? { ...prev, text: e.target.value } : null)}
                        className="w-full h-64 p-2.5 border rounded-lg transition-all duration-200 bg-gray-50 text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                        placeholder="Edite o conteúdo aqui..."
                    />
                    <div className="mt-4">
                        <label htmlFor="refinement-instruction" className="block text-sm font-medium text-gray-700 mb-1">Instrução para Refinamento (Opcional):</label>
                        <input
                            type="text"
                            id="refinement-instruction"
                            value={refinementInstruction}
                            onChange={(e) => setRefinementInstruction(e.target.value)}
                            className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            placeholder="Ex: 'Torne o texto mais formal', 'Adicione um exemplo prático', etc."
                        />
                    </div>
                </Modal>
            )}

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 tracking-tight">{editingPeiId ? 'Editando PEI' : 'Editor de PEI'}</h2>
                <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                    {editingPeiId ? `Você está editando o PEI de ${peiData['aluno-nome'] || 'aluno'}.` : 'Preencha os campos abaixo para criar um novo Plano Educacional Individualizado.'}
                </p>
            </div>

            <form onSubmit={handleSavePei}>
                {fieldOrderForPreview.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3 mb-6">{section.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {section.fields.map(field => renderField(field))}
                        </div>
                    </div>
                ))}
                <div className="flex justify-end items-center flex-wrap gap-4 mt-6">
                    <div className="text-sm text-gray-500 italic mr-auto pl-2 transition-opacity duration-500">
                        {autoSaveStatus === 'salvando' && (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                Salvando...
                            </span>
                        )}
                        {autoSaveStatus === 'salvo' && (
                            <span className="flex items-center gap-2 text-green-600 font-medium">
                                <i className="fa-solid fa-check"></i>
                                Salvo automaticamente
                            </span>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={handleGenerateFullPei} 
                        disabled={isGeneratingFullPei}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center gap-2"
                    >
                        {isGeneratingFullPei ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-file-invoice"></i>
                                Gerar PEI Completo com IA
                            </>
                        )}
                    </button>
                     <button
                        type="button"
                        onClick={() => setIsPreviewModalOpen(true)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <i className="fa-solid fa-eye"></i>
                        Pré-visualizar PEI
                    </button>
                    <button type="button" onClick={handleClearForm} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                        Limpar Formulário
                    </button>
                    <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                        Salvar PEI
                    </button>
                </div>
            </form>
        </div>
    );
};