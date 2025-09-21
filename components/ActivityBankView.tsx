import React, { useState, useEffect, useMemo } from 'react';
import { getAllActivities, saveActivities, addActivityToPei } from '../services/storageService.ts';
import { useAppStore } from '../store.ts';
import { ActivityCard } from './ActivityCard.tsx';
import { Modal } from './Modal.tsx';
import { disciplineOptions } from '../constants.tsx';

export const ActivityBankView = () => {
    const [activities, setActivities] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    
    // Get state and actions from the global store
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
            .sort((a, b) => (b.isFavorited ? 1 : 0) - (a.isFavorited ? 1 : 0)); // Show favorites first
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
        setEditingActivity({ ...activity }); // Create a copy to edit
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingActivity(null);
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

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Banco de Atividades e Recursos</h2>
            
            {/* Dashboard */}
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

            {/* Filters */}
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

            {/* Activity List */}
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

            {/* Edit Modal */}
            {editingActivity && (
                <Modal
                    id="edit-activity-modal"
                    title="Editar Atividade"
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    footer={
                        <>
                            <button onClick={handleCloseEditModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button onClick={handleSaveEditedActivity} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
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