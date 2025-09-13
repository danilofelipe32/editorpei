const PEI_STORAGE_KEY = 'peiRecords';
const RAG_FILES_KEY = 'ragFiles';
const ACTIVITY_BANK_KEY = 'activityBank';


// PEI Management
export const getAllPeis = () => {
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

export const getPeiById = (id) => {
    const allPeis = getAllPeis();
    return allPeis.find(pei => pei.id === id);
};

export const savePei = (recordData, id, studentName) => {
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

export const deletePei = (id) => {
    const allPeis = getAllPeis();
    const updatedList = allPeis.filter(p => p.id !== id);
    localStorage.setItem(PEI_STORAGE_KEY, JSON.stringify(updatedList));
};

// RAG File Management
export const getAllRagFiles = () => {
    try {
        const filesJson = localStorage.getItem(RAG_FILES_KEY);
        return filesJson ? JSON.parse(filesJson) : [];
    } catch (error) {
        console.error("Failed to parse RAG files from localStorage", error);
        return [];
    }
};

export const saveRagFiles = (files) => {
    try {
        const filesJson = JSON.stringify(files);
        localStorage.setItem(RAG_FILES_KEY, filesJson);
    } catch (error) {
        console.error("Failed to save RAG files to localStorage", error);
    }
};

// Activity Bank Management
export const getAllActivities = () => {
    try {
        const activitiesJson = localStorage.getItem(ACTIVITY_BANK_KEY);
        return activitiesJson ? JSON.parse(activitiesJson) : [];
    } catch (error) {
        console.error("Failed to parse Activities from localStorage", error);
        return [];
    }
};

export const saveActivities = (activities) => {
    try {
        localStorage.setItem(ACTIVITY_BANK_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error("Failed to save Activities to localStorage", error);
    }
};

export const addActivitiesToBank = (generatedActivities, sourcePeiId) => {
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

export const addActivityToPei = (peiId, activity) => {
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