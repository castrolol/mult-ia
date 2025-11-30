/**
 * Traduções para PT-BR
 * Mapeamento de valores do backend para português brasileiro
 */

import type {
  DocumentStatus,
  EntityType,
  ImportanceLevel,
  DocumentSectionLevel,
  LicitacaoPhase,
  ProbabilityLevel,
  DateType,
} from '../api-client'

// ============================================================================
// STATUS DE DOCUMENTOS
// ============================================================================

export const documentStatus: Record<DocumentStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
}

// ============================================================================
// TIPOS DE ENTIDADES
// ============================================================================

export const entityTypes: Record<EntityType, string> = {
  PRAZO: 'Prazo',
  DATA: 'Data',
  OBRIGACAO: 'Obrigação',
  REQUISITO: 'Requisito',
  MULTA: 'Multa',
  SANCAO: 'Sanção',
  RISCO: 'Risco',
  REGRA_ENTREGA: 'Regra de Entrega',
  CERTIDAO_TECNICA: 'Certidão Técnica',
  DOCUMENTACAO: 'Documentação',
  OUTRO: 'Outro',
}

// ============================================================================
// NÍVEIS DE IMPORTÂNCIA
// ============================================================================

export const importanceLevels: Record<ImportanceLevel, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
}

// ============================================================================
// NÍVEIS DE PROBABILIDADE
// ============================================================================

export const probabilityLevels: Record<ProbabilityLevel, string> = {
  CERTAIN: 'Certo',
  LIKELY: 'Provável',
  POSSIBLE: 'Possível',
  UNLIKELY: 'Improvável',
}

// ============================================================================
// FASES DO PROCESSO LICITATÓRIO
// ============================================================================

export const licitacaoPhases: Record<LicitacaoPhase, string> = {
  PUBLICACAO: 'Publicação',
  ESCLARECIMENTOS: 'Esclarecimentos',
  IMPUGNACAO: 'Impugnação',
  CADASTRO: 'Cadastro',
  ENVIO_PROPOSTA: 'Envio de Proposta',
  ABERTURA_PROPOSTAS: 'Abertura das Propostas',
  SESSAO_PUBLICA: 'Sessão Pública',
  LANCES: 'Lances',
  JULGAMENTO: 'Julgamento',
  HABILITACAO: 'Habilitação',
  RECURSOS: 'Recursos',
  ADJUDICACAO: 'Adjudicação',
  HOMOLOGACAO: 'Homologação',
  ASSINATURA: 'Assinatura',
  EXECUCAO: 'Execução',
  PAGAMENTO: 'Pagamento',
  GARANTIA: 'Garantia',
  OUTRO: 'Outro',
}

// ============================================================================
// NÍVEIS HIERÁRQUICOS
// ============================================================================

export const sectionLevels: Record<DocumentSectionLevel, string> = {
  CHAPTER: 'Capítulo',
  SECTION: 'Seção',
  CLAUSE: 'Cláusula',
  SUBCLAUSE: 'Subcláusula',
  ITEM: 'Item',
}

// ============================================================================
// TIPOS DE DATA
// ============================================================================

export const dateTypes: Record<DateType, string> = {
  FIXED: 'Data Fixa',
  RELATIVE: 'Data Relativa',
  RANGE: 'Intervalo',
}

// ============================================================================
// TIPOS DE RELACIONAMENTO
// ============================================================================

export const relationshipTypes: Record<string, string> = {
  DEPENDS_ON: 'Depende de',
  TRIGGERS: 'Dispara',
  SAME_DATE: 'Mesma data',
  SAME_VALUE: 'Mesmo valor',
  PREREQUISITE: 'Pré-requisito para',
  CONSEQUENCE: 'Consequência de',
  PENALTY_FOR: 'Penalidade para',
  REQUIRED_BY: 'Requerido por',
}

// ============================================================================
// UNIDADES DE TEMPO
// ============================================================================

export const timeUnits: Record<string, string> = {
  DAYS: 'dias',
  BUSINESS_DAYS: 'dias úteis',
  MONTHS: 'meses',
}

// ============================================================================
// DIREÇÕES DE TEMPO
// ============================================================================

export const timeDirections: Record<string, string> = {
  BEFORE: 'antes',
  AFTER: 'após',
}

// ============================================================================
// TIPOS DE PENALIDADE
// ============================================================================

export const penaltyTypes: Record<string, string> = {
  MULTA: 'Multa',
  SANCAO: 'Sanção',
}

// ============================================================================
// TEXTOS DA UI
// ============================================================================

export const ui = {
  // Navegação
  voltar: 'Voltar',
  inicio: 'Início',
  documentos: 'Documentos',

  // Abas
  hierarquia: 'Hierarquia',
  timeline: 'Timeline',

  // Ações
  processar: 'Processar',
  processando: 'Processando...',
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  enviar: 'Enviar',
  excluir: 'Excluir',
  editar: 'Editar',
  fechar: 'Fechar',
  expandir: 'Expandir',
  recolher: 'Recolher',

  // Upload
  uploadTitulo: 'Enviar Documentos PDF',
  uploadDescricao: 'Arraste e solte arquivos para iniciar o processamento.',
  arquivosProcessando: 'Arquivos em Processamento',
  novoDocumento: 'Novo Documento',
  fazerUpload: 'Fazer Upload',

  // Documentos
  nenhumDocumento: 'Nenhum documento encontrado',
  comeceFazendoUpload: 'Comece fazendo upload do seu primeiro documento',
  paginas: 'páginas',
  carregandoDocumentos: 'Carregando documentos...',
  erroCarregarDocumentos: 'Erro ao carregar documentos',
  erroCarregarDocumento: 'Erro ao carregar documento',
  documentoNaoEncontrado: 'Documento não encontrado',

  // Timeline
  nenhumEvento: 'Nenhum evento na timeline ainda',
  processeDocumento: 'Processe o documento para ver a timeline',
  diasRestantes: 'dias restantes',
  diaRestante: 'dia restante',
  vencido: 'Vencido',
  venceHoje: 'Vence hoje',

  // Hierarquia
  nenhumItemHierarquia: 'Nenhum item na hierarquia ainda',
  processeParaHierarquia: 'Processe o documento para ver a hierarquia',

  // Comentários
  comentarios: 'Comentários',
  adicionarComentario: 'Adicionar comentário',
  seuComentario: 'Seu comentário...',
  nenhumComentario: 'Nenhum comentário ainda',
  sejaOPrimeiro: 'Seja o primeiro a comentar!',

  // PDF Viewer
  carregandoPdf: 'Carregando PDF...',
  erroCarregarPdf: 'Erro ao carregar PDF',

  // Status
  concluido: 'Concluído',
  cliqueParaVer: 'Clique para ver',

  // Detalhes
  conteudo: 'Conteúdo',
  semConteudo: 'Sem conteúdo disponível para este item.',
  selecioneItem: 'Selecione um item na timeline ou hierarquia para ver os detalhes.',
  quetalComecar: 'Que tal começar explorando o documento?',

  // Riscos
  riscos: 'Riscos',
  riscosIdentificados: 'Riscos Identificados',
  mitigacao: 'Mitigação',
  gatilho: 'Gatilho',
  consequencia: 'Consequência',

  // Erros
  erroGenerico: 'Ocorreu um erro. Tente novamente.',
  erroUpload: 'Erro ao fazer upload',
  erroProcessamento: 'Erro ao processar documento',

  // Confirmações
  confirmarExclusao: 'Tem certeza que deseja excluir?',
}

// ============================================================================
// FUNÇÃO HELPER DE TRADUÇÃO
// ============================================================================

/**
 * Traduz um valor do backend para português
 * @param map Mapa de traduções
 * @param key Chave a ser traduzida
 * @returns Valor traduzido ou a própria chave se não encontrada
 */
export function t<T extends Record<string, string>>(
  map: T,
  key: keyof T | string,
): string {
  return (map as Record<string, string>)[key as string] ?? String(key)
}

/**
 * Formata uma data para exibição em PT-BR
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formata data e hora para exibição em PT-BR
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calcula e formata os dias restantes até uma data
 */
export function formatDaysRemaining(date: string | Date | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays)
    return daysAgo === 1 ? 'Há 1 dia' : `Há ${daysAgo} dias`
  }
  if (diffDays === 0) return ui.venceHoje
  if (diffDays === 1) return 'Em 1 dia'
  return `Em ${diffDays} dias`
}

/**
 * Formata uma referência temporal relativa
 */
export function formatRelativeTime(
  offset: number,
  unit: string,
  direction: string,
): string {
  const unitText = t(timeUnits, unit)
  const directionText = t(timeDirections, direction)
  return `${offset} ${unitText} ${directionText}`
}

