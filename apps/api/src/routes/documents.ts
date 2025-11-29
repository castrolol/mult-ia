import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from '../lib/db.js'

const documents = new Hono()

// GET /api/documents - List all documents
documents.get('/', async (c) => {
    try {
        const allDocuments = await db
            .select()
            .from(schema.documents)
            .orderBy(desc(schema.documents.createdAt))

        return c.json({ documents: allDocuments })
    } catch (error) {
        console.error('Error fetching documents:', error)
        return c.json({ error: 'Failed to fetch documents' }, 500)
    }
})

// GET /api/documents/:id - Get specific document with all relations
documents.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')

        const document = await db.query.documents.findFirst({
            where: eq(schema.documents.id, id),
            with: {
                content: true,
                analysis: true,
                entities: true,
                deadlines: {
                    with: {
                        penalties: true,
                    },
                },
                timelineEvents: true,
                reminders: true,
            },
        })

        if (!document) {
            return c.json({ error: 'Document not found' }, 404)
        }

        return c.json({ document })
    } catch (error) {
        console.error('Error fetching document:', error)
        return c.json({ error: 'Failed to fetch document' }, 500)
    }
})

// GET /api/documents/:id/entities - Get document entities
documents.get('/:id/entities', async (c) => {
    try {
        const id = c.req.param('id')

        const entities = await db
            .select()
            .from(schema.entities)
            .where(eq(schema.entities.documentId, id))
            .orderBy(desc(schema.entities.createdAt))

        return c.json({ entities })
    } catch (error) {
        console.error('Error fetching entities:', error)
        return c.json({ error: 'Failed to fetch entities' }, 500)
    }
})

// GET /api/documents/:id/deadlines - Get document deadlines
documents.get('/:id/deadlines', async (c) => {
    try {
        const id = c.req.param('id')

        const deadlines = await db.query.deadlines.findMany({
            where: eq(schema.deadlines.documentId, id),
            with: {
                penalties: true,
            },
            orderBy: desc(schema.deadlines.createdAt),
        })

        return c.json({ deadlines })
    } catch (error) {
        console.error('Error fetching deadlines:', error)
        return c.json({ error: 'Failed to fetch deadlines' }, 500)
    }
})

// GET /api/documents/:id/timeline - Get document timeline events
documents.get('/:id/timeline', async (c) => {
    try {
        const id = c.req.param('id')

        const timeline = await db
            .select()
            .from(schema.timelineEvents)
            .where(eq(schema.timelineEvents.documentId, id))
            .orderBy(desc(schema.timelineEvents.createdAt))

        return c.json({ timeline })
    } catch (error) {
        console.error('Error fetching timeline:', error)
        return c.json({ error: 'Failed to fetch timeline' }, 500)
    }
})

export { documents }
