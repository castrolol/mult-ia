import React from 'react';

export interface DocumentPage {
  id: number;
  content: React.ReactNode;
}

export enum EntityType {
  DATE = 'DATE',
  MONEY = 'MONEY',
  OBLIGATION = 'OBLIGATION',
  RISK = 'RISK',
  SECTION = 'SECTION',
}

export interface Comment {
  id: string;
  author: string;
  initials: string;
  date: string;
  text: string;
}

export interface Insight {
  id: string;
  type: EntityType;
  label: string;
  description?: string;
  pageId: number;
  highlightText: string;
  comments?: Comment[];
}

export interface TimelineEvent extends Insight {
  date: string;
  timestamp: number;
  tag?: string;      // e.g., "Entrega"
  requirements?: string[];
  risks?: string[];
}

export interface HierarchyNode extends Insight {
  children?: HierarchyNode[];
  level: number;
  isFolder?: boolean;
}

export interface RiskItem extends Insight {
  probability: 'Alta' | 'Média' | 'Baixa';
  impact: 'Alto' | 'Médio' | 'Baixo';
  mitigation?: string;
}