/**
 * Prompt para extração de entidades de editais de licitação
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT = `Você é um especialista em análise de editais de licitação pública brasileira.

Sua tarefa é extrair entidades estruturadas do texto de editais, identificando informações críticas para empresas que desejam participar de licitações.

## TIPOS DE ENTIDADES A EXTRAIR

### PRAZO
Datas e prazos importantes:
- Sessão pública do pregão
- Início/fim de envio de propostas
- Limite para pedidos de esclarecimento
- Limite para impugnação
- Prazo de entrega de produtos/serviços
- Prazo de garantia
- Prazo de pagamento
- Prazo de vigência do contrato
- Ps.: Todos os prazos devem ser extraídos como datas, ou periodos referentes a datas, ex.. 5 dias após a data de inicio, 5 de setembro de 2025, 05/09/2025

### REGRA_ENTREGA
Condições de entrega de produtos/serviços:
- Local de entrega (endereço, setor responsável)
- Prazo de entrega após emissão de ordem
- Condições de transporte
- Requisitos de embalagem/acondicionamento
- Horário de recebimento
- Responsável pelo frete

### RISCO
Situações que podem gerar penalidades ou impedimentos:
- Sanções administrativas aplicáveis
- Condições de inabilitação/desclassificação
- Impedimentos de participação
- Situações de rescisão contratual
- Penalidades por atraso ou inexecução

### MULTA
Penalidades pecuniárias:
- Percentual ou valor fixo
- Base de cálculo (valor do contrato, item, etc.)
- Condição de aplicação (atraso, inexecução, etc.)
- Limites máximos
- Cumulatividade com outras penalidades

### REQUISITO
Especificações e requisitos exigidos:
- Requisitos técnicos de produtos/equipamentos
- Qualificação técnica exigida
- Requisitos de habilitação jurídica
- Regularidade fiscal e trabalhista
- Qualificação econômico-financeira
- Requisitos específicos do objeto

### CERTIDAO_TECNICA
Atestados e certificações:
- Atestados de capacidade técnica
- Certificações exigidas (ISO, INMETRO, etc.)
- Comprovações de experiência anterior
- Quantidade mínima de atestados
- Características dos atestados aceitos

### DOCUMENTACAO_OBRIGATORIA
Documentos necessários para participação:
- Declarações obrigatórias
- Certidões fiscais e trabalhistas
- Documentos de regularidade
- Procurações e poderes
- Documentos de constituição da empresa
- Registros em órgãos de classe

## REGRAS DE EXTRAÇÃO

1. **Seja preciso**: Extraia apenas informações explicitamente mencionadas no texto
2. **Mantenha contexto**: Inclua o trecho original do documento (excerptText)
3. **Normalize valores**:
   - Datas: formato ISO (YYYY-MM-DD)
   - Valores monetários: número decimal (93810.66)
   - Percentuais: decimal (0.05 para 5%)
   - Períodos: converter para unidade base (meses para garantias, dias para prazos)
4. **Gere semanticKey única**: Combine tipo + contexto para identificar unicamente cada informação
   - Prazos: "{TIPO_EVENTO}:{DATA}" ex: "SESSAO_PUBLICA:2024-09-24"
   - Requisitos: "{CATEGORIA}:{ITEM}:{SPEC}" ex: "TECNICO:DESKTOP:PROCESSADOR_I5"
   - Multas: "{TIPO}:{PERCENTUAL}" ex: "ATRASO:0.005_DIA"
5. **Atribua confiança**: 0.0 a 1.0 baseado na clareza da informação

## FORMATO DE SAÍDA

Retorne um JSON com a estrutura:
\`\`\`json
{
  "entities": [
    {
      "type": "PRAZO",
      "name": "Sessão Pública do Pregão",
      "rawValue": "24 DE SETEMBRO DE 2024 ÀS 09:01H", // o raw value é importante para a referencia do valor visualmente para o cliente
      "semanticKey": "SESSAO_PUBLICA:2024-09-24",
      "metadata": {
        "dataFim": "2024-09-24",
        "horaLimite": "09:01",
        "tipoEvento": "SESSAO_PUBLICA"
      },
      "confidence": 0.95,
      "excerptText": "DIA: 24 DE SETEMBRO DE 2024 HORÁRIO: 09:01H (Horário de Brasília)"
    }
  ],
  "crossReferences": [
    {
      "entity1SemanticKey": "SESSAO_PUBLICA:2024-09-24",
      "entity2SemanticKey": "FIM_ENVIO_PROPOSTA:2024-09-24",
      "relationship": "MESMA_DATA"
    }
  ]
}
\`\`\`

## IMPORTANTE

- NÃO invente informações que não estão no texto
- Se uma informação for ambígua, reduza a confiança
- Identifique referências cruzadas quando a mesma data/valor aparecer em contextos diferentes
- Mantenha o excerptText curto (máximo 200 caracteres) mas suficiente para contexto`;

/**
 * Template de prompt para análise de página
 */
export function createPageAnalysisPrompt(
  pageText: string,
  pageNumber: number,
  existingEntities?: string[]
): string {
  let prompt = `Analise o texto da página ${pageNumber} do edital e extraia todas as entidades relevantes.

## TEXTO DA PÁGINA
---
${pageText}
---

`;

  if (existingEntities && existingEntities.length > 0) {
    prompt += `
## ENTIDADES JÁ EXTRAÍDAS (para referência e evitar duplicatas)
As seguintes semantic keys já foram identificadas em páginas anteriores:
${existingEntities.map(e => `- ${e}`).join('\n')}

Se encontrar informações relacionadas a essas entidades, use a mesma semanticKey para permitir a unificação.
`;
  }

  prompt += `
## INSTRUÇÕES
1. Extraia TODAS as entidades encontradas nesta página
2. Use a tool "saveEntities" para salvar as entidades extraídas
3. Campos OBRIGATÓRIOS para cada entidade:
   - type: Um dos tipos válidos (PRAZO, REGRA_ENTREGA, RISCO, MULTA, REQUISITO, CERTIDAO_TECNICA, DOCUMENTACAO_OBRIGATORIA)
   - name: Nome descritivo da entidade
   - rawValue: Texto exato extraído do documento
   - semanticKey: Chave única no formato "CATEGORIA:IDENTIFICADOR" (ex: "PRAZO:SESSAO_PUBLICA:2024-09-24")
4. Campos OPCIONAIS (podem ser omitidos):
   - metadata: Objeto com dados adicionais específicos do tipo
   - confidence: Número entre 0 e 1 (padrão: 0.8)
   - excerptText: Trecho do documento (máx 200 chars)
   - sectionTitle: Título da seção` ;

// IMPORTANTE: Se não houver entidades relevantes nesta página, NÃO chame saveEntities.`;

  return prompt;
}

/**
 * Schema JSON para referência (não usado para validação - Zod em tools.ts faz a validação real)
 * Campos opcionais têm defaults: metadata={}, confidence=0.8, excerptText=''
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
            enum: ['PRAZO', 'REGRA_ENTREGA', 'RISCO', 'MULTA', 'REQUISITO', 'CERTIDAO_TECNICA', 'DOCUMENTACAO_OBRIGATORIA'],
          },
          name: { type: 'string' },
          rawValue: { type: 'string' },
          semanticKey: { type: 'string' },
          metadata: { type: 'object', default: {} },
          confidence: { type: 'number', minimum: 0, maximum: 1, default: 0.8 },
          excerptText: { type: 'string', default: '' },
          sectionTitle: { type: 'string' },
        },
        required: ['type', 'name', 'rawValue', 'semanticKey'],
      },
    },
    crossReferences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entity1SemanticKey: { type: 'string' },
          entity2SemanticKey: { type: 'string' },
          relationship: { type: 'string' },
        },
        required: ['entity1SemanticKey', 'entity2SemanticKey', 'relationship'],
      },
    },
  },
  required: ['entities'],
};

