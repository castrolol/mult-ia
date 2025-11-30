import React from 'react';
import { RiskItem } from '../types';
import { AlertTriangle, AlertOctagon, CheckCircle2, ChevronRight } from 'lucide-react';

interface RiskPanelProps {
  risks: RiskItem[];
  onSelectRisk: (risk: RiskItem) => void;
  activeRiskId: string | null;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ risks, onSelectRisk, activeRiskId }) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
         <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
         <div>
            <h3 className="text-sm font-bold text-red-800">Atenção Crítica</h3>
            <p className="text-xs text-red-600 mt-1">Este documento apresenta 3 riscos de alto impacto que exigem mitigação imediata antes da assinatura.</p>
         </div>
      </div>

      <div className="space-y-4">
        {risks.map((risk) => (
          <div 
            key={risk.id}
            onClick={() => onSelectRisk(risk)}
            className={`
              border rounded-xl bg-white p-5 cursor-pointer transition-all duration-200 group relative overflow-hidden
              ${activeRiskId === risk.id 
                ? 'border-red-500 ring-1 ring-red-500/20 shadow-md' 
                : 'border-slate-200 hover:border-red-300 hover:shadow-sm'}
            `}
          >
            {/* Impact/Prob Badges */}
            <div className="flex gap-2 mb-3">
               <span className={`
                 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                 ${risk.impact === 'Alto' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
               `}>
                 Impacto: {risk.impact}
               </span>
               <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                 Probabilidade: {risk.probability}
               </span>
            </div>

            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
               <AlertTriangle className={`w-4 h-4 ${risk.impact === 'Alto' ? 'text-red-500' : 'text-orange-500'}`} />
               {risk.label}
            </h4>
            
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
               {risk.description}
            </p>

            {/* Mitigation Box */}
            {risk.mitigation && (
               <div className="bg-green-50 rounded-lg p-3 border border-green-100/50">
                  <h5 className="text-xs font-bold text-green-800 mb-1 flex items-center gap-1.5">
                     <CheckCircle2 className="w-3.5 h-3.5" />
                     Ação Recomendada (IA):
                  </h5>
                  <p className="text-xs text-green-700 leading-snug">
                     {risk.mitigation}
                  </p>
               </div>
            )}

            {/* Link to Page */}
            <div className="mt-3 flex justify-end">
               <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                  Ver no documento (p. {risk.pageId}) <ChevronRight className="w-3 h-3" />
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};