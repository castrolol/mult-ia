import PQueue from 'p-queue'

export interface ProcessJobData {
  documentId: string
  s3Key: string
}

// Fila com concorrência de 2 jobs simultâneos
const queue = new PQueue({ concurrency: 2 })

// Tipo para o handler de processamento
type ProcessHandler = (data: ProcessJobData) => Promise<void>

let processHandler: ProcessHandler | null = null

export function setProcessHandler(handler: ProcessHandler): void {
  processHandler = handler
}

export async function addJob(data: ProcessJobData): Promise<void> {
  if (!processHandler) {
    // Se não há handler configurado, apenas loga que o job foi enfileirado
    // O processamento será feito pelo job-api
    console.log(`+ Job enfileirado para processamento: ${data.documentId}`)
    return
  }

  const handler = processHandler

  queue.add(async () => {
    console.log(`→ Iniciando job para documento: ${data.documentId}`)

    try {
      await handler(data)
      console.log(`✓ Job concluído para documento: ${data.documentId}`)
    } catch (error) {
      console.error(`✗ Erro no job para documento: ${data.documentId}`, error)
    }
  })

  console.log(
    `+ Job adicionado à fila. Tamanho atual: ${queue.size}, Pendentes: ${queue.pending}`
  )
}

export function getQueueStats() {
  return {
    size: queue.size,
    pending: queue.pending,
    isPaused: queue.isPaused,
  }
}

