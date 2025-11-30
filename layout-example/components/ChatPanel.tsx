import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Eu sou o assistente virtual da Mult.IA. Analisei este edital e posso ajudar com dúvidas sobre prazos, requisitos ou riscos. O que você gostaria de saber?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "Com base na cláusula 4.1, o prazo de entrega é de 15 dias corridos após a assinatura.",
        "Identifiquei um risco alto na cláusula 4.9 referente à multa moratória de 0,5% ao dia.",
        "Os requisitos técnicos para os tablets estão detalhados na página 24 do Termo de Referência.",
        "Sim, a empresa deve apresentar atestado de capacidade técnica compatível com o objeto.",
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: randomResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
           <Bot className="w-5 h-5 text-blue-600" />
        </div>
        <div>
           <h3 className="font-bold text-slate-900 text-sm">Assistente Mult.IA</h3>
           <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500">Online</span>
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
              ${msg.sender === 'ai' ? 'bg-white border-slate-200 text-blue-600' : 'bg-slate-900 border-slate-900 text-white'}
            `}>
               {msg.sender === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            
            <div className={`
              max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
              ${msg.sender === 'ai' 
                ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none' 
                : 'bg-blue-600 text-white rounded-tr-none'}
            `}>
               {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                 <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
         <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre o edital..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition-colors shadow-sm"
            >
               <Send className="w-5 h-5" />
            </button>
         </div>
         <p className="text-[10px] text-center text-slate-400 mt-2">A IA pode cometer erros. Verifique as informações importantes no documento.</p>
      </div>
    </div>
  );
};