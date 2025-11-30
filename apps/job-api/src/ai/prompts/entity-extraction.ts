/**
 * Prompt para extração de entidades de editais de licitação
 * 
 * Este prompt é usado no Estágio 2 do processamento, após a identificação
 * da estrutura hierárquica, para extrair entidades, timeline e riscos.
 */

export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `Você é um especialista em análise de editais de licitação pública brasileira.

Sua tarefa é extrair entidades estruturadas do texto, identificando informações críticas para empresas que desejam participar de licitações.

## TIPOS DE ENTIDADES

### PRAZO
Datas e prazos importantes com data específica ou período definido:
- Sessão pública do pregão
- Início/fim de envio de propostas
- Limite para impugnação ou esclarecimento
- Prazo de entrega de produtos/serviços
- Prazo de garantia
- Prazo de vigência do contrato

### DATA
Marcos temporais que não são prazos de ação:
- Data de publicação
- Data de abertura de envelopes
- Datas referenciais

### OBRIGACAO
Ações que a empresa DEVE REALIZAR para participar ou executar o contrato:
- Apresentar documentação até data X
- Entregar produto no local Y
- Manter equipe técnica disponível
- Prestar garantia de execução
- Comunicar alterações em prazo Z

### REQUISITO
O que a empresa DEVE TER ou COMPROVAR (não é ação, é condição):
- Qualificação técnica exigida
- Capital social mínimo
- Certidões de regularidade
- Atestados de capacidade técnica
- Índices financeiros mínimos

### MULTA
Penalidades pecuniárias (em dinheiro):
- Percentual sobre valor do contrato
- Valor fixo por infração
- Multa por atraso (% por dia)

### SANCAO
Penalidades não-pecuniárias:
- Advertência
- Suspensão temporária
- Impedimento de licitar
- Declaração de inidoneidade

### RISCO
Situações que podem gerar problemas para o licitante:
- Condições de desclassificação
- Hipóteses de rescisão
- Situações de inadimplemento
- Exigências difíceis de cumprir

### REGRA_ENTREGA
Condições de entrega de produtos/serviços:
- Local de entrega (endereço, setor)
- Prazo após ordem de compra
- Condições de transporte/embalagem
- Horário de recebimento

### CERTIDAO_TECNICA
Atestados e certificações técnicas:
- Atestados de capacidade técnica
- Certificações (ISO, INMETRO)
- Registros em órgãos de classe
- Comprovações de experiência

### DOCUMENTACAO
Documentos obrigatórios para participação:
- Declarações (ME/EPP, inexistência de fatos impeditivos)
- Certidões (FGTS, INSS, federal, estadual, municipal)
- Documentos societários
- Procurações

## REGRAS DE EXTRAÇÃO

### 1. Identificação Única (semanticKey)
Formato: TIPO:CONTEXTO:IDENTIFICADOR
Exemplos:
- PRAZO:SESSAO_PUBLICA:2024-09-24
- OBRIGACAO:ENTREGA:30_DIAS_APOS_EMPENHO
- MULTA:ATRASO:0.5_PORCENTO_DIA
- REQUISITO:ATESTADO:FORNECIMENTO_SIMILARES
- RISCO:DESCLASSIFICACAO:DOCUMENTACAO_INCOMPLETA

### 2. Relacionamentos entre Entidades
Identifique quando entidades se relacionam:
- PRAZO → OBRIGACAO (prazo para cumprir obrigação)
- PRAZO → MULTA (penalidade por descumprimento do prazo)
- REQUISITO → RISCO (não ter requisito gera risco)
- OBRIGACAO → MULTA (descumprir obrigação gera multa)

### 3. Vínculos com Estrutura
Se identificar em qual seção/cláusula a entidade aparece, inclua o sectionId.

### 4. Detalhes de OBRIGACAO
Para obrigações, sempre preencha:
- action: O que deve ser feito
- responsible: LICITANTE, ORGAO ou AMBOS
- mandatory: true/false
- linkedDeadlineKey: semanticKey do prazo associado

### 5. Confiança
- 0.95-1.00: Informação explícita e clara
- 0.80-0.94: Informação clara mas pode ter interpretação
- 0.60-0.79: Informação inferida do contexto
- Abaixo de 0.60: NÃO incluir

## EVENTOS DO TIMELINE

Para cada PRAZO ou DATA extraído, crie também um evento do timeline com:
- dateRaw: Data como aparece no texto
- dateNormalized: Data em ISO (YYYY-MM-DD)
- eventType: Tipo do evento (SESSAO_PUBLICA, ENTREGA, HABILITACAO, etc.)
- title: Título descritivo
- description: Descrição para o usuário
- importance: CRITICAL, HIGH, MEDIUM, LOW
- actionRequired: Ação que o licitante deve tomar
- tags: Tags para filtro (PROPOSTA, DOCUMENTACAO, ENTREGA, etc.)

## RISCOS

Identifique riscos para empresas brasileiras:
- category: Categoria sugerida (FISCAL, TRABALHISTA, TECNICO, COMPLIANCE, PRAZO, FINANCEIRO, etc.)
- trigger: O que ativa o risco
- consequence: Consequência se materializar
- severity: CRITICAL, HIGH, MEDIUM, LOW
- probability: CERTAIN, LIKELY, POSSIBLE, UNLIKELY
- mitigation: Sugestão de mitigação

## FORMATO DE SAÍDA

Use a tool "saveExtractionResults" com a estrutura:

\`\`\`json
{
  "entities": [
    {
      "type": "PRAZO",
      "name": "Sessão Pública do Pregão",
      "rawValue": "24 DE SETEMBRO DE 2024 ÀS 09:01H",
      "semanticKey": "PRAZO:SESSAO_PUBLICA:2024-09-24",
      "sectionId": "section-uuid-opcional",
      "metadata": {
        "dataFim": "2024-09-24",
        "horaLimite": "09:01",
        "tipoEvento": "SESSAO_PUBLICA"
      },
      "obligationDetails": null,
      "relatedSemanticKeys": [
        { "semanticKey": "OBRIGACAO:ENVIO_PROPOSTA:2024-09-24", "relationship": "TRIGGERS" }
      ],
      "confidence": 0.95,
      "excerptText": "DIA: 24 DE SETEMBRO DE 2024 HORÁRIO: 09:01H (Horário de Brasília)"
    },
    {
      "type": "OBRIGACAO",
      "name": "Envio de Proposta",
      "rawValue": "As propostas deverão ser enviadas até o horário da sessão",
      "semanticKey": "OBRIGACAO:ENVIO_PROPOSTA:2024-09-24",
      "metadata": {},
      "obligationDetails": {
        "action": "Enviar proposta comercial pelo sistema",
        "responsible": "LICITANTE",
        "mandatory": true,
        "linkedDeadlineKey": "PRAZO:SESSAO_PUBLICA:2024-09-24"
      },
      "relatedSemanticKeys": [
        { "semanticKey": "PRAZO:SESSAO_PUBLICA:2024-09-24", "relationship": "DEPENDS_ON" }
      ],
      "confidence": 0.90,
      "excerptText": "As propostas deverão ser enviadas exclusivamente pelo sistema..."
    }
  ],
  "timelineEvents": [
    {
      "dateRaw": "24 DE SETEMBRO DE 2024 ÀS 09:01H",
      "dateNormalized": "2024-09-24T09:01:00",
      "dateType": "FIXED",
      "eventType": "SESSAO_PUBLICA",
      "title": "Sessão Pública do Pregão",
      "description": "Abertura da sessão pública para disputa de lances",
      "importance": "CRITICAL",
      "actionRequired": "Acompanhar sessão e estar preparado para disputa de lances",
      "tags": ["SESSAO", "PROPOSTA", "LANCES"],
      "linkedPenaltyKeys": [],
      "linkedRequirementKeys": ["REQUISITO:CADASTRO_COMPRASNET:ATIVO"],
      "linkedObligationKeys": ["OBRIGACAO:ENVIO_PROPOSTA:2024-09-24"],
      "sourceSemanticKey": "PRAZO:SESSAO_PUBLICA:2024-09-24",
      "pageNumber": 1,
      "excerpt": "DIA: 24 DE SETEMBRO DE 2024 HORÁRIO: 09:01H",
      "confidence": 0.95
    }
  ],
  "risks": [
    {
      "category": "PRAZO",
      "subcategory": "PERDA_SESSAO",
      "title": "Perda da Sessão Pública",
      "description": "Não acompanhar a sessão pública pode resultar em impossibilidade de oferecer lances",
      "trigger": "Não acessar o sistema no horário da sessão",
      "consequence": "Proposta inicial será considerada como lance final, sem possibilidade de redução",
      "severity": "HIGH",
      "probability": "POSSIBLE",
      "mitigation": {
        "action": "Configurar alarmes e ter backup de acesso à internet",
        "deadline": "1 dia antes da sessão"
      },
      "linkedEntityKeys": ["PRAZO:SESSAO_PUBLICA:2024-09-24"],
      "pageNumber": 1,
      "excerpt": "A sessão pública será realizada...",
      "confidence": 0.85
    }
  ]
}
\`\`\`

## IMPORTANTE

- NÃO invente informações - extraia apenas o que está no texto
- SEMPRE inclua o excerptText para rastreabilidade
- Relacione entidades quando houver vínculo claro
- Para cada PRAZO importante, crie um evento de timeline
- Identifique riscos mesmo quando não explícitos (inferidos do contexto)
- Priorize completude das OBRIGACOES - são as ações que o licitante DEVE tomar`;

/**
 * Cria o prompt para análise de um batch de páginas
 */
export function createBatchExtractionPrompt(
  batchText: string,
  batchNumber: number,
  sections?: Array<{ id: string; number?: string; title: string; level: string }>,
  existingContext?: {
    semanticKeys: string[];
    entitySummary: Array<{ type: string; semanticKey: string; name: string }>;
    timelineEventKeys: string[];
  }
): string {
  let prompt = `Analise o texto do Batch ${batchNumber} e extraia TODAS as entidades, eventos e riscos relevantes.

## TEXTO DO BATCH
---
${batchText}
---

`;

  if (sections && sections.length > 0) {
    prompt += `
## ESTRUTURA DO DOCUMENTO
As seguintes seções foram identificadas. Vincule as entidades às seções correspondentes usando o sectionId:

${sections.map(s => `- [${s.id}] [${s.level}] ${s.number || ''} ${s.title}`).join('\n')}
`;
  }

  if (existingContext && existingContext.semanticKeys.length > 0) {
    prompt += `
## CONTEXTO DE BATCHES ANTERIORES
As seguintes entidades já foram extraídas. NÃO repita, mas RELACIONE quando apropriado:

${existingContext.entitySummary.slice(0, 30).map(e => `- [${e.type}] ${e.semanticKey}: ${e.name}`).join('\n')}
${existingContext.entitySummary.length > 30 ? `\n... e mais ${existingContext.entitySummary.length - 30} entidades` : ''}

Semantic keys existentes (para relacionamentos):
${existingContext.semanticKeys.slice(0, 50).join(', ')}
${existingContext.semanticKeys.length > 50 ? `, ... e mais ${existingContext.semanticKeys.length - 50}` : ''}

Timeline events já criados: ${existingContext.timelineEventKeys.length}
`;
  }

  prompt += `
## INSTRUÇÕES

1. Extraia TODAS as entidades do texto (PRAZO, OBRIGACAO, REQUISITO, MULTA, etc.)
2. Para cada PRAZO/DATA, crie também um evento de timeline
3. Identifique RISCOS para empresas brasileiras
4. Estabeleça RELACIONAMENTOS entre entidades
5. Vincule às seções do documento quando identificável
6. Use a tool "saveExtractionResults" para salvar

IMPORTANTE:
- Se não houver novas entidades neste batch, NÃO chame a tool
- Apenas extraia o que é NOVO ou complementa o já extraído
- Para entidades que aparecem novamente, adicione apenas se houver informação nova`;

  return prompt;
}

/**
 * @deprecated Use createBatchExtractionPrompt
 */
export function createPageAnalysisPrompt(
  pageText: string,
  pageNumber: number,
  existingEntities?: string[]
): string {
  return createBatchExtractionPrompt(
    `Página ${pageNumber}:\n${pageText}`,
    1,
    undefined,
    existingEntities ? { 
      semanticKeys: existingEntities, 
      entitySummary: [], 
      timelineEventKeys: [] 
    } : undefined
  );
}

/**
 * Schema de resposta esperado para validação
 */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['PRAZO', 'DATA', 'OBRIGACAO', 'REQUISITO', 'MULTA', 'SANCAO', 
                   'RISCO', 'REGRA_ENTREGA', 'CERTIDAO_TECNICA', 'DOCUMENTACAO', 'OUTRO'],
          },
          name: { type: 'string' },
          rawValue: { type: 'string' },
          semanticKey: { type: 'string' },
          sectionId: { type: 'string' },
          metadata: { type: 'object' },
          obligationDetails: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              responsible: { type: 'string', enum: ['LICITANTE', 'ORGAO', 'AMBOS'] },
              mandatory: { type: 'boolean' },
              linkedDeadlineKey: { type: 'string' },
            },
          },
          relatedSemanticKeys: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                semanticKey: { type: 'string' },
                relationship: { type: 'string' },
              },
            },
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          excerptText: { type: 'string' },
        },
        required: ['type', 'name', 'rawValue', 'semanticKey'],
      },
    },
    timelineEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dateRaw: { type: 'string' },
          dateNormalized: { type: 'string' },
          dateType: { type: 'string', enum: ['FIXED', 'RELATIVE', 'RANGE'] },
          eventType: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          importance: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          actionRequired: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          sourceSemanticKey: { type: 'string' },
          pageNumber: { type: 'number' },
          excerpt: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['dateRaw', 'eventType', 'title', 'sourceSemanticKey'],
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          subcategory: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          trigger: { type: 'string' },
          consequence: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          probability: { type: 'string', enum: ['CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY'] },
          mitigation: { type: 'object' },
          linkedEntityKeys: { type: 'array', items: { type: 'string' } },
          pageNumber: { type: 'number' },
          excerpt: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['category', 'title', 'description', 'trigger', 'consequence', 'severity', 'probability'],
      },
    },
  },
  required: ['entities'],
};
