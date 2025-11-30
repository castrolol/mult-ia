'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquarePlus,
  ChevronDown,
  FileText,
  Trash2,
} from 'lucide-react'
import {
  useRagStatus,
  usePrepareRag,
  useConversations,
  useConversation,
  useSendMessage,
  useDeleteConversation,
} from '@/lib/hooks'
import type { ChatMessage, Conversation } from '@/lib/api-client'

interface ChatPanelProps {
  documentId?: string
  documentName?: string
  className?: string
}

export function ChatPanel({ documentId, documentName, className }: ChatPanelProps) {
  console.log('ChatPanel renderizado com documentId:', documentId)
  
  const [inputValue, setInputValue] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showConversations, setShowConversations] = useState(false)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hooks de dados
  const { data: ragStatus, isLoading: ragStatusLoading } = useRagStatus(documentId)
  const prepareRagMutation = usePrepareRag()
  const { data: conversationsData } = useConversations(documentId)
  const { data: conversationData, isLoading: conversationLoading } = useConversation(
    documentId,
    activeConversationId || undefined
  )
  const sendMessageMutation = useSendMessage()
  const deleteConversationMutation = useDeleteConversation()

  // Sincronizar mensagens do servidor com estado local
  useEffect(() => {
    if (conversationData?.messages) {
      setLocalMessages(conversationData.messages)
    }
  }, [conversationData?.messages])

  // Scroll para baixo quando mensagens mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const handlePrepareRag = async () => {
    if (!documentId) return
    try {
      await prepareRagMutation.mutateAsync({ documentId })
    } catch (error) {
      console.error('Erro ao preparar RAG:', error)
    }
  }

  const handleSendMessage = async () => {
    console.log('handleSendMessage chamado', { inputValue, documentId })
    
    if (!inputValue.trim() || !documentId) {
      console.log('Condição não atendida:', { inputTrimmed: inputValue.trim(), documentId })
      return
    }

    const messageText = inputValue.trim()
    setInputValue('')

    // Adicionar mensagem do usuário localmente para feedback imediato
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, tempUserMessage])

    try {
      console.log('Enviando mensagem para API...')
      const response = await sendMessageMutation.mutateAsync({
        documentId,
        message: messageText,
        conversationId: activeConversationId || undefined,
      })
      console.log('Resposta recebida:', response)

      // Atualizar ID da conversa ativa (pode ser nova)
      if (!activeConversationId && response.conversationId) {
        setActiveConversationId(response.conversationId)
      }

      // Adicionar resposta do assistente
      const assistantMessage: ChatMessage = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        sourcePagesUsed: response.sourcePagesUsed,
        createdAt: new Date().toISOString(),
      }
      setLocalMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // Remover mensagem temporária em caso de erro
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input changed:', e.target.value)
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleButtonClick = () => {
    console.log('Button clicked!')
    handleSendMessage()
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setLocalMessages([])
    setShowConversations(false)
  }

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setShowConversations(false)
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!documentId) return

    try {
      await deleteConversationMutation.mutateAsync({
        documentId,
        conversationId: convId,
      })

      if (activeConversationId === convId) {
        setActiveConversationId(null)
        setLocalMessages([])
      }
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
    }
  }

  // Estado de RAG não pronto
  if (!ragStatus?.isReady && documentId) {
    return (
      <div
        className={cn(
          'flex flex-col h-full bg-muted/30 rounded-xl overflow-hidden border border-border shadow-sm',
          className
        )}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            {ragStatusLoading ? (
              <>
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Verificando status do chat...</p>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Chat não disponível</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  O documento precisa ser preparado para o chat. Isso criará embeddings para
                  busca semântica.
                </p>
                {ragStatus && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Páginas processadas: {ragStatus.embeddedPages} / {ragStatus.totalPages}
                  </p>
                )}
                <Button
                  onClick={handlePrepareRag}
                  disabled={prepareRagMutation.isPending}
                  className="gap-2"
                >
                  {prepareRagMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Preparar Chat
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const conversations = conversationsData?.conversations || []
  const isLoading = sendMessageMutation.isPending
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-muted/30 rounded-xl overflow-hidden border border-border shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="bg-card p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Lumi - Assistente de IA</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de conversas */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConversations(!showConversations)}
                className="gap-1 text-xs"
              >
                {activeConversation ? (
                  <span className="max-w-[100px] truncate">{activeConversation.title}</span>
                ) : (
                  'Nova conversa'
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>

              {showConversations && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={handleNewConversation}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-primary"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Nova conversa
                  </button>

                  {conversations.length > 0 && (
                    <div className="border-t border-border my-1" />
                  )}

                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between group cursor-pointer',
                        activeConversationId === conv.id && 'bg-muted'
                      )}
                    >
                      <span className="truncate flex-1">{conv.title}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationLoading && activeConversationId ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <Sparkles className="w-10 h-10 text-primary/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Olá! Sou o assistente da Mult.IA.
                {documentName && (
                  <>
                    {' '}
                    Analisei o documento <strong>&quot;{documentName}&quot;</strong> e
                  </>
                )}{' '}
                posso ajudar com dúvidas sobre prazos, requisitos ou riscos.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                O que você gostaria de saber?
              </p>
            </div>
          </div>
        ) : (
          <>
            {localMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                    msg.role === 'assistant'
                      ? 'bg-card border-border text-primary'
                      : 'bg-primary border-primary text-primary-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={cn(
                      'p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                      msg.role === 'assistant'
                        ? 'bg-card border border-border text-foreground rounded-tl-none'
                        : 'bg-primary text-primary-foreground rounded-tr-none'
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Fonte das páginas */}
                  {msg.role === 'assistant' && msg.sourcePagesUsed && msg.sourcePagesUsed.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
                      <FileText className="w-3 h-3" />
                      Páginas: {msg.sourcePagesUsed.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {sendMessageMutation.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            Erro ao enviar mensagem. Tente novamente.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            console.log('Form submitted')
            handleSendMessage()
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta sobre o documento..."
            disabled={isLoading}
            autoComplete="off"
            className="flex-1 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all placeholder:text-muted-foreground bg-background disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="rounded-xl shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          A IA pode cometer erros. Verifique as informações importantes no documento.
        </p>
      </div>
    </div>
  )
}
