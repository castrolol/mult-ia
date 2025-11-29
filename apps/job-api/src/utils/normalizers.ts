import crypto from 'crypto';
import type { EntityType } from '../types/entities.js';

/**
 * Mapeamento de meses por extenso para número
 */
const MONTHS_MAP: Record<string, string> = {
  'JANEIRO': '01',
  'FEVEREIRO': '02',
  'MARÇO': '03',
  'MARCO': '03',
  'ABRIL': '04',
  'MAIO': '05',
  'JUNHO': '06',
  'JULHO': '07',
  'AGOSTO': '08',
  'SETEMBRO': '09',
  'OUTUBRO': '10',
  'NOVEMBRO': '11',
  'DEZEMBRO': '12',
};

/**
 * Mapeamento de números por extenso
 */
const NUMBER_WORDS: Record<string, number> = {
  'UM': 1, 'UMA': 1,
  'DOIS': 2, 'DUAS': 2,
  'TRÊS': 3, 'TRES': 3,
  'QUATRO': 4,
  'CINCO': 5,
  'SEIS': 6,
  'SETE': 7,
  'OITO': 8,
  'NOVE': 9,
  'DEZ': 10,
  'ONZE': 11,
  'DOZE': 12,
  'TREZE': 13,
  'QUATORZE': 14, 'CATORZE': 14,
  'QUINZE': 15,
  'DEZESSEIS': 16,
  'DEZESSETE': 17,
  'DEZOITO': 18,
  'DEZENOVE': 19,
  'VINTE': 20,
  'VINTE E UM': 21, 'VINTE E UMA': 21,
  'VINTE E DOIS': 22, 'VINTE E DUAS': 22,
  'VINTE E TRÊS': 23, 'VINTE E TRES': 23,
  'VINTE E QUATRO': 24,
  'VINTE E CINCO': 25,
  'VINTE E SEIS': 26,
  'VINTE E SETE': 27,
  'VINTE E OITO': 28,
  'VINTE E NOVE': 29,
  'TRINTA': 30,
  'TRINTA E UM': 31, 'TRINTA E UMA': 31,
  'TRINTA E SEIS': 36,
  'QUARENTA': 40,
  'QUARENTA E CINCO': 45,
  'QUARENTA E OITO': 48,
  'CINQUENTA': 50,
  'SESSENTA': 60,
  'NOVENTA': 90,
  'CEM': 100,
  'CENTO E VINTE': 120,
  'CENTO E OITENTA': 180,
  'TREZENTOS E SESSENTA': 360,
  'TREZENTOS E SESSENTA E CINCO': 365,
};

/**
 * Normaliza datas para formato ISO (YYYY-MM-DD)
 * Suporta formatos:
 * - DD/MM/YYYY
 * - DD DE MÊS DE YYYY
 * - YYYY-MM-DD
 * - DD.MM.YYYY
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim().toUpperCase();
  
  // Padrão: DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const slashPattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
  const slashMatch = cleaned.match(slashPattern);
  if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[3]) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Padrão: DD DE MÊS DE YYYY
  const extensoPattern = /(\d{1,2})\s+DE\s+(\w+)\s+DE\s+(\d{4})/i;
  const extensoMatch = cleaned.match(extensoPattern);
  if (extensoMatch && extensoMatch[1] && extensoMatch[2] && extensoMatch[3]) {
    const day = extensoMatch[1].padStart(2, '0');
    const monthName = extensoMatch[2].toUpperCase();
    const year = extensoMatch[3];
    const month = MONTHS_MAP[monthName];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Padrão: YYYY-MM-DD (já está normalizado)
  const isoPattern = /(\d{4})-(\d{2})-(\d{2})/;
  const isoMatch = cleaned.match(isoPattern);
  if (isoMatch) {
    return isoMatch[0];
  }
  
  return null;
}

/**
 * Normaliza horários para formato HH:mm
 * Suporta formatos:
 * - HH:MM
 * - HHhMM
 * - HH:MMH
 * - HH HORAS
 */
export function normalizeTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const cleaned = timeStr.trim().toUpperCase();
  
  // Padrão: HH:MM ou HH:MMH
  const colonPattern = /(\d{1,2}):(\d{2})H?/i;
  const colonMatch = cleaned.match(colonPattern);
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const hours = colonMatch[1].padStart(2, '0');
    const minutes = colonMatch[2];
    return `${hours}:${minutes}`;
  }
  
  // Padrão: HHhMM ou HHH
  const hPattern = /(\d{1,2})H(\d{2})?/i;
  const hMatch = cleaned.match(hPattern);
  if (hMatch && hMatch[1]) {
    const hours = hMatch[1].padStart(2, '0');
    const minutes = hMatch[2] || '00';
    return `${hours}:${minutes}`;
  }
  
  // Padrão: HH HORAS
  const horasPattern = /(\d{1,2})\s*HORAS?/i;
  const horasMatch = cleaned.match(horasPattern);
  if (horasMatch && horasMatch[1]) {
    const hours = horasMatch[1].padStart(2, '0');
    return `${hours}:00`;
  }
  
  return null;
}

/**
 * Normaliza valores monetários para número
 * Suporta formatos:
 * - R$ 93.810,66
 * - 93810.66
 * - 93.810,66
 */
export function normalizeMonetary(value: string): number | null {
  if (!value) return null;
  
  // Remove símbolo de moeda e espaços
  let cleaned = value
    .replace(/R\$\s*/gi, '')
    .replace(/\s/g, '')
    .trim();
  
  // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
  // Se tem vírgula seguida de exatamente 2 dígitos no final, é formato BR
  if (/,\d{2}$/.test(cleaned)) {
    // Formato brasileiro: remove pontos de milhar, troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{2}$/.test(cleaned) && cleaned.includes(',')) {
    // Formato americano: remove vírgulas de milhar
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza percentuais para decimal
 * Suporta formatos:
 * - 5%
 * - 0,5%
 * - 0.5%
 * - cinco por cento
 */
export function normalizePercentage(value: string): number | null {
  if (!value) return null;
  
  const cleaned = value.trim().toUpperCase();
  
  // Padrão: número seguido de %
  const percentPattern = /(\d+[,.]?\d*)\s*%/;
  const percentMatch = cleaned.match(percentPattern);
  if (percentMatch && percentMatch[1]) {
    const numStr = percentMatch[1].replace(',', '.');
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num / 100;
  }
  
  // Por extenso: "cinco por cento"
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (cleaned.includes(word) && cleaned.includes('POR CENTO')) {
      return num / 100;
    }
  }
  
  return null;
}

/**
 * Normaliza períodos de garantia para meses
 * Suporta formatos:
 * - 36 meses
 * - TRINTA E SEIS MESES
 * - 3 anos
 * - 1 ano
 */
export function normalizeWarrantyPeriod(text: string): number | null {
  if (!text) return null;
  
  const cleaned = text.trim().toUpperCase();
  
  // Verificar números por extenso primeiro (mais específico)
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (cleaned.includes(word)) {
      // Verificar unidade
      if (cleaned.includes('ANO')) {
        return num * 12;
      }
      if (cleaned.includes('MES') || cleaned.includes('MÊS')) {
        return num;
      }
      if (cleaned.includes('DIA')) {
        return Math.round(num / 30); // Aproximação para meses
      }
    }
  }
  
  // Verificar números diretos
  const numPattern = /(\d+)\s*(MESES?|MÊS|ANOS?|DIAS?)/i;
  const numMatch = cleaned.match(numPattern);
  if (numMatch && numMatch[1] && numMatch[2]) {
    const value = parseInt(numMatch[1], 10);
    const unit = numMatch[2].toUpperCase();
    
    if (unit.startsWith('ANO')) {
      return value * 12;
    }
    if (unit.startsWith('MES') || unit.startsWith('MÊS')) {
      return value;
    }
    if (unit.startsWith('DIA')) {
      return Math.round(value / 30);
    }
  }
  
  return null;
}

/**
 * Normaliza período em dias
 * Suporta formatos:
 * - 5 dias úteis
 * - 10 dias corridos
 * - CINCO dias
 */
export function normalizeDaysPeriod(text: string): { days: number; businessDays: boolean } | null {
  if (!text) return null;
  
  const cleaned = text.trim().toUpperCase();
  const isBusinessDays = cleaned.includes('ÚTEIS') || cleaned.includes('UTEIS');
  
  // Verificar números por extenso
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (cleaned.includes(word) && cleaned.includes('DIA')) {
      return { days: num, businessDays: isBusinessDays };
    }
  }
  
  // Verificar números diretos
  const numPattern = /(\d+)\s*DIAS?/i;
  const numMatch = cleaned.match(numPattern);
  if (numMatch && numMatch[1]) {
    return {
      days: parseInt(numMatch[1], 10),
      businessDays: isBusinessDays,
    };
  }
  
  return null;
}

/**
 * Gera chave de deduplicação baseada em tipo + valor normalizado + contexto
 */
export function generateDeduplicationKey(
  type: EntityType,
  normalizedValue: string,
  context?: string
): string {
  const parts = [type, normalizedValue];
  if (context) {
    parts.push(context);
  }
  
  const content = parts.join(':');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Gera ID único para uma entidade
 */
export function generateEntityId(): string {
  return crypto.randomUUID();
}

/**
 * Normaliza texto removendo acentos e convertendo para maiúsculas
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Extrai número de um texto (por extenso ou numérico)
 */
export function extractNumber(text: string): number | null {
  if (!text) return null;
  
  const cleaned = text.trim().toUpperCase();
  
  // Verificar números por extenso
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (cleaned.includes(word)) {
      return num;
    }
  }
  
  // Verificar números diretos
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }
  
  return null;
}

