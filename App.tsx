import React, { useState, useEffect, useCallback } from 'react';
import { BrainIcon, EditorIcon, ActivityIcon, ArchiveIcon, PaperclipIcon, ShieldIcon } from './constants';

// Since this is a large component, we define sub-views here.
// In a larger project, these would be in separate files.
import { PeiFormView } from './components/PeiFormView';
import { ActivityBankView } from './components/ActivityBankView';
import { PeiListView } from './components/PeiListView';
import { SupportFilesView } from './components/SupportFilesView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';


const App = () => {
    // Função para obter a visualização inicial da URL para suportar os atalhos do PWA
    const getInitialView = () => {
        const params = new URLSearchParams(window.location.search);
        const viewFromUrl = params.get('view');
        const validViews = ['pei-form-view', 'activity-bank-view', 'pei-list-view', 'files-view', 'privacy-policy-view'];
        if (viewFromUrl && validViews.includes(viewFromUrl)) {
            // Limpa a URL para evitar recarregamentos na mesma view
            window.history.replaceState({}, document.title, window.location.pathname);
            return viewFromUrl;
        }
        return 'pei-form-view'; // Visualização padrão
    };

    const [view, setView] = useState(getInitialView());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingPeiId, setEditingPeiId] = useState(null);

    const handleEditPei = (peiId) => {
        setEditingPeiId(peiId);
        setView('pei-form-view');
    };

    const handleNewPei = () => {
        setEditingPeiId(null);
        setView('pei-form-view');
    };

    const handleNavigation = (targetView) => {
        if (targetView === 'pei-form-view') {
            handleNewPei();
        } else {
            setView(targetView);
        }
        setIsSidebarOpen(false);
    };

    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col md:flex-row font-sans">
            {/* Mobile Header */}
            <header className="md:hidden flex justify-between items-center p-4 bg-white border-b border-gray-200">
                 <div className="flex items-center gap-3">
                    <div className="text-2xl text-indigo-600"><BrainIcon /></div>
                    <h1 className="text-xl font-bold text-gray-800">Assistente PEI</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
                    <i className="fa-solid fa-bars text-xl"></i>
                </button>
            </header>
            
            <Sidebar currentView={view} onNavigate={handleNavigation} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100">
                    <div className={view === 'pei-form-view' ? '' : 'hidden'}>
                        <PeiFormView 
                            key={editingPeiId || 'new'} 
                            editingPeiId={editingPeiId} 
                            onSaveSuccess={() => setView('pei-list-view')} 
                        />
                    </div>
                    <div className={view === 'activity-bank-view' ? '' : 'hidden'}>
                        <ActivityBankView 
                            setView={setView}
                            editingPeiId={editingPeiId}
                            onNavigateToEditor={handleEditPei}
                        />
                    </div>
                    <div className={view === 'pei-list-view' ? '' : 'hidden'}><PeiListView setView={setView} onEditPei={handleEditPei} /></div>
                    <div className={view === 'files-view' ? '' : 'hidden'}><SupportFilesView /></div>
                    <div className={view === 'privacy-policy-view' ? 'flex flex-col h-full' : 'hidden'}><PrivacyPolicyView setView={setView} /></div>
                 </div>
            </main>
        </div>
    );
};


const Sidebar = ({ currentView, onNavigate, isSidebarOpen, setIsSidebarOpen }) => {
    
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

export default App;