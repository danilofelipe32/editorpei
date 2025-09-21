// FIX: Polyfill 'process' for browser environment to prevent crash from process.env.API_KEY access.
// This allows the app to load, although AI features will require a valid API key to be set.
if (typeof window.process === 'undefined') {
  // @ts-ignore
  window.process = { env: { API_KEY: '' } };
}

// FIX: Add necessary imports for React, ReactDOM, Zustand, and Google GenAI to resolve undefined errors across the application.
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { create } from 'zustand';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- MERGED FROM types.ts ---
type ViewType = 'pei-form-view' | 'activity-bank-view' | 'pei-list-view' | 'files-view' | 'privacy-policy-view';

interface PeiFormField {
    id: string;
    label: string;
}

interface PeiFormSection {
    title: string;
    fields: PeiFormField[];
}

interface PeiData {
    [key: string]: string;
}

interface PeiRecord {
    id: string;
    alunoNome: string;
    data: PeiData;
    timestamp: string;
    aiGeneratedFields?: string[];
    smartAnalysisResults?: Record<string, any | null>;
    suggestedGoalActivities?: Record<string, { text: string; activities: Activity[] }>;
    suggestedGoalActivitiesState?: Record<string, boolean>;
}

type NewPeiRecordData = Omit<PeiRecord, 'id' | 'timestamp' | 'alunoNome'>;

interface RagFile {
    name: string;
    content: string;
    selected: boolean;
}

interface Activity {
    id: string;
    title: string;
    description: string;
    discipline: string;
    skills: string[];
    needs: string[];
    goalTags: string[];
    isFavorited: boolean;
    rating: 'like' | 'dislike' | null;
    comments: string;
    sourcePeiId: string | null;
    isDUA?: boolean;
}


// --- MERGED FROM constants.tsx ---
const BrainIcon = () => <i className="fa-solid fa-brain"></i>;
const EditorIcon = () => <i className="fa-solid fa-file-lines"></i>;
const ActivityIcon = () => <i className="fa-solid fa-lightbulb"></i>;
const ArchiveIcon = () => <i className="fa-solid fa-box-archive"></i>;
const PaperclipIcon = () => <i className="fa-solid fa-paperclip"></i>;
const ShieldIcon = () => <i className="fa-solid fa-shield-halved"></i>;

const disciplineOptions = [
    "Língua Portuguesa", "Matemática", "História", "Geografia", "Ciências", "Artes", "Educação Física", "Inglês",
    "Filosofia", "Sociologia", "Química", "Física", "Biologia"
];

const fieldOrderForPreview = [
    { title: "1. Identificação do Estudante", fields: [
        { id: 'aluno-nome', label: 'Aluno' }, { id: 'aluno-nasc', label: 'Data de Nascimento' },
        { id: 'aluno-ano', label: 'Ano Escolar' }, { id: 'aluno-escola', label: 'Escola' },
        { id: 'aluno-prof', label: 'Professores do PEI' }, { id: 'aluno-data-elab', label: 'Data de Elaboração' },
        { id: 'disciplina', label: 'Disciplina' },
        { id: 'conteudos-bimestre', label: 'Conteúdos do bimestre' },
        { id: 'restricoes-evitar', label: 'Estratégias a evitar (Restrições)' },
        { id: 'id-diagnostico', label: 'Diagnóstico e Necessidades Específicas' }, { id: 'id-contexto', label: 'Contexto Familiar e Escolar' }
    ]},
    { title: "2. Avaliação Inicial", fields: [
        { id: 'aval-habilidades', label: 'Habilidades Acadêmicas' }, { id: 'aval-social', label: 'Aspectos Sociais e Comportamentais' },
        { id: 'aval-coord', label: 'Coordenação Motora e Autonomia' }
    ]},
    { title: "3. Metas e Objetivos", fields: [
        { id: 'metas-curto', label: 'Curto Prazo (3 meses)' }, { id: 'metas-medio', label: 'Médio Prazo (6 meses)' },
        { id: 'metas-longo', label: 'Longo Prazo (1 ano)' }
    ]},
    { title: "4. Recursos e Estratégias", fields: [
        { id: 'est-adaptacoes', label: 'Adaptações Curriculares' }, { id: 'est-metodologias', label: 'Metodologias e Estratégias' },
        { id: 'est-parcerias', label: 'Parcerias e Acompanhamento' }
    ]},
    { title: "5. Responsáveis pela Implementação", fields: [
        { id: 'resp-regente', label: 'Professor(a) Regente' }, { id: 'resp-coord', label: 'Coordenador(a) Pedagógico(a)' },
        { id: 'resp-familia', label: 'Família' }, { id: 'resp-apoio', label: 'Profissionais de Apoio' }
    ]},
    { title: "6. Revisão do PEI", fields: [
        { id: 'revisao-data', label: 'Data da Última Revisão' },
        { id: 'revisao', label: 'Frequência e Critérios de Revisão' },
        { id: 'revisao-ajustes', label: 'Ajustes Realizados' }
    ]},
    { title: "7. Atividades Adaptadas", fields: [
        { id: 'atividades-content', label: 'Atividades Sugeridas' }
    ]},
    { title: "8. Desenho Universal para a Aprendizagem (DUA)", fields: [
        { id: 'dua-content', label: 'Atividades baseadas no DUA' }
    ]}
];

const labelToIdMap = fieldOrderForPreview.flatMap(s => s.fields).reduce((acc, field) => {
    acc[field.label] = field.id;
    return acc;
}, {});


// --- MERGED FROM services/geminiService.ts ---
// FIX: Use process.env.API_KEY as per the guidelines instead of a hardcoded key.
const geminiAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

const callGenerativeAI = async (prompt: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await geminiAi.models.generateContent({
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

// --- MERGED FROM services/storageService.ts ---
const PEI_STORAGE_KEY = 'peiRecords';
const RAG_FILES_KEY = 'ragFiles';
const ACTIVITY_BANK_KEY = 'activityBank';

const getAllPeis = () => {
    try {
        const recordsJson = localStorage.getItem(PEI_STORAGE_KEY);
        if (recordsJson) {
            const records = JSON.parse(recordsJson);
            return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
    } catch (error) {
        console.error("Failed to parse PEIs from localStorage", error);
    }
    return [];
};

const getPeiById = (id) => {
    const allPeis = getAllPeis();
    return allPeis.find(pei => pei.id === id);
};

const savePei = (recordData, id, studentName) => {
    const allPeis = getAllPeis();

    if (id) {
        const peiIndex = allPeis.findIndex(p => p.id === id);
        if (peiIndex > -1) {
            const updatedPei = {
                ...allPeis[peiIndex],
                ...recordData,
                alunoNome: studentName,
                timestamp: new Date().toISOString()
            };
            allPeis[peiIndex] = updatedPei;
            localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(allPeis));
            return updatedPei;
        }
    }

    const newPei = {
        ...recordData,
        id: crypto.randomUUID(),
        alunoNome: studentName,
        timestamp: new Date().toISOString()
    };
    const updatedList = [...allPeis, newPei];
    localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(updatedList));
    return newPei;
};

const deletePei = (id) => {
    const allPeis = getAllPeis();
    const updatedList = allPeis.filter(p => p.id !== id);
    localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(updatedList));
};

const getAllRagFiles = () => {
    try {
        const filesJson = localStorage.getItem(RAG_FILES_KEY);
        return filesJson ? JSON.parse(filesJson) : [];
    } catch (error) {
        console.error("Failed to parse RAG files from localStorage", error);
        return [];
    }
};

const saveRagFiles = (files) => {
    try {
        const filesJson = JSON.stringify(files);
        localStorage.setItem(RAG_FILES_KEY, filesJson);
    } catch (error) {
        console.error("Failed to save RAG files to localStorage", error);
    }
};

const getAllActivities = () => {
    try {
        const activitiesJson = localStorage.getItem(ACTIVITY_BANK_KEY);
        return activitiesJson ? JSON.parse(activitiesJson) : [];
    } catch (error) {
        console.error("Failed to parse Activities from localStorage", error);
        return [];
    }
};

const saveActivities = (activities) => {
    try {
        localStorage.setItem(ACTIVITY_BANK_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error("Failed to save Activities to localStorage", error);
    }
};

const addActivitiesToBank = (generatedActivities, sourcePeiId) => {
    const existingActivities = getAllActivities();
    const newActivities = generatedActivities.map(act => ({
        ...act,
        id: crypto.randomUUID(),
        isFavorited: false,
        rating: null,
        comments: '',
        sourcePeiId: sourcePeiId,
    }));
    const updatedActivities = [...existingActivities, ...newActivities];
    saveActivities(updatedActivities);
};

const addActivityToPei = (peiId, activity) => {
    const pei = getPeiById(peiId);
    if (pei) {
        const currentActivitiesText = pei.data['atividades-content'] || '';
        const newActivityText = `\n\n--- Atividade Adicionada do Banco ---\n\nTítulo: ${activity.title}\nDescrição: ${activity.description}\n-----------------------------------\n`;
        
        pei.data['atividades-content'] = (currentActivitiesText + newActivityText).trim();
        
        const { id, timestamp, alunoNome, ...recordData } = pei;
        return savePei(recordData, id, alunoNome);
    }
    return undefined;
};


// --- MERGED FROM store.ts ---
interface AppState {
  currentView: ViewType;
  editingPeiId: string | null;
  navigateToView: (view: ViewType) => void;
  navigateToEditPei: (peiId: string) => void;
  navigateToNewPei: () => void;
}

const getInitialView = (): ViewType => {
    const params = new URLSearchParams(window.location.search);
    const viewFromUrl = params.get('view') as ViewType;
    const validViews: ViewType[] = ['pei-form-view', 'activity-bank-view', 'pei-list-view', 'files-view', 'privacy-policy-view'];
    
    if (viewFromUrl && validViews.includes(viewFromUrl)) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return viewFromUrl;
    }
    return 'pei-form-view';
};

const useAppStore = create<AppState>((set) => ({
  currentView: getInitialView(),
  editingPeiId: null,
  navigateToView: (view) => set({ 
      currentView: view, 
      editingPeiId: view === 'pei-form-view' ? null : undefined 
  }),
  navigateToEditPei: (peiId) => set({ 
      currentView: 'pei-form-view', 
      editingPeiId: peiId 
  }),
  navigateToNewPei: () => set({ 
      currentView: 'pei-form-view', 
      editingPeiId: null 
  }),
}));


// --- MERGED FROM components/Modal.tsx ---
const Modal = ({ id, title, isOpen, onClose, children, footer, wide = false }) => {
  if (!isOpen) return null;

  return (
    <div
      id={id}
      className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-xl'} animate-slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
        <div className="flex justify-end flex-wrap gap-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          {footer}
        </div>
      </div>
    </div>
  );
};


// --- MERGED FROM components/TextAreaWithActions.tsx ---
const TextAreaWithActions = ({
  id,
  label,
  rows = 4,
  placeholder = "",
  value,
  onChange,
  onAiClick,
  onSmartClick,
  onSuggestClick,
  onEditClick,
  isAiLoading = false,
  isSmartLoading = false,
  isSuggestLoading = false,
  isGoal = false,
  helpText,
  error,
  isAiActionDisabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  return (
    <div className="mb-4">
      <div className="flex items-center mb-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        {helpText && (
          <div className="relative group ml-2">
            <i className="fa-regular fa-circle-question text-gray-400 cursor-help"></i>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 transform">
              {helpText}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full p-2.5 pr-12 border rounded-lg transition-all duration-200 bg-gray-50 text-gray-800
            focus:outline-none focus:ring-2
            ${hasError 
                ? 'border-red-500 focus:ring-red-300 focus:border-red-500'
                : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-500'
            }
            ${isFocused && (hasError ? 'ring-2 ring-red-200' : 'ring-2 ring-indigo-200')}
          `}
        />
        <div className="absolute top-2.5 right-2 flex flex-col space-y-1">
            {onAiClick && (
                <button
                  type="button"
                  disabled={isAiLoading || isAiActionDisabled}
                  onClick={onAiClick}
                  className="w-7 h-7 flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  title={isAiActionDisabled ? "Preencha os campos obrigatórios (seções 1 e 2) para habilitar a IA" : "Gerar com IA"}
                >
                    {isAiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>}
                </button>
            )}
            {isGoal && onSmartClick && (
                 <button type="button" disabled={isSmartLoading} onClick={onSmartClick} className="w-7 h-7 flex items-center justify-center text-green-500 hover:text-green-700 hover:bg-green-100 rounded-full transition-colors" title="Análise SMART">
                    {isSmartLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div> : <i className="fa-solid fa-clipboard-check text-xs"></i>}
                </button>
            )}
            {isGoal && onSuggestClick && (
                 <button type="button" disabled={isSuggestLoading} onClick={onSuggestClick} className="w-7 h-7 flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-colors" title="Sugerir atividades">
                    {isSuggestLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div> : <i className="fa-solid fa-lightbulb text-xs"></i>}
                </button>
            )}
            <button type="button" onClick={onEditClick} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors" title="Editar">
                <i className="fa-solid fa-pencil text-xs"></i>
            </button>
        </div>
      </div>
      {hasError && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};


// --- MERGED FROM components/ActivityCard.tsx ---
const Tag = ({ children, colorClass }) => (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {children}
    </span>
);

const ActivityCard = ({ activity, onDelete, onToggleFavorite, onAddToPei, onEdit }) => {
    const cardBaseStyle = "bg-white p-5 rounded-xl shadow-md border transition-shadow hover:shadow-lg";
    const duaStyle = "bg-blue-50 border-blue-200 hover:shadow-blue-100";
    const normalStyle = "border-gray-200";

    return (
        <div className={`${cardBaseStyle} ${activity.isDUA ? duaStyle : normalStyle}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-800 pr-4 flex-1">{activity.title}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => onToggleFavorite(activity.id)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
                            ${activity.isFavorited 
                                ? 'text-amber-500 bg-amber-100 hover:bg-amber-200' 
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                        title={activity.isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                        <i className={`fa-solid fa-star ${activity.isFavorited ? '' : 'fa-regular'}`}></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit(activity)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full transition-colors"
                        title="Editar atividade"
                    >
                        <i className="fa-solid fa-pencil"></i>
                    </button>
                     <button
                        type="button"
                        onClick={() => onAddToPei(activity)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-indigo-600 rounded-full transition-colors"
                        title="Adicionar ao PEI atual"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(activity.id)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-600 rounded-full transition-colors"
                        title="Excluir atividade"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{activity.description}</p>

            <div className="flex flex-wrap gap-2">
                {activity.isDUA && <Tag colorClass="bg-blue-200 text-blue-800 font-bold">DUA</Tag>}
                <Tag colorClass="bg-indigo-100 text-indigo-800">{activity.discipline}</Tag>
                {activity.skills.slice(0, 3).map(skill => (
                    <Tag key={skill} colorClass="bg-green-100 text-green-800">{skill}</Tag>
                ))}
                {activity.needs.slice(0, 3).map(need => (
                    <Tag key={need} colorClass="bg-sky-100 text-sky-800">{need}</Tag>
                ))}
            </div>
        </div>
    );
};


// --- MERGED FROM components/PeiFormView.tsx ---
const PeiFormView = ({ editingPeiId, onSaveSuccess }) => {
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
    const [isRefinementInputVisible, setIsRefinementInputVisible] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [smartAnalysisResults, setSmartAnalysisResults] = useState({});
    const [openSmartAnalysis, setOpenSmartAnalysis] = useState({});
    const [errors, setErrors] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState('ocioso'); // 'ocioso', 'salvando', 'salvo'

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
    }, []);

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
        const allRagFiles = getAllRagFiles();
        const selectedFiles = allRagFiles.filter(f => f.selected);
        let ragContext = '';
        if (selectedFiles.length > 0) {
            ragContext = '--- INÍCIO DOS FICHEIROS DE APOIO ---\n\n' +
                selectedFiles.map(f => `Ficheiro: ${f.name}\nConteúdo:\n${f.content}\n\n`).join('') +
                '--- FIM DOS FICHEIROS DE APOIO ---\n\n';
        }

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
            
            const studentInfoForSimpleActions = `
                Aluno: ${peiData['aluno-nome'] || 'Não informado'}
                Diagnóstico: ${peiData['id-diagnostico'] || 'Não informado'}
            `;
    
            switch (action) {
                case 'ai':
                    const fieldLabelAi = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                    const aiPrompt = `Aja como um especialista em educação inclusiva. Sua tarefa é preencher o campo "${fieldLabelAi}" de um Plano Educacional Individualizado (PEI).
                    
Para garantir coesão e coerência (Chain of Thought), analise CUIDADOSAMENTE os ficheiros de apoio (se houver) e os campos já preenchidos do PEI antes de gerar sua resposta.

${ragContext}
${formContext}
                    
Agora, com base em TODO o contexto fornecido, gere o conteúdo para o campo: "${fieldLabelAi}".
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
                    const isDuaField = fieldId === 'dua-content';
                    const isGoalField = ['metas-curto', 'metas-medio', 'metas-longo'].includes(fieldId);

                    let promptContext = '';
                    let promptSubject = '';
                    
                    if (isGoalField) {
                        const goalTextForSuggest = peiData[fieldId] || '';
                        if (!goalTextForSuggest.trim()) {
                            alert('Por favor, preencha o campo da meta antes de solicitar sugestões de atividades.');
                            return;
                        }
                        promptContext = `Informações do Aluno: ${studentInfoForSimpleActions}`;
                        promptSubject = `na seguinte meta de um PEI: "${goalTextForSuggest}"`;
                    } else {
                        if (!areRequiredFieldsFilled) {
                            validateForm();
                            return;
                        }
                        promptContext = `${ragContext}\n${formContext}`;
                        promptSubject = 'no contexto completo do PEI fornecido';
                    }

                    const duaInstruction = isDuaField ? 'Com base nos princípios do Desenho Universal para a Aprendizagem (DUA) e' : 'Com base';

                    const suggestPrompt = `${duaInstruction} ${promptSubject}, sugira 3 a 5 atividades educacionais adaptadas.
                    
Contexto:
${promptContext}

Sua resposta DEVE ser um array de objetos JSON válido, sem nenhum texto adicional antes ou depois. Use a seguinte estrutura:
[
  {
    "title": "...",
    "description": "...",
    "discipline": "...",
    "skills": ["...", "..."],
    "needs": ["...", "..."],
    "goalTags": [${isDuaField ? '"DUA"' : '"..."'}]
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
                        let activities = JSON.parse(jsonString);

                        if (!Array.isArray(activities)) {
                            throw new Error("Response is not an array.");
                        }

                        if (isDuaField) {
                            activities = activities.map(act => ({ ...act, isDUA: true }));
                        }

                        const handleSaveActivities = () => {
                            addActivitiesToBank(activities, currentPeiId);
                            alert(`${activities.length} atividades foram salvas com sucesso no Banco de Atividades!`);
                            setIsModalOpen(false);
                        };
                        
                        const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
                        
                        setModalContent({
                            title: `Atividades Sugeridas para "${fieldLabel}"`,
                            content: renderSuggestedActivities(activities),
                            footer: (
                                <>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                                        Fechar
                                    </button>
                                    <button type="button" onClick={handleSaveActivities} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2">
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
        setIsRefinementInputVisible(false);
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
        } catch (error) {
            console.error('Error during regeneration:', error);
            alert('Ocorreu um erro ao refinar o conteúdo.');
        } finally {
            setIsRegenerating(false);
            setIsRefinementInputVisible(false);
            setRefinementInstruction('');
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
        const fieldLabel = fieldOrderForPreview.flatMap(s => s.fields).find(f => f.id === fieldId)?.label || '';
        setEditModalData({
            fieldId,
            label: fieldLabel,
            text: peiData[fieldId] || '',
        });
        setIsEditModalOpen(true);
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
        const activitySuggestionFields = ['atividades-content', 'dua-content'];

        if (textAreaFields.includes(id)) {
            const isGoal = goalFields.includes(id);
            const canSuggestActivities = isGoal || activitySuggestionFields.includes(id);

            return (
                <div key={id} className="md:col-span-2">
                    <TextAreaWithActions
                        id={id}
                        label={label}
                        value={peiData[id] || ''}
                        onChange={(value) => handleTextAreaChange(id, value)}
                        onAiClick={() => handleActionClick(id, 'ai')}
                        onSmartClick={isGoal ? () => handleActionClick(id, 'smart') : undefined}
                        onSuggestClick={canSuggestActivities ? () => handleActionClick(id, 'suggest') : undefined}
                        onEditClick={() => handleEditClick(id)}
                        isAiLoading={loadingStates[`${id}-ai`]}
                        isSmartLoading={loadingStates[`${id}-smart`]}
                        isSuggestLoading={loadingStates[`${id}-suggest`]}
                        isGoal={canSuggestActivities}
                        placeholder={`Descreva sobre "${label}" aqui...`}
                        rows={isGoal ? 6 : 5}
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
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(fullPeiContent);
                                alert('Texto copiado para a área de transferência!');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Copiar Texto
                        </button>
                        <button
                            type="button"
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
                        type="button"
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
                                type="button"
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
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
                        {!isRefinementInputVisible ? (
                             <button
                                type="button"
                                onClick={() => setIsRefinementInputVisible(true)}
                                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 flex items-center gap-2 transition-all duration-200 ease-in-out"
                            >
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                Assim mas...
                            </button>
                        ) : (
                             <div className="space-y-2 p-4 border border-indigo-200 rounded-lg bg-indigo-50/50 animate-fade-in">
                                <label htmlFor="refinement-instruction" className="block text-sm font-medium text-gray-700">Instrução para Refinamento:</label>
                                <input
                                    type="text"
                                    id="refinement-instruction"
                                    value={refinementInstruction}
                                    onChange={(e) => setRefinementInstruction(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg bg-white text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                                    placeholder="Ex: 'Torne o texto mais formal', 'Adicione um exemplo prático', etc."
                                />
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsRefinementInputVisible(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleEditModalRegenerate} 
                                        disabled={isRegenerating}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                                        style={{minWidth: '90px'}}
                                    >
                                        {isRegenerating ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            "Enviar"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
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


// --- MERGED FROM components/ActivityBankView.tsx ---
const ActivityBankView = () => {
    const [activities, setActivities] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [isRefinementInputVisible, setIsRefinementInputVisible] = useState(false);
    const [refinementInstruction, setRefinementInstruction] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    const { editingPeiId, navigateToEditPei } = useAppStore();

    useEffect(() => {
        setActivities(getAllActivities());
    }, []);

    const filteredActivities = useMemo(() => {
        return activities
            .filter(activity => {
                if (showOnlyFavorites && !activity.isFavorited) {
                    return false;
                }
                if (searchTerm.trim() === '') {
                    return true;
                }
                const lowerCaseSearch = searchTerm.toLowerCase();
                return (
                    activity.title.toLowerCase().includes(lowerCaseSearch) ||
                    activity.description.toLowerCase().includes(lowerCaseSearch) ||
                    activity.discipline.toLowerCase().includes(lowerCaseSearch)
                );
            })
            .sort((a, b) => (b.isFavorited ? 1 : 0) - (a.isFavorited ? 1 : 0));
    }, [activities, searchTerm, showOnlyFavorites]);

    const favoriteCount = useMemo(() => activities.filter(a => a.isFavorited).length, [activities]);

    const updateAndSaveActivities = (updatedActivities) => {
        setActivities(updatedActivities);
        saveActivities(updatedActivities);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta atividade do banco?')) {
            const updated = activities.filter(a => a.id !== id);
            updateAndSaveActivities(updated);
        }
    };

    const handleToggleFavorite = (id) => {
        const updated = activities.map(a => 
            a.id === id ? { ...a, isFavorited: !a.isFavorited } : a
        );
        updateAndSaveActivities(updated);
    };
    
    const handleAddToPei = (activity) => {
        if (!editingPeiId) {
            alert('Por favor, abra um PEI na tela "PEIs Salvos" ou inicie um novo no "Editor PEI" antes de adicionar uma atividade.');
            return;
        }
        addActivityToPei(editingPeiId, activity);
        alert(`Atividade "${activity.title}" adicionada ao PEI atual.`);
        navigateToEditPei(editingPeiId);
    };

    const handleOpenEditModal = (activity) => {
        setEditingActivity({ ...activity });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingActivity(null);
        setIsRefinementInputVisible(false);
        setRefinementInstruction('');
    };

    const handleSaveEditedActivity = () => {
        if (!editingActivity) return;

        const skillsArray = typeof editingActivity.skills === 'string'
            ? (editingActivity.skills).split(',').map(s => s.trim()).filter(Boolean)
            : editingActivity.skills;

        const needsArray = typeof editingActivity.needs === 'string'
            ? (editingActivity.needs).split(',').map(s => s.trim()).filter(Boolean)
            : editingActivity.needs;

        const finalActivity = {
            ...editingActivity,
            skills: skillsArray,
            needs: needsArray,
        };
        
        const updated = activities.map(a => 
            a.id === finalActivity.id ? finalActivity : a
        );
        updateAndSaveActivities(updated);
        handleCloseEditModal();
    };

    const handleEditFormChange = (e) => {
        if (!editingActivity) return;
        const { id, value } = e.target;
        setEditingActivity(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleActivityRefinement = async () => {
        if (!editingActivity || !editingActivity.description) return;
        setIsRegenerating(true);
        try {
            const instruction = refinementInstruction || 'Por favor, refine e aprimore esta descrição.';
            const prompt = `Aja como um especialista em pedagogia. O usuário está editando a descrição de uma atividade educacional.

Atividade:
- Título: ${editingActivity.title}
- Disciplina: ${editingActivity.discipline}

Descrição Atual:
---
${editingActivity.description}
---

O usuário forneceu a seguinte instrução para refinar a descrição: "${instruction}".

Refine a descrição atual com base na instrução e no contexto. Mantenha o propósito original, mas aprimore a clareza, o engajamento e a adequação pedagógica. Devolva apenas o texto da descrição aprimorada, sem títulos ou introduções.`;

            const response = await callGenerativeAI(prompt);
            setEditingActivity(prev => prev ? { ...prev, description: response } : null);
        } catch (error) {
            console.error('Error during activity refinement:', error);
            alert('Ocorreu um erro ao refinar a descrição da atividade.');
        } finally {
            setIsRegenerating(false);
            setIsRefinementInputVisible(false);
            setRefinementInstruction('');
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Banco de Atividades e Recursos</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center gap-5">
                    <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center text-3xl">
                        <i className="fa-solid fa-layer-group"></i>
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Total de Atividades</p>
                        <p className="text-3xl font-bold text-gray-800">{activities.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center gap-5">
                    <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center text-3xl">
                        <i className="fa-solid fa-star"></i>
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Atividades Favoritas</p>
                        <p className="text-3xl font-bold text-gray-800">{favoriteCount}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2">
                        <label htmlFor="search-activities" className="block text-sm font-medium text-gray-700 mb-1">
                            Pesquisar Atividades
                        </label>
                        <input
                            id="search-activities"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar por título, descrição..."
                            className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex items-center mt-5">
                         <input
                            id="filter-favorites"
                            type="checkbox"
                            checked={showOnlyFavorites}
                            onChange={(e) => setShowOnlyFavorites(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="filter-favorites" className="ml-2 block text-sm font-medium text-gray-700">
                            Apenas favoritos
                        </label>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredActivities.length > 0 ? (
                    filteredActivities.map(activity => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            onDelete={handleDelete}
                            onToggleFavorite={handleToggleFavorite}
                            onAddToPei={handleAddToPei}
                            onEdit={handleOpenEditModal}
                        />
                    ))
                ) : (
                    <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                        <div className="text-5xl text-gray-400 mb-4"><i className="fa-regular fa-lightbulb"></i></div>
                        <h3 className="text-xl font-semibold text-gray-700">Nenhuma atividade encontrada</h3>
                        <p className="text-gray-500 mt-2">Tente ajustar seus filtros ou adicione novas atividades a partir do Editor PEI.</p>
                    </div>
                )}
            </div>

            {editingActivity && (
                <Modal
                    id="edit-activity-modal"
                    title="Editar Atividade"
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    footer={
                        <>
                            <button type="button" onClick={handleCloseEditModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleSaveEditedActivity} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                                Salvar Alterações
                            </button>
                        </>
                    }
                    wide
                >
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                            <input
                                type="text"
                                id="title"
                                value={editingActivity.title}
                                onChange={handleEditFormChange}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                id="description"
                                rows={5}
                                value={editingActivity.description}
                                onChange={handleEditFormChange}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            />
                        </div>
                        <div className="mt-2 mb-2">
                            {!isRefinementInputVisible ? (
                                 <button
                                    type="button"
                                    onClick={() => setIsRefinementInputVisible(true)}
                                    className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 flex items-center gap-2 transition-all duration-200 ease-in-out"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    Assim mas... (refinar descrição)
                                </button>
                            ) : (
                                 <div className="space-y-2 p-4 border border-indigo-200 rounded-lg bg-indigo-50/50 animate-fade-in">
                                    <label htmlFor="activity-refinement-instruction" className="block text-sm font-medium text-gray-700">Instrução para Refinamento:</label>
                                    <input
                                        type="text"
                                        id="activity-refinement-instruction"
                                        value={refinementInstruction}
                                        onChange={(e) => setRefinementInstruction(e.target.value)}
                                        className="w-full p-2.5 border rounded-lg bg-white text-gray-800 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                                        placeholder="Ex: 'Torne mais lúdico', 'Adicione um exemplo', etc."
                                    />
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsRefinementInputVisible(false)}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleActivityRefinement} 
                                            disabled={isRegenerating}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                                            style={{minWidth: '90px'}}
                                        >
                                            {isRegenerating ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                "Enviar"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                            <select
                                id="discipline"
                                value={editingActivity.discipline}
                                onChange={handleEditFormChange}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            >
                                {disciplineOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Habilidades (separadas por vírgula)</label>
                            <input
                                type="text"
                                id="skills"
                                value={Array.isArray(editingActivity.skills) ? editingActivity.skills.join(', ') : editingActivity.skills}
                                onChange={handleEditFormChange}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="needs" className="block text-sm font-medium text-gray-700 mb-1">Necessidades Específicas (separadas por vírgula)</label>
                            <input
                                type="text"
                                id="needs"
                                value={Array.isArray(editingActivity.needs) ? editingActivity.needs.join(', ') : editingActivity.needs}
                                onChange={handleEditFormChange}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};


// --- MERGED FROM components/PeiListView.tsx ---
const PeiListView = () => {
  const [peis, setPeis] = useState([]);
  const { navigateToEditPei, navigateToNewPei } = useAppStore();

  useEffect(() => {
    setPeis(getAllPeis());
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este PEI? Esta ação não pode ser desfeita.')) {
        deletePei(id);
        setPeis(getAllPeis());
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">PEIs Salvos</h2>
        <button 
            type="button"
            onClick={navigateToNewPei}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
            <i className="fa-solid fa-plus"></i>
            Criar Novo PEI
        </button>
      </div>

      {peis.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-5xl text-gray-400 mb-4"><i className="fa-regular fa-file-lines"></i></div>
            <h3 className="text-xl font-semibold text-gray-700">Nenhum PEI encontrado</h3>
            <p className="text-gray-500 mt-2">Comece a criar um novo Plano Educacional Individualizado.</p>
        </div>
      ) : (
        <div className="space-y-4">
            {peis.map(pei => (
                <div key={pei.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-indigo-700">{pei.alunoNome}</h3>
                        <p className="text-sm text-gray-500">Última modificação: {formatDate(pei.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => navigateToEditPei(pei.id)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            title="Editar PEI"
                        >
                            <i className="fa-solid fa-pencil"></i>
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(pei.id)}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                            title="Excluir PEI"
                        >
                           <i className="fa-solid fa-trash-can"></i>
                           <span className="hidden sm:inline">Excluir</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};


// --- MERGED FROM components/SupportFilesView.tsx ---
const SupportFilesView = () => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setFiles(getAllRagFiles());
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;

        const newFiles = [...files];
        const filePromises: Promise<void>[] = [];

        Array.from(uploadedFiles).forEach((file: File) => {
            if (!files.some(f => f.name === file.name)) {
                const promise = new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;
                        newFiles.push({ name: file.name, content, selected: true });
                        resolve();
                    };
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
                filePromises.push(promise);
            }
        });

        Promise.all(filePromises).then(() => {
            setFiles(newFiles);
            saveRagFiles(newFiles);
        });

        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleToggleSelect = (fileName) => {
        const updatedFiles = files.map(file =>
            file.name === fileName ? { ...file, selected: !file.selected } : file
        );
        setFiles(updatedFiles);
        saveRagFiles(updatedFiles);
    };

    const handleDeleteFile = (fileName) => {
        if (window.confirm(`Tem certeza que deseja excluir o ficheiro "${fileName}"?`)) {
            const updatedFiles = files.filter(file => file.name !== fileName);
            setFiles(updatedFiles);
            saveRagFiles(updatedFiles);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Ficheiros de Apoio (RAG)</h2>
            <p className="text-gray-600 mb-6">Anexe ficheiros de texto (.txt, .md) para dar contexto à IA. Apenas os ficheiros selecionados serão utilizados durante a geração de conteúdo.</p>
            
            <input
                type="file"
                multiple
                accept=".txt,.md"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
            />
            
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-6 px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
                <i className="fa-solid fa-paperclip"></i>
                Anexar Ficheiros
            </button>

            {files.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-5xl text-gray-400 mb-4"><i className="fa-regular fa-folder-open"></i></div>
                    <h3 className="text-xl font-semibold text-gray-700">Nenhum ficheiro de apoio</h3>
                    <p className="text-gray-500 mt-2">Anexe documentos para fornecer contexto adicional à IA.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {files.map(file => (
                        <div key={file.name} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-4 transition-all hover:border-indigo-300 hover:shadow-sm">
                            <label className="flex items-center cursor-pointer">
                                 <input
                                    type="checkbox"
                                    checked={file.selected}
                                    onChange={() => handleToggleSelect(file.name)}
                                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>
                            <div className="flex-grow text-gray-700 font-medium truncate" title={file.name}>
                                {file.name}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteFile(file.name)}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                title="Excluir Ficheiro"
                            >
                               <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- MERGED FROM components/PrivacyPolicyView.tsx ---
const PrivacyPolicyView = () => {
  const [isChecked, setIsChecked] = useState(false);
  const { navigateToNewPei } = useAppStore();

  const SectionTitle = ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
  );
  
  const SubTitle = ({ children }) => (
    <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">{children}</h4>
  );

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Política de Privacidade</h2>
        <button 
            type="button"
            onClick={navigateToNewPei}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
        >
            Voltar ao Editor
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto flex-grow text-gray-600 leading-relaxed">
        <p className="text-sm text-gray-500 mb-4">Última atualização: 16 de agosto de 2025</p>
        
        <SectionTitle>1. Introdução</SectionTitle>
        <p>Bem-vindo ao <strong>Assistente de PEI com IA</strong>. Esta aplicação foi criada para auxiliar educadores e profissionais da educação na elaboração de Planos Educacionais Individualizados (PEI).</p>
        <p>A sua privacidade e a segurança dos dados com os quais você trabalha são a nossa maior prioridade. Esta Política de Privacidade explica quais informações são manuseadas, como são utilizadas e, mais importante, como garantimos a sua proteção.</p>
        <p>Ao utilizar a nossa aplicação, você concorda com as práticas descritas nesta política.</p>

        <SectionTitle>2. Quais Informações Manuseamos?</SectionTitle>
        <p>É fundamental entender a distinção entre os dados que permanecem no seu computador e os dados enviados para processamento pela Inteligência Artificial (IA).</p>
        
        <SubTitle>a) Dados Armazenados Localmente no Seu Navegador</SubTitle>
        <p>Todo o conteúdo que você cria e salva dentro da aplicação é armazenado exclusivamente no seu computador, utilizando a tecnologia segura de armazenamento local do seu navegador. Nós, como desenvolvedores, não temos acesso a nenhuma dessas informações. Estes dados incluem:</p>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
          <li>Os Planos Educacionais Individualizados (PEIs) que você cria e salva.</li>
          <li>O seu Banco de Atividades personalizado.</li>
          <li>O conteúdo dos ficheiros de apoio que você anexa na seção "Ficheiros de Apoio".</li>
        </ul>

        <SubTitle>b) Dados Enviados para Processamento de IA</SubTitle>
        <p>Para que as funcionalidades de inteligência artificial funcionem, é necessário enviar informações de contexto do PEI para o nosso provedor de IA, a API do Google Gemini. Estes dados incluem o conteúdo dos campos do formulário (como "Diagnóstico", "Habilidades Acadêmicas" e "Conteúdos do bimestre") e o conteúdo dos ficheiros de apoio selecionados.</p>

        <SectionTitle>3. Como Usamos as Suas Informações?</SectionTitle>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li><strong>Dados Locais:</strong> São utilizados apenas pela aplicação para permitir que você salve, edite e carregue o seu trabalho entre sessões de uso.</li>
            <li><strong>Dados Enviados à IA:</strong> São utilizados exclusivamente em tempo real para gerar as respostas e sugestões solicitadas por você.</li>
        </ul>

        <SectionTitle>4. Política de Processamento da IA e Uso para Treinamento</SectionTitle>
        <p>Este é o nosso compromisso mais importante com a sua privacidade.</p>
        <p>De acordo com a política de privacidade do nosso provedor de IA, Google, os dados enviados através das solicitações da API (ou seja, o conteúdo do seu PEI) <strong>NÃO</strong> são armazenados, monitorados ou utilizados para treinar os modelos de inteligência artificial.</p>
        <p>As suas conversas com a IA permanecem privadas. O processamento ocorre em tempo real e o conteúdo não é guardado nos servidores da API após a resposta ser gerada.</p>

        <SectionTitle>5. Transferência Internacional de Dados e Conformidade com a LGPD</SectionTitle>
        <p>A Lei Geral de Proteção de Dados (LGPD) e outras legislações de privacidade são levadas a sério por este projeto.</p>
        <ul className="list-disc list-inside space-y-2 my-3 pl-4">
            <li><strong>Servidores Globais:</strong> O provedor da API, Google, opera com servidores em diversas localidades.</li>
            <li><strong>Consentimento:</strong> Ao utilizar as funcionalidades de IA da aplicação, você reconhece e concorda que os dados contextuais do PEI serão enviados para processamento temporário e em tempo real nestes servidores. Dada a política de não armazenamento do provedor, garantimos o mais alto nível de privacidade possível nesta operação.</li>
            <li><strong>Seus Direitos (LGPD):</strong>
                <ul className="list-disc list-inside space-y-1 mt-2 pl-6">
                    <li><strong>Acesso e Correção:</strong> Você tem controle total para acessar e corrigir todos os dados diretamente na interface da aplicação.</li>
                    <li><strong>Exclusão:</strong> Você pode excluir qualquer PEI ou atividade a qualquer momento, removendo-os permanentemente do armazenamento local do seu navegador.</li>
                </ul>
            </li>
        </ul>

        <SectionTitle>6. Segurança dos Dados</SectionTitle>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li>Os dados armazenados localmente estão protegidos pela segurança do seu próprio navegador.</li>
            <li>A comunicação entre a aplicação e a API do Google Gemini é feita através de uma conexão segura HTTPS.</li>
        </ul>

        <SectionTitle>7. Privacidade de Crianças</SectionTitle>
        <p>A aplicação "Assistente de PEI com IA" é uma ferramenta destinada ao uso por profissionais da educação.</p>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li>A aplicação não coleta intencionalmente dados de crianças.</li>
            <li>É de responsabilidade do profissional que utiliza a ferramenta garantir que possui o consentimento necessário dos pais ou responsáveis legais para inserir e processar informações sobre os alunos, conforme as políticas da sua instituição de ensino e a legislação local.</li>
        </ul>

        <SectionTitle>8. Alterações a Esta Política de Privacidade</SectionTitle>
        <p>Podemos atualizar esta política de privacidade periodicamente. Quaisquer alterações serão publicadas nesta página, e recomendamos que a reveja de tempos em tempos.</p>

        <SectionTitle>9. Contato</SectionTitle>
        <p>Se você tiver alguma dúvida sobre esta política de privacidade, entre em contato conosco através do e-mail: <a href="mailto:danilofelipe862@educar.rn.gov.br" className="text-indigo-600 hover:underline">danilofelipe862@educar.rn.gov.br</a>.</p>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl mt-auto">
        <label htmlFor="privacy-agree" className="flex items-center cursor-pointer select-none">
          <input 
            id="privacy-agree"
            type="checkbox" 
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
            className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="ml-3 text-sm text-gray-700">Eu li e concordo com a Política de Privacidade.</span>
        </label>
      </div>
    </div>
  );
};


// --- MERGED FROM App.tsx ---
const App = () => {
    const { currentView, editingPeiId } = useAppStore();
    const { navigateToView, navigateToNewPei } = useAppStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigation = (targetView) => {
        if (targetView === 'pei-form-view') {
            navigateToNewPei();
        } else {
            navigateToView(targetView);
        }
        setIsSidebarOpen(false);
    };

    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col md:flex-row font-sans">
            <header className="md:hidden flex justify-between items-center p-4 bg-white border-b border-gray-200">
                 <div className="flex items-center gap-3">
                    <div className="text-2xl text-indigo-600"><BrainIcon /></div>
                    <h1 className="text-xl font-bold text-gray-800">Assistente PEI</h1>
                </div>
                <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
                    <i className="fa-solid fa-bars text-xl"></i>
                </button>
            </header>
            
            <Sidebar 
                isSidebarOpen={isSidebarOpen} 
                onNavigate={handleNavigation}
            />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100">
                    {currentView === 'pei-form-view' && (
                        <PeiFormView 
                            key={editingPeiId || 'new'} 
                            editingPeiId={editingPeiId} 
                            onSaveSuccess={() => navigateToView('pei-list-view')} 
                        />
                    )}
                    {currentView === 'activity-bank-view' && (
                        <ActivityBankView />
                    )}
                    {currentView === 'pei-list-view' && <PeiListView />}
                    {currentView === 'files-view' && <SupportFilesView />}
                    {currentView === 'privacy-policy-view' && <PrivacyPolicyView />}
                 </div>
            </main>
        </div>
    );
};

const Sidebar = ({ isSidebarOpen, onNavigate }) => {
    const currentView = useAppStore((state) => state.currentView);
    
    const navItems = [
        { id: 'pei-form-view', icon: <EditorIcon />, label: 'Editor PEI' },
        { id: 'activity-bank-view', icon: <ActivityIcon />, label: 'Banco de Atividades' },
        { id: 'pei-list-view', icon: <ArchiveIcon />, label: 'PEIs Salvos' },
        { id: 'files-view', icon: <PaperclipIcon />, label: 'Ficheiros de Apoio' },
    ];

    const privacyItem = { id: 'privacy-policy-view', icon: <ShieldIcon />, label: 'Política de Privacidade' };

    return (
        <aside className={`
            absolute md:relative z-20 md:z-auto 
            w-full h-full md:w-72 md:flex-shrink-0 
            bg-white border-r border-gray-200 
            transform md:transform-none transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            flex flex-col p-6`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl text-indigo-600"><BrainIcon /></div>
                <h1 className="text-xl font-bold text-gray-800">Assistente PEI</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                O seu assistente para criar Planos Educacionais Individualizados (PEI).
            </p>
            
            <div className="flex-grow flex flex-col">
                <nav className="flex flex-col space-y-2">
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}
                            className={`
                                flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${currentView === item.id 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                            `}
                        >
                            <span className="w-5 text-center text-lg">{item.icon}</span>
                            {item.label}
                        </a>
                    ))}
                </nav>
            </div>
            
            <div className="flex-shrink-0">
                <a
                    key={privacyItem.id}
                    href="#"
                    onClick={(e) => { e.preventDefault(); onNavigate(privacyItem.id); }}
                    className={`
                        flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${currentView === privacyItem.id 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                >
                    <span className="w-5 text-center text-lg">{privacyItem.icon}</span>
                    {privacyItem.label}
                </a>
                <footer className="text-center p-2 mt-4 text-xs text-gray-500">
                    <a href="mailto:danilofelipe862@educar.rn.gov.br" className="hover:text-indigo-600">Produzido por Danilo Arruda</a>
                </footer>
            </div>
        </aside>
    );
};


// --- ORIGINAL index.tsx LOGIC ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('Service Worker registrado com sucesso: ', registration);
    }).catch(registrationError => {
      console.log('Falha no registro do Service Worker: ', registrationError);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);