export type ViewType = 'pei-form-view' | 'activity-bank-view' | 'pei-list-view' | 'files-view' | 'privacy-policy-view';

export interface PeiFormField {
    id: string;
    label: string;
}

export interface PeiFormSection {
    title: string;
    fields: PeiFormField[];
}

export interface PeiData {
    [key: string]: string;
}

export interface PeiRecord {
    id: string;
    alunoNome: string;
    data: PeiData;
    timestamp: string;
    aiGeneratedFields?: string[];
    smartAnalysisResults?: Record<string, any | null>;
    suggestedGoalActivities?: Record<string, { text: string; activities: Activity[] }>;
    suggestedGoalActivitiesState?: Record<string, boolean>;
}

// FIX: Define and export NewPeiRecordData type. This fixes an import error in storageService.ts.
export type NewPeiRecordData = Omit<PeiRecord, 'id' | 'timestamp' | 'alunoNome'>;

export interface RagFile {
    name: string;
    content: string;
    selected: boolean;
}

export interface Activity {
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
}
