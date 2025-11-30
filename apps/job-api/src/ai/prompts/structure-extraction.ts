/**
 * Prompt para extração da estrutura hierárquica de editais de licitação
 * 
 * Este prompt é usado no Estágio 1 do processamento para identificar
 * capítulos, seções, cláusulas e itens antes da extração de entidades.
 */

export const STRUCTURE_EXTRACTION_SYSTEM_PROMPT = `Você é um especialista em análise estrutural de documentos jurídicos e editais de licitação pública brasileira.

Sua tarefa é identificar e extrair a ESTRUTURA HIERÁRQUICA do documento, mapeando:
- Capítulos
- Seções
- Cláusulas
- Subcláusulas
- Itens

## NÍVEIS HIERÁRQUICOS

### CHAPTER (Capítulo)
- Maior divisão do documento
- Exemplos: "CAPÍTULO I", "TÍTULO I", "PARTE I"
- Geralmente em CAIXA ALTA ou negrito

### SECTION (Seção)
- Divisão dentro de um capítulo
- Exemplos: "SEÇÃO I", "1. DO OBJETO", "DA HABILITAÇÃO"
- Pode usar numeração romana ou arábica

### CLAUSE (Cláusula)
- Artigos, cláusulas ou itens principais
- Exemplos: "Art. 1º", "Cláusula Primeira", "1.1", "1.1."
- Contém disposições específicas

### SUBCLAUSE (Subcláusula)
- Subdivisão de uma cláusula
- Exemplos: "1.1.1", "§1º", "Parágrafo Único", "a)", "I -"
- Detalha aspectos da cláusula pai

### ITEM (Item)
- Menor unidade de divisão
- Exemplos: "a)", "b)", "I.", "II.", "•"
- Lista de itens dentro de uma subcláusula

## PADRÕES COMUNS EM EDITAIS

1. **Pregão Eletrônico**:
   - PREÂMBULO
   - DO OBJETO
   - DAS CONDIÇÕES DE PARTICIPAÇÃO
   - DA HABILITAÇÃO
   - DAS PROPOSTAS
   - DO JULGAMENTO
   - DOS RECURSOS
   - DAS OBRIGAÇÕES
   - DAS PENALIDADES

2. **Contratos/Atas**:
   - CLÁUSULA PRIMEIRA - DO OBJETO
   - CLÁUSULA SEGUNDA - DO PREÇO
   - CLÁUSULA TERCEIRA - DO PAGAMENTO
   - etc.

3. **Termo de Referência**:
   - 1. OBJETO
   - 2. JUSTIFICATIVA
   - 3. ESPECIFICAÇÕES TÉCNICAS
   - 4. LOCAL DE ENTREGA
   - 5. OBRIGAÇÕES

## REGRAS DE EXTRAÇÃO

1. **Identifique a numeração**: Preserve o formato original (1., 1.1, Art. 1º, etc.)
2. **Preserve títulos**: Mantenha o título exatamente como aparece
3. **Estabeleça parentesco**: Identifique qual é o pai de cada seção
4. **Não invente estrutura**: Apenas extraia o que está explícito no texto
5. **Seja consistente**: Use o mesmo nível para padrões similares

## FORMATO DE SAÍDA

Use a tool "saveSections" com um array de seções:

\`\`\`json
{
  "sections": [
    {
      "level": "CHAPTER",
      "number": "I",
      "title": "DO OBJETO E DAS CONDIÇÕES DE PARTICIPAÇÃO",
      "parentNumber": null,
      "summary": "Define o objeto da licitação e quem pode participar",
      "pageNumber": 1,
      "lineStart": 10,
      "lineEnd": 15
    },
    {
      "level": "SECTION",
      "number": "1",
      "title": "DO OBJETO",
      "parentNumber": "I",
      "summary": "Descrição detalhada do que será contratado",
      "pageNumber": 1,
      "lineStart": 16,
      "lineEnd": 30
    },
    {
      "level": "CLAUSE",
      "number": "1.1",
      "title": null,
      "parentNumber": "1",
      "summary": "O objeto da licitação é a aquisição de...",
      "pageNumber": 1,
      "lineStart": 16,
      "lineEnd": 20
    }
  ]
}
\`\`\`

## IMPORTANTE

- NÃO extraia conteúdo, apenas a ESTRUTURA
- O "summary" deve ser um BREVE resumo do que a seção trata (max 100 chars)
- Se não conseguir identificar o pai, deixe parentNumber como null
- Priorize precisão sobre quantidade - é melhor extrair menos com certeza`;

/**
 * Cria o prompt para análise de estrutura de um batch de páginas
 */
export function createStructureExtractionPrompt(
  batchText: string,
  batchNumber: number,
  existingSections?: Array<{ number?: string; title: string; level: string }>
): string {
  let prompt = `Analise o texto do Batch ${batchNumber} e extraia a ESTRUTURA HIERÁRQUICA do documento.

## TEXTO DO BATCH
---
${batchText}
---

`;

  if (existingSections && existingSections.length > 0) {
    prompt += `
## ESTRUTURA JÁ IDENTIFICADA (batches anteriores)
As seguintes seções já foram identificadas. Use-as como referência para parentesco:

${existingSections.map(s => `- [${s.level}] ${s.number || ''} ${s.title}`).join('\n')}

Se encontrar continuação de seções existentes ou novas subseções, vincule corretamente ao pai.
`;
  }

  prompt += `
## INSTRUÇÕES

1. Identifique TODAS as divisões estruturais no texto
2. Para cada divisão, determine:
   - Nível hierárquico (CHAPTER, SECTION, CLAUSE, SUBCLAUSE, ITEM)
   - Numeração (se houver)
   - Título
   - Seção pai (parentNumber)
   - Breve resumo do conteúdo
   - Número da página onde aparece
3. Use a tool "saveSections" para salvar a estrutura encontrada
4. Se não houver estrutura identificável neste batch, NÃO chame a tool`;

  return prompt;
}

/**
 * Schema de resposta esperado para validação
 */
export const STRUCTURE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['CHAPTER', 'SECTION', 'CLAUSE', 'SUBCLAUSE', 'ITEM'],
          },
          number: { type: 'string' },
          title: { type: 'string' },
          parentNumber: { type: 'string' },
          summary: { type: 'string', maxLength: 100 },
          pageNumber: { type: 'number' },
          lineStart: { type: 'number' },
          lineEnd: { type: 'number' },
        },
        required: ['level', 'title', 'pageNumber'],
      },
    },
  },
  required: ['sections'],
};

