'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

type ApplyMode = 'always' | 'model-decide'

interface KnowledgeBase {
  id: string
  content: string
  applyMode: ApplyMode
}

const applyModeLabels: Record<ApplyMode, string> = {
  always: 'Always Apply',
  'model-decide': 'Model Decide',
}

export default function BasePage() {
  const [textareaValue, setTextareaValue] = useState('')
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([
    {
      id: '1',
      content:
        'Informações sobre políticas da empresa e procedimentos internos.',
      applyMode: 'always',
    },
    {
      id: '2',
      content: 'Documentação técnica sobre APIs e integrações.',
      applyMode: 'model-decide',
    },
  ])

  const handleAddKnowledgeBase = () => {
    if (!textareaValue.trim()) return

    const newKnowledgeBase: KnowledgeBase = {
      id: Date.now().toString(),
      content: textareaValue.trim(),
      applyMode: 'model-decide',
    }

    setKnowledgeBases((prev) => [...prev, newKnowledgeBase])
    setTextareaValue('')
  }

  const handleDeleteKnowledgeBase = (id: string) => {
    setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== id))
  }

  const handleApplyModeChange = (id: string, mode: ApplyMode) => {
    setKnowledgeBases((prev) =>
      prev.map((kb) => (kb.id === id ? { ...kb, applyMode: mode } : kb)),
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full grow flex-col">
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
          <div className="flex w-full max-w-4xl flex-col gap-8">
            <main className="flex flex-col gap-8">
              <div className="flex flex-wrap justify-between gap-3 px-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-4xl font-black leading-tight tracking-tight text-foreground">
                    Base de Conhecimento
                  </p>
                  <p className="text-base font-normal leading-relaxed text-muted-foreground">
                    Gerencie suas bases de conhecimento aqui.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Textarea
                  placeholder="Digite o conteúdo da base de conhecimento..."
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  className="min-h-40 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddKnowledgeBase}
                    disabled={!textareaValue.trim()}
                    className="flex min-w-[84px] max-w-[480px] shadow-sm"
                  >
                    <Plus size={16} />
                    Adicionar Base de Conhecimento
                  </Button>
                </div>
              </div>

              {knowledgeBases.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Bases de Conhecimento Adicionadas
                  </h2>
                  <div className="flex flex-col gap-3">
                    {knowledgeBases.map((kb) => (
                      <div
                        key={kb.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="flex-1 text-sm leading-relaxed text-foreground">
                            {kb.content}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteKnowledgeBase(kb.id)}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Aplicar:
                          </span>
                          <Select
                            value={kb.applyMode}
                            onValueChange={(value) =>
                              handleApplyModeChange(kb.id, value as ApplyMode)
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="always">
                                {applyModeLabels.always}
                              </SelectItem>
                              <SelectItem value="model-decide">
                                {applyModeLabels['model-decide']}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
