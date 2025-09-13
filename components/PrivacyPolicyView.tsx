import React, { useState } from 'react';
import { ViewType } from '../types';

interface PrivacyPolicyViewProps {
    setView: (view: ViewType) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ setView }) => {
  const [isChecked, setIsChecked] = useState(false);

  // Reusable component for section titles
  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h3>
  );
  
  const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">{children}</h4>
  );

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Política de Privacidade</h2>
        <button 
            onClick={() => setView('pei-form-view')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
        >
            Voltar ao Editor
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto flex-grow text-gray-600 leading-relaxed">
        <p className="text-sm text-gray-500 mb-4">Última atualização: 16 de agosto de 2025</p>
        
        <SectionTitle>1. Introdução</SectionTitle>
        <p>Bem-vindo ao <strong>Assistente de PEI com IA</strong>. Esta aplicação foi criada para auxiliar educadores e profissionais da educação na elaboração de Planos Educacionais Individualizados (PEI).</p>
        <p>A sua privacidade e a segurança dos dados com os quais você trabalha são a nossa maior prioridade. Esta Política de Privacidade explica quais informações são manuseadas, como são utilizadas e, mais importante, como garantimos a sua proteção.</p>
        <p>Ao utilizar a nossa aplicação, você concorda com as práticas descritas nesta política.</p>

        <SectionTitle>2. Quais Informações Manuseamos?</SectionTitle>
        <p>É fundamental entender a distinção entre os dados que permanecem no seu computador e os dados enviados para processamento pela Inteligência Artificial (IA).</p>
        
        <SubTitle>a) Dados Armazenados Localmente no Seu Navegador</SubTitle>
        <p>Todo o conteúdo que você cria e salva dentro da aplicação é armazenado exclusivamente no seu computador, utilizando a tecnologia segura de armazenamento local do seu navegador. Nós, como desenvolvedores, não temos acesso a nenhuma dessas informações. Estes dados incluem:</p>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
          <li>Os Planos Educacionais Individualizados (PEIs) que você cria e salva.</li>
          <li>O seu Banco de Atividades personalizado.</li>
          <li>O conteúdo dos ficheiros de apoio que você anexa na seção "Ficheiros de Apoio".</li>
        </ul>

        <SubTitle>b) Dados Enviados para Processamento de IA</SubTitle>
        <p>Para que as funcionalidades de inteligência artificial funcionem, é necessário enviar informações de contexto do PEI para o nosso provedor de IA, a API do Google Gemini. Estes dados incluem o conteúdo dos campos do formulário (como "Diagnóstico", "Habilidades Acadêmicas" e "Conteúdos do bimestre") e o conteúdo dos ficheiros de apoio selecionados.</p>

        <SectionTitle>3. Como Usamos as Suas Informações?</SectionTitle>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li><strong>Dados Locais:</strong> São utilizados apenas pela aplicação para permitir que você salve, edite e carregue o seu trabalho entre sessões de uso.</li>
            <li><strong>Dados Enviados à IA:</strong> São utilizados exclusivamente em tempo real para gerar as respostas e sugestões solicitadas por você.</li>
        </ul>

        <SectionTitle>4. Política de Processamento da IA e Uso para Treinamento</SectionTitle>
        <p>Este é o nosso compromisso mais importante com a sua privacidade.</p>
        <p>De acordo com a política de privacidade do nosso provedor de IA, Google, os dados enviados através das solicitações da API (ou seja, o conteúdo do seu PEI) <strong>NÃO</strong> são armazenados, monitorados ou utilizados para treinar os modelos de inteligência artificial.</p>
        <p>As suas conversas com a IA permanecem privadas. O processamento ocorre em tempo real e o conteúdo não é guardado nos servidores da API após a resposta ser gerada.</p>

        <SectionTitle>5. Transferência Internacional de Dados e Conformidade com a LGPD</SectionTitle>
        <p>A Lei Geral de Proteção de Dados (LGPD) e outras legislações de privacidade são levadas a sério por este projeto.</p>
        <ul className="list-disc list-inside space-y-2 my-3 pl-4">
            <li><strong>Servidores Globais:</strong> O provedor da API, Google, opera com servidores em diversas localidades.</li>
            <li><strong>Consentimento:</strong> Ao utilizar as funcionalidades de IA da aplicação, você reconhece e concorda que os dados contextuais do PEI serão enviados para processamento temporário e em tempo real nestes servidores. Dada a política de não armazenamento do provedor, garantimos o mais alto nível de privacidade possível nesta operação.</li>
            <li><strong>Seus Direitos (LGPD):</strong>
                <ul className="list-disc list-inside space-y-1 mt-2 pl-6">
                    <li><strong>Acesso e Correção:</strong> Você tem controle total para acessar e corrigir todos os dados diretamente na interface da aplicação.</li>
                    <li><strong>Exclusão:</strong> Você pode excluir qualquer PEI ou atividade a qualquer momento, removendo-os permanentemente do armazenamento local do seu navegador.</li>
                </ul>
            </li>
        </ul>

        <SectionTitle>6. Segurança dos Dados</SectionTitle>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li>Os dados armazenados localmente estão protegidos pela segurança do seu próprio navegador.</li>
            <li>A comunicação entre a aplicação e a API do Google Gemini é feita através de uma conexão segura HTTPS.</li>
        </ul>

        <SectionTitle>7. Privacidade de Crianças</SectionTitle>
        <p>A aplicação "Assistente de PEI com IA" é uma ferramenta destinada ao uso por profissionais da educação.</p>
        <ul className="list-disc list-inside space-y-1 my-3 pl-4">
            <li>A aplicação não coleta intencionalmente dados de crianças.</li>
            <li>É de responsabilidade do profissional que utiliza a ferramenta garantir que possui o consentimento necessário dos pais ou responsáveis legais para inserir e processar informações sobre os alunos, conforme as políticas da sua instituição de ensino e a legislação local.</li>
        </ul>

        <SectionTitle>8. Alterações a Esta Política de Privacidade</SectionTitle>
        <p>Podemos atualizar esta política de privacidade periodicamente. Quaisquer alterações serão publicadas nesta página, e recomendamos que a reveja de tempos em tempos.</p>

        <SectionTitle>9. Contato</SectionTitle>
        <p>Se você tiver alguma dúvida sobre esta política de privacidade, entre em contato conosco através do e-mail: <a href="mailto:danilofelipe862@educar.rn.gov.br" className="text-indigo-600 hover:underline">danilofelipe862@educar.rn.gov.br</a>.</p>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl mt-auto">
        <label htmlFor="privacy-agree" className="flex items-center cursor-pointer select-none">
          <input 
            id="privacy-agree"
            type="checkbox" 
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
            className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="ml-3 text-sm text-gray-700">Eu li e concordo com a Política de Privacidade.</span>
        </label>
      </div>
    </div>
  );
};