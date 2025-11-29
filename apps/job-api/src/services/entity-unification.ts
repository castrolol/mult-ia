import { getDatabase } from './database.js';
import {
  generateDeduplicationKey,
  generateEntityId,
  normalizeDate,
  normalizeMonetary,
  normalizePercentage,
  normalizeWarrantyPeriod,
  normalizeDaysPeriod,
  normalizeTime,
} from '../utils/normalizers.js';
import type {
  ExtractedEntity,
  RawExtractedEntity,
  EntityConflict,
  UnificationResult,
  DocumentReference,
  EntityType,
  EntityMetadata,
  PrazoMetadata,
  MultaMetadata,
  RequisitoMetadata,
  RegraEntregaMetadata,
  RiscoMetadata,
  CertidaoTecnicaMetadata,
  DocumentacaoObrigatoriaMetadata,
} from '../types/entities.js';

/**
 * Serviço para unificação de entidades extraídas de editais
 * Responsável por normalizar, deduplicar e resolver conflitos
 */
export class EntityUnificationService {
  private db = getDatabase();
  private collection = this.db.collection<ExtractedEntity>('entities');

  /**
   * Processa e unifica uma lista de entidades brutas extraídas pela IA
   */
  async unifyEntities(
    documentId: string,
    rawEntities: RawExtractedEntity[]
  ): Promise<UnificationResult> {
    const result: UnificationResult = {
      entities: [],
      created: 0,
      updated: 0,
      conflictsResolved: 0,
      conflicts: [],
    };

    for (const raw of rawEntities) {
      // 1. Normalizar a entidade
      const normalized = this.normalizeEntity(documentId, raw);

      // 2. Buscar entidade existente pela chave de deduplicação
      const existing = await this.findByDeduplicationKey(
        documentId,
        normalized.deduplicationKey
      );

      if (!existing) {
        // Nova entidade - salvar diretamente
        const saved = await this.saveEntity(normalized);
        result.entities.push(saved);
        result.created++;
      } else {
        // Entidade existente - verificar se é duplicata ou conflito
        const mergeResult = this.attemptMerge(existing, normalized);

        if (mergeResult.success) {
          // Merge bem-sucedido - adicionar referência
          const newRef = normalized.references[0];
          if (newRef) {
            const updated = await this.addReference(existing, newRef);
            result.entities.push(updated);
          } else {
            result.entities.push(existing);
          }
          result.updated++;
        } else {
          // Conflito detectado - resolver por confiança
          const conflict = await this.resolveConflictByConfidence(
            existing,
            normalized
          );
          result.conflicts.push(conflict);
          result.conflictsResolved++;

          // Retornar a entidade vencedora
          const winner =
            conflict.resolution === 'KEPT_EXISTING'
              ? existing
              : normalized;
          result.entities.push(winner);
        }
      }
    }

    return result;
  }

  /**
   * Normaliza uma entidade bruta extraída pela IA
   */
  private normalizeEntity(
    documentId: string,
    raw: RawExtractedEntity
  ): ExtractedEntity {
    const normalizedValue = this.normalizeValue(raw.type, raw.rawValue, raw.metadata);
    const metadata = this.normalizeMetadata(raw.type, raw.metadata);
    
    // Usar a semanticKey da IA ou gerar uma nova
    const deduplicationKey = raw.semanticKey || 
      generateDeduplicationKey(raw.type, normalizedValue);

    const reference: DocumentReference = {
      pageNumber: raw.pageNumber,
      sectionTitle: raw.sectionTitle,
      excerptText: raw.excerptText.slice(0, 200), // Limitar tamanho
    };

    return {
      id: generateEntityId(),
      documentId,
      type: raw.type,
      name: raw.name,
      rawValue: raw.rawValue,
      normalizedValue,
      deduplicationKey,
      metadata,
      references: [reference],
      confidence: raw.confidence,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Normaliza o valor baseado no tipo da entidade
   */
  private normalizeValue(
    type: EntityType,
    rawValue: string,
    metadata: Record<string, unknown>
  ): string {
    switch (type) {
      case 'PRAZO': {
        const date = normalizeDate(rawValue);
        const time = normalizeTime(rawValue);
        if (date && time) {
          return `${date}T${time}`;
        }
        if (date) {
          return date;
        }
        // Tentar extrair período em dias/meses
        const days = normalizeDaysPeriod(rawValue);
        if (days) {
          return `${days.days}${days.businessDays ? 'DU' : 'DC'}`;
        }
        const months = normalizeWarrantyPeriod(rawValue);
        if (months) {
          return `${months}M`;
        }
        return rawValue;
      }

      case 'MULTA': {
        const percentage = normalizePercentage(rawValue);
        if (percentage !== null) {
          return `${percentage}`;
        }
        const monetary = normalizeMonetary(rawValue);
        if (monetary !== null) {
          return `${monetary}`;
        }
        return rawValue;
      }

      case 'REQUISITO':
      case 'CERTIDAO_TECNICA':
      case 'DOCUMENTACAO_OBRIGATORIA': {
        // Para requisitos, usar a categoria + especificação como valor normalizado
        const categoria = metadata.categoria || metadata.tipoDocumento || '';
        const item = metadata.itemRelacionado || metadata.tipoCertidao || '';
        return `${categoria}:${item}`.toUpperCase().replace(/\s+/g, '_');
      }

      default:
        return rawValue.toUpperCase().replace(/\s+/g, '_').slice(0, 100);
    }
  }

  /**
   * Normaliza os metadados baseado no tipo da entidade
   */
  private normalizeMetadata(
    type: EntityType,
    raw: Record<string, unknown>
  ): EntityMetadata {
    switch (type) {
      case 'PRAZO': {
        const data: PrazoMetadata = {
          tipoEvento: String(raw.tipoEvento || 'OUTRO'),
          dataInicio: raw.dataInicio ? normalizeDate(String(raw.dataInicio)) || undefined : undefined,
          dataFim: raw.dataFim ? normalizeDate(String(raw.dataFim)) || undefined : undefined,
          horaLimite: raw.horaLimite ? normalizeTime(String(raw.horaLimite)) || undefined : undefined,
          diasUteis: raw.diasUteis as boolean | undefined,
          duracaoDias: raw.duracaoDias as number | undefined,
        };
        return { type: 'PRAZO', data };
      }

      case 'MULTA': {
        const data: MultaMetadata = {
          tipoInfracao: String(raw.tipoInfracao || 'OUTRO'),
          percentual: raw.percentual !== undefined 
            ? normalizePercentage(String(raw.percentual)) || undefined 
            : undefined,
          valorFixo: raw.valorFixo !== undefined 
            ? normalizeMonetary(String(raw.valorFixo)) || undefined 
            : undefined,
          baseCalculo: raw.baseCalculo as string | undefined,
          condicaoAplicacao: raw.condicaoAplicacao as string | undefined,
        };
        return { type: 'MULTA', data };
      }

      case 'REQUISITO': {
        const data: RequisitoMetadata = {
          categoria: (raw.categoria as RequisitoMetadata['categoria']) || 'OUTRO',
          obrigatorio: raw.obrigatorio !== false,
          itemRelacionado: raw.itemRelacionado as string | undefined,
          especificacao: raw.especificacao as string | undefined,
        };
        return { type: 'REQUISITO', data };
      }

      case 'REGRA_ENTREGA': {
        const data: RegraEntregaMetadata = {
          localEntrega: raw.localEntrega as string | undefined,
          prazoEntrega: raw.prazoEntrega as string | undefined,
          condicoesTransporte: raw.condicoesTransporte as string | undefined,
          embalagem: raw.embalagem as string | undefined,
          horarioRecebimento: raw.horarioRecebimento as string | undefined,
        };
        return { type: 'REGRA_ENTREGA', data };
      }

      case 'RISCO': {
        const data: RiscoMetadata = {
          tipoRisco: (raw.tipoRisco as RiscoMetadata['tipoRisco']) || 'OUTRO',
          gravidade: (raw.gravidade as RiscoMetadata['gravidade']) || 'MEDIA',
          condicaoAtivacao: raw.condicaoAtivacao as string | undefined,
        };
        return { type: 'RISCO', data };
      }

      case 'CERTIDAO_TECNICA': {
        const data: CertidaoTecnicaMetadata = {
          tipoCertidao: String(raw.tipoCertidao || 'ATESTADO'),
          emissor: raw.emissor as string | undefined,
          validadeMinima: raw.validadeMinima as string | undefined,
          quantidadeMinima: raw.quantidadeMinima as number | undefined,
          descricaoExigencia: raw.descricaoExigencia as string | undefined,
        };
        return { type: 'CERTIDAO_TECNICA', data };
      }

      case 'DOCUMENTACAO_OBRIGATORIA': {
        const data: DocumentacaoObrigatoriaMetadata = {
          tipoDocumento: (raw.tipoDocumento as DocumentacaoObrigatoriaMetadata['tipoDocumento']) || 'OUTRO',
          prazoValidade: raw.prazoValidade as string | undefined,
          emissor: raw.emissor as string | undefined,
          finalidade: raw.finalidade as string | undefined,
        };
        return { type: 'DOCUMENTACAO_OBRIGATORIA', data };
      }

      default:
        return { type: type, data: raw } as EntityMetadata;
    }
  }

  /**
   * Busca entidade existente pela chave de deduplicação
   */
  async findByDeduplicationKey(
    documentId: string,
    deduplicationKey: string
  ): Promise<ExtractedEntity | null> {
    return this.collection.findOne({
      documentId,
      deduplicationKey,
    });
  }

  /**
   * Busca entidades por documento
   */
  async findByDocumentId(documentId: string): Promise<ExtractedEntity[]> {
    return this.collection.find({ documentId }).toArray();
  }

  /**
   * Busca entidades por tipo
   */
  async findByType(
    documentId: string,
    type: EntityType
  ): Promise<ExtractedEntity[]> {
    return this.collection.find({ documentId, type }).toArray();
  }

  /**
   * Retorna todas as semantic keys de um documento
   */
  async getExistingSemanticKeys(documentId: string): Promise<string[]> {
    const entities = await this.collection
      .find({ documentId }, { projection: { deduplicationKey: 1 } })
      .toArray();
    return entities.map((e) => e.deduplicationKey);
  }

  /**
   * Tenta fazer merge de duas entidades
   */
  private attemptMerge(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): { success: boolean; reason?: string } {
    // Se os valores normalizados são iguais, é duplicata válida
    if (existing.normalizedValue === incoming.normalizedValue) {
      return { success: true };
    }

    // Verificar se é variação aceitável
    if (this.isAcceptableVariation(existing, incoming)) {
      return { success: true };
    }

    return {
      success: false,
      reason: `Valor diferente: "${existing.normalizedValue}" vs "${incoming.normalizedValue}"`,
    };
  }

  /**
   * Verifica se a variação entre duas entidades é aceitável
   */
  private isAcceptableVariation(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): boolean {
    // Para valores numéricos, permitir pequena tolerância
    const existingNum = parseFloat(existing.normalizedValue);
    const incomingNum = parseFloat(incoming.normalizedValue);

    if (!isNaN(existingNum) && !isNaN(incomingNum)) {
      const diff = Math.abs(existingNum - incomingNum);
      const tolerance = Math.max(existingNum, incomingNum) * 0.001; // 0.1%
      return diff <= tolerance;
    }

    // Para strings, verificar se são equivalentes após normalização
    const existingNorm = existing.normalizedValue
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const incomingNorm = incoming.normalizedValue
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return existingNorm === incomingNorm;
  }

  /**
   * Resolve conflito mantendo a entidade com maior confiança
   */
  private async resolveConflictByConfidence(
    existing: ExtractedEntity,
    incoming: ExtractedEntity
  ): Promise<EntityConflict> {
    const conflict: EntityConflict = {
      deduplicationKey: existing.deduplicationKey,
      existingEntity: existing,
      incomingEntity: incoming,
      conflictType: 'VALUE_MISMATCH',
      resolution: 'KEPT_EXISTING',
      detectedAt: new Date(),
    };

    // Se a nova entidade tem maior confiança, substituir
    if (incoming.confidence > existing.confidence) {
      // Mesclar referências
      const mergedReferences = [
        ...existing.references,
        ...incoming.references.filter(
          (r) =>
            !existing.references.some(
              (er) =>
                er.pageNumber === r.pageNumber &&
                er.excerptText === r.excerptText
            )
        ),
      ];

      // Atualizar a entidade existente com os novos valores
      await this.collection.updateOne(
        { id: existing.id },
        {
          $set: {
            rawValue: incoming.rawValue,
            normalizedValue: incoming.normalizedValue,
            metadata: incoming.metadata,
            confidence: incoming.confidence,
            references: mergedReferences,
            updatedAt: new Date(),
          },
        }
      );

      conflict.resolution = 'REPLACED_WITH_INCOMING';
    } else {
      // Manter existente, mas adicionar referência
      const incomingRef = incoming.references[0];
      if (incomingRef) {
        await this.addReference(existing, incomingRef);
      }
      conflict.resolution = 'KEPT_EXISTING';
    }

    return conflict;
  }

  /**
   * Adiciona nova referência a uma entidade existente
   */
  private async addReference(
    entity: ExtractedEntity,
    reference: DocumentReference
  ): Promise<ExtractedEntity> {
    // Evitar referências duplicadas
    const existingRef = entity.references.find(
      (r) =>
        r.pageNumber === reference.pageNumber &&
        r.excerptText === reference.excerptText
    );

    if (!existingRef) {
      entity.references.push(reference);
      await this.collection.updateOne(
        { id: entity.id },
        {
          $push: { references: reference },
          $set: { updatedAt: new Date() },
        }
      );
    }

    return entity;
  }

  /**
   * Salva uma nova entidade no banco
   */
  private async saveEntity(entity: ExtractedEntity): Promise<ExtractedEntity> {
    await this.collection.insertOne(entity);
    return entity;
  }

  /**
   * Remove todas as entidades de um documento
   */
  async clearDocumentEntities(documentId: string): Promise<number> {
    const result = await this.collection.deleteMany({ documentId });
    return result.deletedCount;
  }
}

// Singleton para reutilização
let serviceInstance: EntityUnificationService | null = null;

export function getEntityUnificationService(): EntityUnificationService {
  if (!serviceInstance) {
    serviceInstance = new EntityUnificationService();
  }
  return serviceInstance;
}

