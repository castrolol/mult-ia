import React from 'react';
import { DocumentPage, TimelineEvent, HierarchyNode, RiskItem, EntityType } from './types';

// --- Document Content ---
export const pages: DocumentPage[] = [
  {
    id: 1,
    content: (
      <div className="flex flex-col items-center justify-center min-h-[800px] font-sans">
        <div className="text-center mb-12">
           <h1 className="text-3xl font-bold text-slate-900 mb-2">PREGÃO ELETRÔNICO Nº 90015/2024</h1>
           <p className="text-xl text-slate-600 font-medium">CONTRATANTE: FOUSP - Faculdade de Odontologia/USP</p>
        </div>

        <div className="w-full max-w-3xl bg-blue-50/50 border border-blue-100 rounded-xl p-8 grid grid-cols-2 gap-y-8 gap-x-12">
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">OBJETO:</p>
              <p className="text-slate-700 leading-relaxed">Aquisição de Monitores, Tablets e Microcomputadores</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">VALOR TOTAL:</p>
              <p className="text-slate-700">Sigiloso</p>
            </div>
            
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">DATA DA SESSÃO PÚBLICA:</p>
              <p className="text-slate-700">06/11/2024</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">HORÁRIO:</p>
              <p className="text-slate-700">09h30</p>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">CRITÉRIO DE JULGAMENTO:</p>
              <p className="text-slate-700">Menor preço por item</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase mb-1">MODO DE DISPUTA:</p>
              <p className="text-slate-700">Aberto</p>
            </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    content: (
      <div className="text-sm leading-relaxed space-y-6 font-serif">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Sumário</h2>
        <ul className="space-y-2 pl-4">
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>1. DO OBJETO</span> <span>3</span></li>
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>2. DA PARTICIPAÇÃO NA LICITAÇÃO</span> <span>3</span></li>
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>3. DA APRESENTAÇÃO DA PROPOSTA</span> <span>5</span></li>
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>5. DA ABERTURA E FASE DE LANCES</span> <span>8</span></li>
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>7. DA FASE DE HABILITAÇÃO</span> <span>14</span></li>
          <li className="flex justify-between hover:bg-yellow-100 cursor-pointer p-1 rounded"><span>9. DAS INFRAÇÕES E SANÇÕES</span> <span>18</span></li>
        </ul>
        <div className="mt-20 pt-10 border-t text-center text-xs text-gray-400">Página 2</div>
      </div>
    ),
  },
  {
    id: 3,
    content: (
      <div className="text-sm leading-relaxed space-y-4 font-serif">
        <h3 className="text-lg font-bold">1. DO OBJETO</h3>
        <p className="text-justify">1.1. O objeto da presente licitação é fornecimento de Monitores, Tablets e Microcomputadores conforme condições, quantidades e exigências estabelecidas neste Edital e seus anexos.</p>
        <p className="text-justify">1.2. A licitação será dividida em itens conforme tabela constante do Termo de Referência.</p>
        
        <h3 className="text-lg font-bold mt-8">2. DA PARTICIPAÇÃO NA LICITAÇÃO</h3>
        <p className="text-justify">2.1. Poderão participar deste Pregão os interessados que estiverem previamente credenciados no Sistema de Cadastramento Unificado de Fornecedores - SICAF.</p>
        <div className="mt-20 pt-10 border-t text-center text-xs text-gray-400">Página 3</div>
      </div>
    ),
  },
  {
    id: 30,
    content: (
      <div className="text-sm leading-relaxed space-y-4 font-serif">
        <h3 className="text-lg font-bold">4. MODELO DE EXECUÇÃO DO OBJETO</h3>
        <div className="bg-yellow-100/50 p-2 rounded">
          <p className="text-justify">4.1. O prazo de entrega dos bens é de 15 (quinze) dias corridos, contados do(a) data de assinatura do contrato/termo de início dos fornecimentos, em remessa única.</p>
        </div>
        <p className="text-justify">4.2. Caso não seja possível a entrega na data assinalada, o fornecedor deverá comunicar as razões respectivas.</p>
        <div className="bg-red-50 p-2 border-l-4 border-red-400 my-4">
             <p className="font-bold text-red-700">4.9. Multa moratória de 0,5% (cinco décimos por cento) ao dia sobre o valor da nota de empenho.</p>
        </div>
         <h3 className="text-lg font-bold mt-8">5. MODELO DE GESTÃO DO CONTRATO</h3>
        <p className="text-justify">5.1. O contrato deverá ser executado fielmente pelas partes.</p>
        <div className="mt-20 pt-10 border-t text-center text-xs text-gray-400">Página 30</div>
      </div>
    ),
  },
  {
    id: 24,
    content: (
      <div className="text-sm leading-relaxed space-y-4 font-serif">
         <h2 className="text-center text-xl font-bold mb-8">TERMO DE REFERÊNCIA</h2>
         <h3 className="text-lg font-bold">1. Itens a Serem Adquiridos</h3>
         <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
                <tr className="bg-slate-100">
                    <th className="border p-2">Item</th>
                    <th className="border p-2">Descrição</th>
                    <th className="border p-2">Qtd</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border p-2 text-center">01</td>
                    <td className="border p-2">Tablets Samsung Galaxy Tab A9+</td>
                    <td className="border p-2 text-center">07</td>
                </tr>
                 <tr>
                    <td className="border p-2 text-center">02</td>
                    <td className="border p-2">Microcomputador All In One</td>
                    <td className="border p-2 text-center">03</td>
                </tr>
            </tbody>
         </table>
         <div className="mt-20 pt-10 border-t text-center text-xs text-gray-400">Página 24</div>
      </div>
    )
  }
];

export const timelineEvents: TimelineEvent[] = [
  {
    id: 'evt-1',
    type: EntityType.DATE,
    label: 'Prazo de Entrega dos Produtos',
    description: 'Prazo máximo para entrega dos bens adquiridos (15 dias corridos após assinatura)',
    pageId: 30,
    highlightText: 'prazo de entrega dos bens é de 15 (quinze) dias corridos',
    date: '14/01/2025',
    timestamp: 1736856000000,
    tag: 'Entrega',
    requirements: [
        'Entrega no endereço: Av. Prof. Lineu Prestes, 2227',
        'Cidade Universitária - São Paulo/SP',
        'Remessa única de todos os itens'
    ],
    risks: [
        'Multa de 2% a 30% sobre o valor contratual',
        'Impedimento de licitar por até 3 anos',
        'Possível rescisão contratual'
    ],
    comments: [
      {
        id: 'c1',
        author: 'Ana Souza',
        initials: 'AS',
        date: 'Hoje, 10:30',
        text: 'Atenção ao endereço de entrega, o campus costuma ter restrições de horário para caminhões grandes.'
      }
    ]
  },
  {
    id: 'evt-2',
    type: EntityType.DATE,
    label: 'Sessão Pública de Lances',
    description: 'Data de realização do pregão eletrônico.',
    pageId: 1,
    highlightText: '06/11/2024',
    date: '06/11/2024',
    timestamp: 1730887200000,
    tag: 'Sessão',
    requirements: [
        'Conexão estável com sistema Compras.gov.br',
        'Credenciamento prévio no SICAF'
    ]
  },
  {
    id: 'evt-3',
    type: EntityType.DATE,
    label: 'Validade da Proposta',
    description: 'Período mínimo de validade das propostas apresentadas.',
    pageId: 3,
    highlightText: 'prazo de validade',
    date: '04/02/2025',
    timestamp: 1738663200000,
    tag: 'Validade',
    risks: ['Desclassificação caso não renovada']
  }
];

export const riskItems: RiskItem[] = [
  {
    id: 'risk-1',
    type: EntityType.RISK,
    label: 'Multa Moratória Elevada',
    description: 'Aplicação de multa de 0,5% ao dia sobre o valor total em caso de atraso injustificado.',
    pageId: 30,
    highlightText: 'Multa moratória de 0,5%',
    probability: 'Média',
    impact: 'Alto',
    mitigation: 'Monitorar rigorosamente o cronograma de entrega e solicitar prorrogação com antecedência mínima de 5 dias.'
  },
  {
    id: 'risk-2',
    type: EntityType.RISK,
    label: 'Rescisão Unilateral',
    description: 'O contrato pode ser rescindido caso a contratada subcontrate o objeto principal.',
    pageId: 30,
    highlightText: 'contrato deverá ser executado fielmente pelas partes',
    probability: 'Baixa',
    impact: 'Alto',
    mitigation: 'Garantir execução direta ou obter autorização expressa para serviços acessórios.'
  },
  {
    id: 'risk-3',
    type: EntityType.RISK,
    label: 'Divergência de Especificação Técnica',
    description: 'Risco de rejeição dos equipamentos caso não atendam exatamente ao Termo de Referência.',
    pageId: 24,
    highlightText: 'Itens a Serem Adquiridos',
    probability: 'Média',
    impact: 'Médio',
    mitigation: 'Validar datasheet de todos os equipamentos com a equipe técnica antes do envio.'
  }
];

export const hierarchyData: HierarchyNode[] = [
  {
    id: 'root-1',
    type: EntityType.SECTION,
    label: '1. DO OBJETO',
    pageId: 3,
    highlightText: '1. DO OBJETO',
    level: 0,
    isFolder: true,
    children: [
        { id: 'sub-1', type: EntityType.SECTION, label: '1.1. Objeto da Licitação', pageId: 3, highlightText: 'objeto da presente licitação', level: 1 }
    ]
  },
  {
    id: 'root-2',
    type: EntityType.SECTION,
    label: '2. DA PARTICIPAÇÃO NA LICITAÇÃO',
    pageId: 3,
    highlightText: '2. DA PARTICIPAÇÃO NA LICITAÇÃO',
    level: 0,
    isFolder: true,
    comments: [
      {
        id: 'hc1',
        author: 'Carlos Jurídico',
        initials: 'CJ',
        date: 'Ontem',
        text: 'Verificar se a exigência do SICAF está atualizada com a nova lei de licitações.'
      }
    ]
  },
  {
    id: 'root-3',
    type: EntityType.SECTION,
    label: '3. DA APRESENTAÇÃO DE PROPOSTA',
    pageId: 2,
    highlightText: '3. DA APRESENTAÇÃO DA PROPOSTA',
    level: 0,
    isFolder: true
  },
  {
    id: 'root-5',
    type: EntityType.SECTION,
    label: '5. DA ABERTURA E FASE DE LANCES',
    pageId: 2,
    highlightText: '5. DA ABERTURA',
    level: 0,
    isFolder: true
  },
  {
    id: 'root-7',
    type: EntityType.SECTION,
    label: '7. DA FASE DE HABILITAÇÃO',
    pageId: 2,
    highlightText: '7. DA FASE',
    level: 0,
    isFolder: true
  },
  {
    id: 'root-9',
    type: EntityType.SECTION,
    label: '9. DAS INFRAÇÕES E SANÇÕES',
    pageId: 2,
    highlightText: '9. DAS INFRAÇÕES',
    level: 0,
    isFolder: true
  },
  {
    id: 'root-tr',
    type: EntityType.SECTION,
    label: 'TERMO DE REFERÊNCIA',
    pageId: 24,
    highlightText: 'TERMO DE REFERÊNCIA',
    level: 0,
    isFolder: true,
    children: [
        { 
            id: 'tr-1', 
            type: EntityType.SECTION, 
            label: '1. Itens a Serem Adquiridos', 
            pageId: 24, 
            highlightText: '1. Itens a Serem Adquiridos', 
            level: 1, 
            isFolder: true,
            children: [
                { id: 'item-1', type: EntityType.OBLIGATION, label: 'Item 01: Tablets Samsung Galaxy Tab A9+', pageId: 24, highlightText: 'Item 01', level: 2 },
                { id: 'item-2', type: EntityType.OBLIGATION, label: 'Item 02: Microcomputador', pageId: 24, highlightText: 'Item 02', level: 2 }
            ]
        }
    ]
  }
];