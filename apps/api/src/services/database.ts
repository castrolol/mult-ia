// Database connection validation for PostgreSQL with Drizzle
import { db } from '../lib/db.js'

export async function connectDatabase(): Promise<void> {
  try {
    // Test database connection by executing a simple query
    await db.execute('SELECT 1')
    console.log('✓ Conectado ao PostgreSQL via Drizzle')
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error)
    throw error
  }
}
