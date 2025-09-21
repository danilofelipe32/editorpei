import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Registra o Service Worker para a funcionalidade PWA offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('Service Worker registrado com sucesso: ', registration);
    }).catch(registrationError => {
      console.log('Falha no registro do Service Worker: ', registrationError);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);