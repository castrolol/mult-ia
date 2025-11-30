import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, FileText, ShieldAlert, BrainCircuit, ArrowRight, File, Zap, Lock, BarChart3 } from 'lucide-react';

interface UploadScreenProps {
  onUploadComplete: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progressStep, setProgressStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps to simulate the AI "Thinking"
  const processingSteps = [
    { label: "Digitalizando estrutura do documento...", icon: FileText },
    { label: "Identificando cláusulas e obrigações...", icon: BrainCircuit },
    { label: "Calculando matriz de riscos e prazos...", icon: ShieldAlert },
    { label: "Gerando visualizações inteligentes...", icon: BarChart3 },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startSimulation();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startSimulation();
    }
  };

  const startSimulation = () => {
    setUploadStatus('processing');
    setProgressStep(0);
  };

  useEffect(() => {
    if (uploadStatus === 'processing') {
      const totalSteps = processingSteps.length;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        setProgressStep(currentStep);

        if (currentStep >= totalSteps) {
          clearInterval(interval);
          setTimeout(() => {
            setUploadStatus('done');
            setTimeout(onUploadComplete, 800);
          }, 600);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [uploadStatus, onUploadComplete]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-x-hidden font-sans text-slate-900 selection:bg-blue-100 flex flex-col">
      
      {/* Background Decor - Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Background Decor - Vibrant Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000 pointer-events-none"></div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf"
      />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-8 lg:py-12">
        
        {/* Brand Header */}
        <div className="text-center mb-8 lg:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center items-center gap-4 mb-4">
             <div className="w-16 h-16 relative">
                <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
                    <path d="M20 10 C 12 10 5 17 5 25 V 95 C 5 103 12 110 20 110 H 80 C 88 110 95 103 95 95 V 35 L 70 10 H 20 Z" stroke="#1e293b" strokeWidth="6" fill="white" strokeLinejoin="round" />
                    <path d="M70 10 V 35 H 95" stroke="#1e293b" strokeWidth="6" strokeLinejoin="round" fill="white"/>
                    <path d="M25 50 H 75" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                    <path d="M25 70 H 65" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                    <path d="M10 55 C 5 40 25 20 45 25 C 65 30 70 50 60 60 C 50 70 30 70 25 65 C 15 60 15 60 10 55 Z" fill="#2563eb" opacity="0.9" style={{mixBlendMode: 'multiply'}} />
                    <path d="M60 65 C 75 55 90 65 85 85 C 80 105 60 100 55 90 C 50 80 55 70 60 65 Z" fill="#f97316" opacity="0.9" style={{mixBlendMode: 'multiply'}} />
                </svg>
             </div>
             <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                Mult.<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">IA</span>
             </h1>
          </div>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            Inteligência Artificial para Análise Contratual Multivisual
          </p>
        </div>

        {/* Card Container - Wider and Split */}
        <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[600px] transition-all duration-500 hover:shadow-blue-900/5 animate-in zoom-in-95 duration-500 mb-8">
          
          {/* LEFT: Upload Area (60% width) */}
          <div className="flex-[1.5] p-8 lg:p-12 xl:p-16 flex flex-col justify-center bg-white relative order-2 lg:order-1">
            
            {uploadStatus === 'idle' ? (
              <div className="h-full flex flex-col">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Comece sua análise</h2>
                    <p className="text-slate-500 text-lg">Faça upload do Edital ou Contrato para gerar insights automáticos.</p>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleButtonClick}
                  className={`
                    flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-10 transition-all duration-300 cursor-pointer group min-h-[300px]
                    ${isDragging 
                      ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}
                  `}
                >
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className={`w-10 h-10 text-blue-600 ${isDragging ? 'animate-bounce' : ''}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Clique ou arraste seu PDF</h3>
                  <p className="text-slate-400 mb-8 text-center">Suporta arquivos PDF até 50MB</p>
                  
                  <button className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3">
                    Selecionar do Computador <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Recentes */}
                <div className="mt-8">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Arquivos Recentes</p>
                   <div className="flex flex-wrap gap-4">
                      {[
                        { name: 'Edital_Pregão_90015.pdf', size: '2.4 MB', date: 'Há 2 horas' },
                        { name: 'Contrato_Servicos_TI.pdf', size: '1.8 MB', date: 'Ontem' },
                      ].map((file, i) => (
                        <button 
                          key={i} 
                          onClick={startSimulation}
                          className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group min-w-[240px] flex-1 lg:flex-none"
                        >
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform shrink-0">
                              <File className="w-5 h-5" />
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors truncate">{file.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{file.size} • {file.date}</p>
                           </div>
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            ) : (
              // Processing State
              <div className="h-full flex flex-col justify-center items-center max-w-md mx-auto w-full py-12">
                 <div className="relative mb-12">
                    <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200 animate-pulse">
                       <BrainCircuit className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                 </div>
                 
                 <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Processando...</h2>
                 <p className="text-slate-500 mb-10 text-center">Nossa IA está estruturando seu documento.</p>

                 <div className="w-full space-y-5">
                    {processingSteps.map((step, idx) => {
                      const isCompleted = idx < progressStep;
                      const isCurrent = idx === progressStep;
                      const isPending = idx > progressStep;

                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 
                            ${isCurrent 
                                ? 'bg-blue-50 border-blue-200 shadow-md scale-105' 
                                : isCompleted ? 'bg-white border-slate-100 opacity-50' : 'bg-transparent border-transparent opacity-30'}
                          `}
                        >
                           <div className={`
                             w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 shrink-0
                             ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                             ${isCurrent ? 'border-blue-500 border-t-transparent animate-spin' : ''}
                             ${isPending ? 'border-slate-300' : ''}
                           `}>
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : null}
                              {isCurrent && <step.icon className="w-4 h-4 text-blue-600" />}
                           </div>
                           <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-800' : 'text-slate-600'}`}>
                             {step.label}
                           </span>
                        </div>
                      )
                    })}
                 </div>
              </div>
            )}
          </div>

          {/* RIGHT: Value Proposition (Dark Mode for Contrast) */}
          <div className="lg:w-[400px] bg-slate-900 p-12 flex flex-col justify-between relative overflow-hidden order-1 lg:order-2 shrink-0">
             
             {/* Abstract Decor */}
             <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]"></div>
             <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px]"></div>

             <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
                    <Zap className="w-3 h-3" />
                    Potencializado por IA
                </div>

                <h3 className="text-3xl font-bold text-white mb-6 leading-tight">
                   Revele o invisível nos seus contratos.
                </h3>
                
                <div className="space-y-8">
                   <div className="flex gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 shrink-0 border border-slate-700">
                         <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-white font-bold text-lg">Visão Multidimensional</h4>
                         <p className="text-slate-400 text-sm mt-1 leading-relaxed">Alterne entre Linha do Tempo, Matriz de Riscos e Árvore Hierárquica.</p>
                      </div>
                   </div>

                   <div className="flex gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-red-400 shrink-0 border border-slate-700">
                         <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-white font-bold text-lg">Proteção Jurídica</h4>
                         <p className="text-slate-400 text-sm mt-1 leading-relaxed">Identificação automática de cláusulas abusivas e prazos críticos.</p>
                      </div>
                   </div>

                   <div className="flex gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-green-400 shrink-0 border border-slate-700">
                         <Lock className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-white font-bold text-lg">Conformidade Total</h4>
                         <p className="text-slate-400 text-sm mt-1 leading-relaxed">Validação cruzada de requisitos técnicos e documentais.</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="relative z-10 mt-12 pt-8 border-t border-slate-800">
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-3">
                      {[1,2,3].map(i => (
                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-white font-bold z-${30-i*10}`}>
                           {String.fromCharCode(64+i)}
                        </div>
                      ))}
                   </div>
                   <div>
                      <p className="text-white text-sm font-bold">Confiança do Mercado</p>
                      <p className="text-slate-500 text-xs">Utilizado por +500 analistas</p>
                   </div>
                </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm font-medium">
           <span>© 2024 Mult.IA Hackathon</span>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <a href="#" className="hover:text-blue-600 transition-colors">Privacidade</a>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <a href="#" className="hover:text-blue-600 transition-colors">Segurança</a>
        </div>

      </div>
    </div>
  );
};