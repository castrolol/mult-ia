# MultIA

Sistema de processamento e análise de documentos PDF com inteligência artificial.

## Stack Tecnológica

### Frontend (apps/web)
- **Next.js 15** com Turbopack
- **React**
- **Tailwind CSS 4**
- **shadcn/ui** com Radix UI

### API (apps/api)
- **Hono** - Framework HTTP
- **MongoDB** - Banco de dados
- **MinIO/S3** - Armazenamento de arquivos

API principal para interação com o frontend. Gerencia uploads e consulta de documentos.

### Job Handler (apps/job-api)
- **Hono** - Framework HTTP
- **Vercel AI SDK** com OpenAI - para reduzir o loop boilerplate ao usar a IA
- **MongoDB** - Banco de dados
- **MinIO/S3** - Armazenamento de arquivos

Serviço de processamento em background. Processa PDFs com IA e extrai informações.

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

### apps/api (.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/multia
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pdf-uploads
```

### apps/job-api (.env)

```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/multia
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pdf-uploads
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

- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost:3001`
- **Job API**: `http://localhost:3002`

## Endpoints

### API (apps/api)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /upload | Upload de arquivo PDF |
| GET | /documents | Listar documentos |
| GET | /documents/:id | Status do documento |
| GET | /health | Health check |

### Job API (apps/job-api)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /process | Iniciar processamento de documento |
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

 
