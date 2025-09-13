
import React from 'react';

interface ModalProps {
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ id, title, isOpen, onClose, children, footer, wide = false }) => {
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
