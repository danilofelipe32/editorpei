import React, { useState } from 'react';

export const TextAreaWithActions = ({
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
                  disabled={isAiLoading || isAiActionDisabled}
                  onClick={onAiClick}
                  className="w-7 h-7 flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  title={isAiActionDisabled ? "Preencha os campos obrigatórios (seções 1 e 2) para habilitar a IA" : "Gerar com IA"}
                >
                    {isAiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>}
                </button>
            )}
            {isGoal && onSmartClick && (
                 <button disabled={isSmartLoading} onClick={onSmartClick} className="w-7 h-7 flex items-center justify-center text-green-500 hover:text-green-700 hover:bg-green-100 rounded-full transition-colors" title="Análise SMART">
                    {isSmartLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div> : <i className="fa-solid fa-clipboard-check text-xs"></i>}
                </button>
            )}
            {isGoal && onSuggestClick && (
                 <button disabled={isSuggestLoading} onClick={onSuggestClick} className="w-7 h-7 flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-colors" title="Sugerir atividades">
                    {isSuggestLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div> : <i className="fa-solid fa-lightbulb text-xs"></i>}
                </button>
            )}
            <button onClick={onEditClick} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors" title="Editar">
                <i className="fa-solid fa-pencil text-xs"></i>
            </button>
        </div>
      </div>
      {hasError && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};