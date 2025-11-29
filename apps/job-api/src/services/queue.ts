import PQueue from 'p-queue';
import type { ProcessJobData } from '../types/index.js';

// Fila com concorrência de 2 jobs simultâneos
const queue = new PQueue({ concurrency: 2 });

// Tipo para o handler de processamento
type ProcessHandler = (data: ProcessJobData) => Promise<void>;

let processHandler: ProcessHandler | null = null;

export function setProcessHandler(handler: ProcessHandler): void {
  processHandler = handler;
}

export async function addJob(data: ProcessJobData): Promise<void> {
  if (!processHandler) {
    throw new Error('Process handler não configurado. Chame setProcessHandler() primeiro.');
  }

  const handler = processHandler;

  queue.add(async () => {
    console.log(`→ Iniciando job para documento: ${data.documentId}`);
    
    try {
      await handler(data);
      console.log(`✓ Job concluído para documento: ${data.documentId}`);
    } catch (error) {
      console.error(`✗ Erro no job para documento: ${data.documentId}`, error);
      // O erro é logado mas não re-lançado para não derrubar a fila
    }
  });

  console.log(`+ Job adicionado à fila. Tamanho atual: ${queue.size}, Pendentes: ${queue.pending}`);
}

export function getQueueStats() {
  return {
    size: queue.size,
    pending: queue.pending,
    isPaused: queue.isPaused,
  };
}

