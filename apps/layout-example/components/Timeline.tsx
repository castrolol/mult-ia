import React, { useState } from 'react';
import { TimelineEvent } from '../types';
import { Clock, AlertCircle, MessageSquare, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  onSelectEvent: (event: TimelineEvent) => void;
  activeEventId: string | null;
}

const TimelineCard: React.FC<{ 
  evt: TimelineEvent; 
  isActive: boolean; 
  onSelect: () => void 
}> = ({ evt, isActive, onSelect }) => {
  const [showComments, setShowComments] = useState(false);
  const commentsCount = evt.comments?.length || 0;

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(!showComments);
  };

  return (
    <div 
      className="relative pl-12 group"
    >
      {/* Icon / Dot */}
      <div 
        className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white z-10 transition-colors ${
          isActive ? 'border-amber-400 text-amber-500' : 'border-slate-300 text-slate-400'
        }`}
      >
         <Clock className="w-5 h-5" />
      </div>

      {/* Card Container */}
      <div 
        onClick={onSelect}
        className={`
          border rounded-xl bg-white transition-all duration-200 cursor-pointer overflow-hidden
          ${isActive 
            ? 'border-blue-500 shadow-lg ring-1 ring-blue-500/20' 
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}
        `}
      >
         {/* Card Body */}
         <div className="p-5">
             {/* Header */}
             <div className="flex justify-between items-center mb-2">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wide">
                    {evt.tag || 'Evento'}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Página {evt.pageId}</span>
                    <span className="text-sm font-bold text-blue-600">{evt.date}</span>
                </div>
             </div>

             {/* Title & Description */}
             <h4 className="text-lg font-bold text-slate-900 mb-2">{evt.label}</h4>
             <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {evt.description}
             </p>

             {/* Requirements Box */}
             {evt.requirements && evt.requirements.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                        Requisitos Necessários:
                    </h5>
                    <ul className="space-y-1">
                        {evt.requirements.map((req, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                                {req}
                            </li>
                        ))}
                    </ul>
                </div>
             )}

             {/* Risks Box */}
             {evt.risks && evt.risks.length > 0 && (
                <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                    <h5 className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Riscos Associados:
                    </h5>
                    <ul className="space-y-1">
                        {evt.risks.map((risk, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                                {risk}
                            </li>
                        ))}
                    </ul>
                </div>
             )}
         </div>

         {/* Comments Footer Action Bar */}
         <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button 
              onClick={(e) => { e.stopPropagation(); /* Add logic */ }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors py-1 px-2 rounded hover:bg-white"
            >
               <Plus className="w-3.5 h-3.5" />
               Adicionar nota
            </button>

            {commentsCount > 0 && (
              <button 
                onClick={toggleComments}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1 px-2 rounded hover:bg-white"
              >
                 <MessageSquare className="w-3.5 h-3.5" />
                 {commentsCount} {commentsCount === 1 ? 'comentário' : 'comentários'}
                 {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
         </div>

         {/* Expanded Comments Section */}
         {showComments && evt.comments && (
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
               {evt.comments.map(comment => (
                 <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                       {comment.initials}
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-bold text-slate-700">{comment.author}</span>
                          <span className="text-[10px] text-slate-400">{comment.date}</span>
                       </div>
                       <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                          {comment.text}
                       </p>
                    </div>
                 </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ events, onSelectEvent, activeEventId }) => {
  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-200"></div>

      <div className="space-y-8">
        {events.map((evt) => (
          <TimelineCard 
            key={evt.id} 
            evt={evt} 
            isActive={activeEventId === evt.id} 
            onSelect={() => onSelectEvent(evt)} 
          />
        ))}
      </div>
    </div>
  );
};