import React, { useState } from 'react';
import { HierarchyNode, EntityType } from '../types';
import { Folder, FileText, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';

interface HierarchyProps {
  data: HierarchyNode[];
  onSelectNode: (node: HierarchyNode) => void;
  activeNodeId: string | null;
}

const TreeNode: React.FC<{ 
  node: HierarchyNode; 
  onSelect: (n: HierarchyNode) => void; 
  activeId: string | null; 
}> = ({ node, onSelect, activeId }) => {
  const [isOpen, setIsOpen] = useState(true); // Default open for prototype
  const isActive = activeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const hasComments = node.comments && node.comments.length > 0;

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer group transition-colors relative
          ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}
        `}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Toggle Icon or Spacer */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0" onClick={hasChildren ? toggleOpen : undefined}>
           {hasChildren ? (
               isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
           ) : null}
        </div>

        {/* Folder/File Icon */}
        <div className="shrink-0">
           {node.isFolder ? (
               <Folder className={`w-4 h-4 ${isActive ? 'fill-blue-200 text-blue-600' : 'fill-slate-200 text-slate-400'}`} />
           ) : (
               <FileText className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
           )}
        </div>

        {/* Label */}
        <span className={`text-sm truncate flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
            {node.label}
        </span>

        {/* Comment Indicator Balloon */}
        {hasComments && (
           <div 
             className="w-5 h-5 flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors"
             title={`${node.comments?.length} comentário(s)`}
           >
              <MessageCircle className="w-4 h-4 fill-blue-100" />
           </div>
        )}

        {/* Page Number */}
        <span className="text-xs text-slate-400 font-medium px-2">
            p. {node.pageId}
        </span>
        
        {node.type === EntityType.OBLIGATION && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded border border-yellow-200">
                Média
            </span>
        )}
      </div>

      {isOpen && hasChildren && (
        <div>
           {node.children!.map((child) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                onSelect={onSelect} 
                activeId={activeId} 
              />
           ))}
        </div>
      )}
    </div>
  );
};

export const Hierarchy: React.FC<HierarchyProps> = ({ data, onSelectNode, activeNodeId }) => {
  return (
    <div>
       <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
         <Folder className="w-5 h-5 text-blue-600" />
         Estrutura Hierárquica
       </h3>
       
       <div className="border rounded-xl p-4 bg-white shadow-sm border-slate-100">
          {data.map(node => (
            <TreeNode key={node.id} node={node} onSelect={onSelectNode} activeId={activeNodeId} />
          ))}
       </div>
    </div>
  );
};