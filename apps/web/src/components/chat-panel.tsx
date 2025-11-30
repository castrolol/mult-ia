'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Send, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
}

interface ChatPanelProps {
  documentName?: string
  className?: string
}

export function ChatPanel({ documentName, className }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá! Sou o assistente da Mult.IA. Analisei ${documentName ? `o documento "${documentName}"` : 'este documento'} e posso ajudar com dúvidas sobre prazos, requisitos ou riscos. O que você gostaria de saber?`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMsg])
    setInputValue('')
    setIsTyping(true)

    // Simular resposta da IA (mockado)
    setTimeout(() => {
      const aiResponses = [
        'Com base na cláusula 4.1, o prazo de entrega é de 15 dias corridos após a assinatura do contrato.',
        'Identifiquei um risco alto na cláusula 4.9 referente à multa moratória de 0,5% ao dia.',
        'Os requisitos técnicos para os equipamentos estão detalhados na seção de Especificações Técnicas do Termo de Referência.',
        'Sim, a empresa deve apresentar atestado de capacidade técnica compatível com o objeto licitado.',
        'O prazo para impugnação do edital é de até 3 dias úteis antes da sessão pública.',
        'As garantias exigidas incluem garantia contratual de 5% do valor total e garantia técnica dos equipamentos.',
      ]
      const randomResponse =
        aiResponses[Math.floor(Math.random() * aiResponses.length)]

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: randomResponse,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, newAiMsg])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-muted/30 rounded-xl overflow-hidden border border-border shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="bg-card p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Assistente Mult.IA</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.sender === 'user' && 'flex-row-reverse')}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                msg.sender === 'ai'
                  ? 'bg-card border-border text-primary'
                  : 'bg-primary border-primary text-primary-foreground'
              )}
            >
              {msg.sender === 'ai' ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            <div
              className={cn(
                'max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                msg.sender === 'ai'
                  ? 'bg-card border border-border text-foreground rounded-tl-none'
                  : 'bg-primary text-primary-foreground rounded-tr-none'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta sobre o documento..."
            className="flex-1 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all placeholder:text-muted-foreground bg-background"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            size="icon"
            className="rounded-xl shadow-sm"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          A IA pode cometer erros. Verifique as informações importantes no documento.
        </p>
      </div>
    </div>
  )
}

