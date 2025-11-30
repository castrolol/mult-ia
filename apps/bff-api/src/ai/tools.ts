import { tool } from 'ai'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { getDatabase } from '../services/database.js'
import type { Entity, GlobalContext, PageAnalysis } from '../types/index.js'

export function createTools(documentId: string, pageNumber: number) {
  const db = getDatabase()

  return {
    /**
     * Tool para buscar contexto global do MongoDB
     * A IA pode usar para obter informações relevantes durante a análise
     */
    findEntities: tool({
      description:
        'Busca entidades  do banco de dados. Use para obter informações adicionais relevantes para a análise, como dados de clientes, configurações ou referências.',
      parameters: z.object({
        entity: z
          .string()
          .describe(
            'Id, Nome ou parte do nome da entidade a ser buscada (ex: "clausula", "prazo", "risco",  "contrato", se for menor q 3 caracteres, sera buscado somente por id... caso contrario, por todos os campos citados)',
          ),
      }),
      execute: async ({ entity }: { entity: string }) => {
        try {
          const entities = await db.collection<Entity[]>('entities').find(
            entity.length < 3
              ? { id: entity }
              : {
                  $or: [
                    { id: entity },
                    { name: entity },
                    { description: entity },
                  ],
                },
          )

          return entities.toArray()
        } catch (error) {
          console.error('Erro ao buscar entidade:', error)
          return []
        }
      },
    }),

    saveEntities: tool({
      description:
        'Salva entidades no banco de dados. Use para salvar entidades encontradas na análise.',
      parameters: z.object({
        entities: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            value: z.string(),
            type: z.string(),
            parentId: z
              .string()
              .describe('ID da entidade pai, ou string vazia se não houver'),
          }),
        ),
      }),
      execute: async ({ entities }: { entities: Array<{ id: string; name: string; description: string; value: string; type: string; parentId: string }> }) => {
        try {
          const bulkCommands = entities.map((entity: { id: string; name: string; description: string; value: string; type: string; parentId: string }) => ({
            updateOne: {
              filter: { id: entity.id }, // Query to find the document
              update: {
                $set: {
                  name: entity.name,
                  description: entity.description,
                  value: entity.value,
                  type: entity.type,
                  parentId: entity.parentId,
                },
              }, // Update operation
              upsert: true, // Enable upsert
            },
          }))

          const result = await db
            .collection<Entity>('entities')
            .bulkWrite(bulkCommands)
          return result.upsertedIds
        } catch (error) {
          console.error('Erro ao salvar entidades:', error)
          return []
        }
      },
    }),
  }
}
