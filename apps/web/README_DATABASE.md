# Configuração do Banco de Dados

Este projeto usa **Drizzle ORM** com **PostgreSQL** para persistência de dados.

## Pré-requisitos

1. PostgreSQL instalado e rodando
2. Variável de ambiente `DATABASE_URL` configurada

## Configuração

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variável de ambiente

Crie um arquivo `.env.local` na raiz de `apps/web/`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/multai
GOOGLE_GENERATIVE_AI_API_KEY=sua_chave_aqui
```

### 3. Gerar migrações

```bash
pnpm db:generate
```

Isso criará arquivos de migração na pasta `drizzle/`.

### 4. Aplicar migrações

```bash
pnpm db:push
```

Ou para usar migrações versionadas:

```bash
pnpm db:migrate
```

### 5. (Opcional) Abrir Drizzle Studio

Para visualizar e editar dados diretamente:

```bash
pnpm db:studio
```

## Estrutura do Banco de Dados

### Tabelas Principais

- **documents** - Documentos PDF enviados
- **document_content** - Conteúdo extraído dos PDFs
- **entities** - Entidades classificadas (prazos, riscos, multas, etc)
- **deadlines** - Prazos críticos identificados
- **penalties** - Multas associadas aos prazos
- **timeline_events** - Eventos da timeline
- **document_analyses** - Análises completas dos documentos
- **reminders** - Lembretes agendados
- **knowledge_base** - Base de conhecimento da empresa

## Scripts Disponíveis

- `pnpm db:generate` - Gera arquivos de migração
- `pnpm db:push` - Aplica mudanças diretamente ao banco (desenvolvimento)
- `pnpm db:migrate` - Aplica migrações versionadas (produção)
- `pnpm db:studio` - Abre interface visual do Drizzle

## Migrações

As migrações são geradas automaticamente quando você modifica os schemas em `src/lib/db/schema.ts`.

Para criar uma nova migração:

1. Modifique `src/lib/db/schema.ts`
2. Execute `pnpm db:generate`
3. Revise os arquivos gerados em `drizzle/`
4. Execute `pnpm db:push` ou `pnpm db:migrate`

## Notas

- O banco usa **CUID2** para IDs únicos
- Relacionamentos usam **cascade delete** onde apropriado
- Campos JSON são armazenados como `jsonb` no PostgreSQL
- Timestamps são gerenciados automaticamente pelo Drizzle

