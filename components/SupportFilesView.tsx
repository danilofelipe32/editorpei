import React, { useState, useEffect, useRef } from 'react';
import { getAllRagFiles, saveRagFiles } from '../services/storageService.ts';

export const SupportFilesView = () => {
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

        // FIX: Explicitly type 'file' as File to access its properties and satisfy FileReader.
        Array.from(uploadedFiles).forEach((file: File) => {
            if (!files.some(f => f.name === file.name)) {
                // FIX: Add <void> to Promise constructor to resolve type error.
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

        // Reset the input value to allow re-uploading the same file
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