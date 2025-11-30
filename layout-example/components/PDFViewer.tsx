import React, { useRef, useEffect } from 'react';
import { DocumentPage } from '../types';

interface PDFViewerProps {
  pages: DocumentPage[];
  activeHighlightId: string | null;
  activePageId: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pages, activeHighlightId, activePageId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    // Scroll to active page
    if (activePageId && containerRef.current) {
        // Find the specific page element or the closest one if not rendered in mock
        const targetElement = pageRefs.current[activePageId];
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
  }, [activePageId]);

  // We filter to show all pages in a vertical list, simulating a PDF reader
  // If a page isn't in our mock data, we don't render it, but in a real app we'd fetch it.
  // For the prototype, we assume the pages array contains the relevant pages to show.

  return (
    <div 
      ref={containerRef}
      className="h-full w-full overflow-y-auto p-8 space-y-8 flex flex-col items-center"
    >
      {/* If page 1 is active but not in view (simulated), this ensures we see something */}
      {pages.map((page) => (
        <div
          key={page.id}
          ref={(el) => {
            pageRefs.current[page.id] = el;
          }}
          className={`pdf-page bg-white w-full max-w-[850px] min-h-[1100px] shadow-sm border border-slate-200 relative transition-all duration-300 ${
            activePageId === page.id ? 'ring-4 ring-blue-500/20' : ''
          }`}
        >
          {/* Document Content */}
          <div className="p-12 h-full">
            {page.content}
          </div>
        </div>
      ))}
      
      {/* Placeholder for missing pages in prototype */}
      {pages.length < 65 && (
        <div className="text-slate-400 text-sm py-4 italic">
          ... Outras páginas não carregadas no protótipo ...
        </div>
      )}
    </div>
  );
};