import React from 'react';

export const BrainIcon = () => <i className="fa-solid fa-brain"></i>;
export const EditorIcon = () => <i className="fa-solid fa-file-lines"></i>;
export const ActivityIcon = () => <i className="fa-solid fa-lightbulb"></i>;
export const ArchiveIcon = () => <i className="fa-solid fa-box-archive"></i>;
export const PaperclipIcon = () => <i className="fa-solid fa-paperclip"></i>;
export const ShieldIcon = () => <i className="fa-solid fa-shield-halved"></i>;

export const disciplineOptions = [
    "Língua Portuguesa", "Matemática", "História", "Geografia", "Ciências", "Artes", "Educação Física", "Inglês",
    "Filosofia", "Sociologia", "Química", "Física", "Biologia"
];

export const fieldOrderForPreview = [
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

export const labelToIdMap = fieldOrderForPreview.flatMap(s => s.fields).reduce((acc, field) => {
    acc[field.label] = field.id;
    return acc;
}, {});