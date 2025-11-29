# MultIA

Sistema de processamento e análise de documentos PDF com inteligência artificial.

## Stack Tecnológica

### Frontend (apps/web)
- **Next.js 15** com Turbopack
- **React**
- **Tailwind CSS 4**
- **shadcn/ui** com Radix UI

### Job Handler (apps/job-api)
- **Hono** - Framework HTTP
- **Vercel AI SDK** com OpenAI - para reduzir o loop boilerplate ao usar a IA
- **MongoDB** - Banco de dados
- **MinIO/S3** - Armazenamento de arquivos
 

### Infraestrutura
- **Turborepo** - Gerenciamento do monorepo
- **pnpm** - Gerenciador de pacotes
- **TypeScript** - Em todo o projeto
- **Docker** - Containerização para publicação facilitada

 

## Pré-requisitos

- Node.js >= 20
- pnpm 10.4.1
- MongoDB
- MinIO ou S3 compatível
- Chave de API OpenAI

## Instalação

```bash
# Clonar o repositório
git clone git@github.com:Carbono-Empregos/multai.git
cd multai

# Instalar dependências
pnpm install
```

## Configuração

Criar arquivo `.env` em `apps/job-api/`:

```env
# Servidor
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/multia

# Storage (MinIO/S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pdf-uploads

# OpenAI
OPENAI_API_KEY=sua-chave-aqui
```

## Executando

```bash
# Desenvolvimento (todos os apps)
pnpm dev

# Build
pnpm build

# Lint
pnpm lint
```

A API estará disponível em `http://localhost:3001` e o frontend em `http://localhost:3000`.

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /upload | Upload de arquivo PDF |
| GET | /upload/:id | Status do processamento |
| GET | /health | Health check |

## Fluxo de Processamento

1. Upload do PDF via endpoint `/upload`
2. Arquivo armazenado no MinIO/S3
3. Registro criado no MongoDB com status `PENDING`
4. Job adicionado na fila de processamento
5. Worker extrai texto de cada página
6. Agente de IA analisa conteúdo e extrai informações
7. Resultados salvos no MongoDB
8. Status atualizado para `COMPLETED`

## Decisões Técnicas

### Monorepo com Turborepo
Escolhido para compartilhar código entre frontend e backend, com builds incrementais e cache.

### Hono como framework HTTP
Framework leve e rapido, facil de migrar pra uma lambda function like, api parecida com express

### Vercel AI SDK
Abstração unificada para trabalhar com LLMs. Suporte nativo a tool calling e streaming.

### MinIO para storage
Compatível com S3, permite que passamos para AWS no futuro

### Processamento assíncrono
PDFs são processados em background via fila in-memory. Permite escalar workers independentemente da API.

### shadcn/ui
Componentes copiados para o projeto, não instalados como dependência. Permite customização total sem breaking changes.

 
