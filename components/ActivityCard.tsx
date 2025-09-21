import React from 'react';

const Tag = ({ children, colorClass }) => (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {children}
    </span>
);

export const ActivityCard = ({ activity, onDelete, onToggleFavorite, onAddToPei, onEdit }) => {
    const cardBaseStyle = "bg-white p-5 rounded-xl shadow-md border transition-shadow hover:shadow-lg";
    const duaStyle = "bg-blue-50 border-blue-200 hover:shadow-blue-100";
    const normalStyle = "border-gray-200";

    return (
        <div className={`${cardBaseStyle} ${activity.isDUA ? duaStyle : normalStyle}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-800 pr-4 flex-1">{activity.title}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
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
                        onClick={() => onEdit(activity)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full transition-colors"
                        title="Editar atividade"
                    >
                        <i className="fa-solid fa-pencil"></i>
                    </button>
                     <button
                        onClick={() => onAddToPei(activity)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-indigo-600 rounded-full transition-colors"
                        title="Adicionar ao PEI atual"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                    <button
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