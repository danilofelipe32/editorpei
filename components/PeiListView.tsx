import React, { useState, useEffect } from 'react';
import { getAllPeis, deletePei } from '../services/storageService.ts';
import { useAppStore } from '../store.ts';

export const PeiListView = () => {
  const [peis, setPeis] = useState([]);
  const { navigateToEditPei, navigateToNewPei } = useAppStore();

  useEffect(() => {
    setPeis(getAllPeis());
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este PEI? Esta ação não pode ser desfeita.')) {
        deletePei(id);
        setPeis(getAllPeis()); // Refresh the list from storage
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
                            onClick={() => navigateToEditPei(pei.id)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            title="Editar PEI"
                        >
                            <i className="fa-solid fa-pencil"></i>
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
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