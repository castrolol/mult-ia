'use client'

/**
 * Representa a posição de um texto no PDF em porcentagem
 */
export interface TextPosition {
  /** Índice da página (0-indexed) */
  pageIndex: number
  /** Posição horizontal em % da largura */
  left: number
  /** Posição vertical em % da altura */
  top: number
  /** Largura em % da página */
  width: number
  /** Altura em % da página */
  height: number
}

const DB_NAME = 'pdf-position-cache'
const DB_VERSION = 1
const STORE_NAME = 'positions'

// TTL padrão: 7 dias (em milissegundos)
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Estrutura de um item no cache
 */
interface CacheItem {
  /** Chave única: documentId:entityId */
  key: string
  /** ID do documento */
  documentId: string
  /** ID da entidade */
  entityId: string
  /** Posições encontradas */
  positions: TextPosition[]
  /** Timestamp de criação */
  createdAt: number
  /** Timestamp de expiração */
  expiresAt: number
}

/**
 * Abre conexão com o IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Erro ao abrir IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Cria object store se não existir
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('documentId', 'documentId', { unique: false })
        store.createIndex('expiresAt', 'expiresAt', { unique: false })
      }
    }
  })
}

/**
 * Gera a chave do cache
 */
function getCacheKey(documentId: string, entityId: string): string {
  return `${documentId}:${entityId}`
}

/**
 * Cache de posições de texto no PDF usando IndexedDB
 */
export const positionCache = {
  /**
   * Obtém posições do cache
   * @returns Posições ou null se não existir/expirado
   */
  async get(documentId: string, entityId: string): Promise<TextPosition[] | null> {
    try {
      const db = await openDatabase()
      const key = getCacheKey(documentId, entityId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(key)

        request.onerror = () => {
          console.error('Erro ao ler cache:', request.error)
          resolve(null)
        }

        request.onsuccess = () => {
          const item = request.result as CacheItem | undefined

          if (!item) {
            resolve(null)
            return
          }

          // Verifica expiração
          if (Date.now() > item.expiresAt) {
            // Item expirado, remove do cache
            positionCache.delete(documentId, entityId).catch(console.error)
            resolve(null)
            return
          }

          resolve(item.positions)
        }

        transaction.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.error('Erro ao acessar cache:', error)
      return null
    }
  },

  /**
   * Salva posições no cache
   */
  async set(
    documentId: string,
    entityId: string,
    positions: TextPosition[],
    ttlMs = DEFAULT_TTL_MS
  ): Promise<void> {
    try {
      const db = await openDatabase()
      const key = getCacheKey(documentId, entityId)
      const now = Date.now()

      const item: CacheItem = {
        key,
        documentId,
        entityId,
        positions,
        createdAt: now,
        expiresAt: now + ttlMs,
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(item)

        request.onerror = () => {
          console.error('Erro ao salvar cache:', request.error)
          reject(request.error)
        }

        request.onsuccess = () => {
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.error('Erro ao salvar cache:', error)
    }
  },

  /**
   * Remove um item do cache
   */
  async delete(documentId: string, entityId: string): Promise<void> {
    try {
      const db = await openDatabase()
      const key = getCacheKey(documentId, entityId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(key)

        request.onerror = () => {
          console.error('Erro ao deletar cache:', request.error)
          reject(request.error)
        }

        request.onsuccess = () => {
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.error('Erro ao deletar cache:', error)
    }
  },

  /**
   * Remove todos os itens de um documento
   */
  async clearDocument(documentId: string): Promise<void> {
    try {
      const db = await openDatabase()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const index = store.index('documentId')
        const request = index.openCursor(IDBKeyRange.only(documentId))

        request.onerror = () => {
          console.error('Erro ao limpar cache do documento:', request.error)
          reject(request.error)
        }

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }

        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
      })
    } catch (error) {
      console.error('Erro ao limpar cache do documento:', error)
    }
  },

  /**
   * Remove itens expirados do cache
   */
  async cleanExpired(): Promise<number> {
    try {
      const db = await openDatabase()
      const now = Date.now()
      let deletedCount = 0

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const index = store.index('expiresAt')
        const request = index.openCursor(IDBKeyRange.upperBound(now))

        request.onerror = () => {
          console.error('Erro ao limpar cache expirado:', request.error)
          reject(request.error)
        }

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          }
        }

        transaction.oncomplete = () => {
          db.close()
          resolve(deletedCount)
        }
      })
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error)
      return 0
    }
  },

  /**
   * Limpa todo o cache
   */
  async clearAll(): Promise<void> {
    try {
      const db = await openDatabase()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.clear()

        request.onerror = () => {
          console.error('Erro ao limpar todo cache:', request.error)
          reject(request.error)
        }

        request.onsuccess = () => {
          resolve()
        }

        transaction.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.error('Erro ao limpar todo cache:', error)
    }
  },

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<{
    totalItems: number
    expiredItems: number
    documentIds: string[]
  }> {
    try {
      const db = await openDatabase()
      const now = Date.now()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onerror = () => {
          console.error('Erro ao obter estatísticas:', request.error)
          reject(request.error)
        }

        request.onsuccess = () => {
          const items = request.result as CacheItem[]
          const expiredItems = items.filter(item => item.expiresAt < now).length
          const documentIds = [...new Set(items.map(item => item.documentId))]

          resolve({
            totalItems: items.length,
            expiredItems,
            documentIds,
          })
        }

        transaction.oncomplete = () => {
          db.close()
        }
      })
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return { totalItems: 0, expiredItems: 0, documentIds: [] }
    }
  },
}

/**
 * Inicializa limpeza automática de cache expirado
 * Deve ser chamado uma vez quando a aplicação inicia
 */
export function initCacheCleanup(intervalMs = 60 * 60 * 1000): () => void {
  // Limpa imediatamente ao iniciar
  positionCache.cleanExpired().then(count => {
    if (count > 0) {
      console.log(`Cache: ${count} itens expirados removidos`)
    }
  })

  // Configura limpeza periódica
  const intervalId = setInterval(() => {
    positionCache.cleanExpired().catch(console.error)
  }, intervalMs)

  // Retorna função para cancelar
  return () => clearInterval(intervalId)
}

