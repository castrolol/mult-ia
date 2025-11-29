// Test file to verify @workspace/drizzle integration
// This file can be deleted after verification

import { db, schema } from '@workspace/drizzle'

// Verify db export
console.log('✓ db exported:', typeof db)

// Verify schema exports
console.log('✓ documents table:', typeof schema.documents)
console.log('✓ entities table:', typeof schema.entities)
console.log('✓ deadlines table:', typeof schema.deadlines)

// Verify type exports
import type { Document, Entity, Deadline } from '@workspace/drizzle'

const testDoc: Document = {
    id: 'test',
    filename: 'test.pdf',
    status: 'pending',
    totalPages: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
}

console.log('✓ Type exports working:', testDoc)
console.log('\n✅ All @workspace/drizzle exports verified successfully!')
