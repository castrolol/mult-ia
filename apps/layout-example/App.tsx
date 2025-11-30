import React, { useState } from 'react';
import { PDFViewer } from './components/PDFViewer';
import { Timeline } from './components/Timeline';
import { Hierarchy } from './components/Hierarchy';
import { ChatPanel } from './components/ChatPanel';
import { UploadScreen } from './components/UploadScreen';
import { RiskPanel } from './components/RiskPanel';
import { pages, timelineEvents, hierarchyData, riskItems } from './mockData';
import { Insight } from './types';
import { Calendar, GitFork, FileText, Search, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ArrowLeft, MessageSquare, AlertTriangle } from 'lucide-react';

enum ViewMode {
  TIMELINE = 'TIMELINE',
  HIERARCHY = 'HIERARCHY',
  CHAT = 'CHAT',
  RISKS = 'RISKS'
}

const App: React.FC = () => {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [activePageId, setActivePageId] = useState<number>(1);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TIMELINE);
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleInsightSelect = (insight: Insight) => {
    setActivePageId(insight.pageId);
    setActiveInsightId(insight.id);
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setActivePageId(prev => Math.max(1, prev - 1));
    } else {
      setActivePageId(prev => Math.min(65, prev + 1)); // Mock max pages 65
    }
  };

  const handleUploadComplete = () => {
    setHasUploaded(true);
  };

  const handleBackToUpload = () => {
    setHasUploaded(false);
    setActivePageId(1);
    setActiveInsightId(null);
  };

  if (!hasUploaded) {
    return <UploadScreen onUploadComplete={handleUploadComplete} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-900 animate-in fade-in duration-500">
      
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-30 shrink-0">
         {/* Left: Document Info */}
         <div className="flex items-center gap-4">
            <button 
              onClick={handleBackToUpload}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Voltar para upload"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
               <FileText className="w-5 h-5" />
            </div>
            <div>
               <h1 className="font-semibold text-sm text-slate-900 leading-tight">Pregão Eletrônico Nº 90015/2024</h1>
               <p className="text-xs text-slate-500">FOUSP - Faculdade de Odontologia/USP</p>
            </div>
         </div>

         {/* Center: Zoom Controls */}
         <div className="flex items-center gap-4 text-slate-500">
            <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:bg-slate-100 rounded">
                <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium w-12 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="p-1 hover:bg-slate-100 rounded">
                <ZoomIn className="w-5 h-5" />
            </button>
         </div>

         {/* Right: Pagination */}
         <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange('prev')} className="p-1 hover:bg-slate-100 rounded text-slate-500">
               <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium">
               {activePageId} / 65
            </div>
            <button onClick={() => handlePageChange('next')} className="p-1 hover:bg-slate-100 rounded text-slate-500">
               <ChevronRight className="w-5 h-5" />
            </button>
         </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Main Content Area: PDF Viewer */}
        <main className="flex-1 bg-slate-100/50 relative overflow-hidden flex flex-col items-center">
           <PDFViewer 
             pages={pages} 
             activePageId={activePageId} 
             activeHighlightId={activeInsightId} 
           />
        </main>

        {/* Right Sidebar: Analysis Panel */}
        <aside className="w-[480px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
           
           {/* Sidebar Header */}
           <div className="p-6 pb-2 flex items-center gap-3">
              <div className="w-8 h-8">
                 <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M20 10 C 12 10 5 17 5 25 V 95 C 5 103 12 110 20 110 H 80 C 88 110 95 103 95 95 V 35 L 70 10 H 20 Z" stroke="#334155" strokeWidth="8" fill="white" strokeLinejoin="round" />
                    <path d="M70 10 V 35 H 95" stroke="#334155" strokeWidth="8" strokeLinejoin="round" fill="white"/>
                    <path d="M25 50 H 75" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                    <path d="M25 70 H 65" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                    <path d="M10 55 C 5 40 25 20 45 25 C 65 30 70 50 60 60 C 50 70 30 70 25 65 C 15 60 15 60 10 55 Z" fill="#2563eb" opacity="0.9" style={{mixBlendMode: 'multiply'}} />
                    <path d="M60 65 C 75 55 90 65 85 85 C 80 105 60 100 55 90 C 50 80 55 70 60 65 Z" fill="#f97316" opacity="0.9" style={{mixBlendMode: 'multiply'}} />
                 </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-none">Mult.IA</h2>
                <p className="text-xs text-slate-500">Análise Contratual Inteligente</p>
              </div>
           </div>

           {/* Context Card with RISK BUTTON */}
           <div className="px-6 py-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1 leading-tight">Pregão Nº 90015/2024</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">Aquisição de Monitores, Tablets e Microcomputadores</p>
                  </div>
                  
                  {/* Risk Alert Button */}
                  <button 
                    onClick={() => setViewMode(ViewMode.RISKS)}
                    className={`
                      shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm
                      ${viewMode === ViewMode.RISKS 
                        ? 'bg-red-600 text-white ring-2 ring-red-200' 
                        : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'}
                    `}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    3 Riscos
                  </button>
              </div>
           </div>

           {/* Navigation Tabs */}
           <div className="px-6 flex gap-2 mb-6">
              <button 
                onClick={() => setViewMode(ViewMode.TIMELINE)}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                  viewMode === ViewMode.TIMELINE 
                    ? 'bg-white border border-slate-200 shadow-sm text-slate-900 ring-1 ring-slate-200' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Timeline
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.HIERARCHY)}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                  viewMode === ViewMode.HIERARCHY 
                    ? 'bg-white border border-slate-200 shadow-sm text-slate-900 ring-1 ring-slate-200' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <GitFork className="w-4 h-4" />
                Hierarquia
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.CHAT)}
                className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                  viewMode === ViewMode.CHAT 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat IA
              </button>
           </div>

           {/* Scrollable Content Area */}
           <div className="flex-1 overflow-y-auto px-6 pb-6">
              {viewMode === ViewMode.TIMELINE && (
                <Timeline 
                  events={timelineEvents} 
                  onSelectEvent={handleInsightSelect} 
                  activeEventId={activeInsightId}
                />
              )}
              
              {viewMode === ViewMode.HIERARCHY && (
                <Hierarchy 
                  data={hierarchyData} 
                  onSelectNode={handleInsightSelect} 
                  activeNodeId={activeInsightId}
                />
              )}

              {viewMode === ViewMode.RISKS && (
                <RiskPanel 
                  risks={riskItems}
                  onSelectRisk={handleInsightSelect}
                  activeRiskId={activeInsightId}
                />
              )}

              {viewMode === ViewMode.CHAT && (
                <div className="h-full">
                   <ChatPanel />
                </div>
              )}
           </div>

        </aside>
      </div>
    </div>
  );
};

export default App;