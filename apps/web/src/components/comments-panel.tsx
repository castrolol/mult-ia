'use client'

import { useState } from 'react'
import {
  MessageCircle,
  Send,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { useCommentsManager } from '@/lib/hooks'
import type { TimelineComment } from '@/lib/api-client'
import { formatDateTime, ui } from '@/lib/i18n'

interface CommentsPanelProps {
  documentId: string
  eventId: string
  eventTitle?: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function CommentsPanel({
  documentId,
  eventId,
  eventTitle,
  isOpen,
  onClose,
  className,
}: CommentsPanelProps) {
  const {
    comments,
    loading,
    error,
    add,
    update,
    remove,
    isOperating,
    refetch,
  } = useCommentsManager(documentId, eventId)

  const [newComment, setNewComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isEditingAuthor, setIsEditingAuthor] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !authorName.trim()) return

    try {
      await add(newComment.trim(), authorName.trim())
      setNewComment('')
    } catch {
      // Erro já tratado no hook
    }
  }

  const handleEdit = (comment: TimelineComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return

    try {
      await update(editingId, editContent.trim())
      setEditingId(null)
      setEditContent('')
    } catch {
      // Erro já tratado no hook
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm(ui.confirmarExclusao)) return

    try {
      await remove(commentId)
    } catch {
      // Erro já tratado no hook
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-xl z-50 flex flex-col',
        className,
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-primary" />
          <div>
            <h3 className="font-semibold">{ui.comentarios}</h3>
            {eventTitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {eventTitle}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      {/* Lista de comentários */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-4">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{ui.nenhumComentario}</p>
            <p className="text-sm">{ui.sejaOPrimeiro}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isEditing={editingId === comment.id}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onEdit={() => handleEdit(comment)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onDelete={() => handleDelete(comment.id)}
                isOperating={isOperating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Formulário de novo comentário */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Campo de autor (se estiver editando ou não tiver nome) */}
          {isEditingAuthor ? (
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Seu nome"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && authorName.trim().length >= 2) {
                    e.preventDefault()
                    setIsEditingAuthor(false)
                  }
                }}
                onBlur={() => {
                  if (authorName.trim().length >= 2) {
                    setIsEditingAuthor(false)
                  }
                }}
                autoFocus
                className="flex-1 bg-transparent text-sm border-b border-muted focus:border-primary outline-none py-1"
              />
              {authorName.trim().length >= 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingAuthor(false)}
                  className="text-xs h-7"
                >
                  Confirmar
                </Button>
              )}
            </div>
          ) : null}

          {/* Campo de comentário */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                placeholder={ui.seuComentario}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || !authorName.trim() || isOperating}
              className="shrink-0 self-end"
            >
              {isOperating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>

          {/* Indicador do autor atual */}
          {!isEditingAuthor && authorName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User size={12} />
              <span>Comentando como {authorName}</span>
              <button
                type="button"
                onClick={() => setIsEditingAuthor(true)}
                className="text-primary hover:underline"
              >
                Alterar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: TimelineComment
  isEditing: boolean
  editContent: string
  onEditContentChange: (content: string) => void
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  isOperating: boolean
}

function CommentItem({
  comment,
  isEditing,
  editContent,
  onEditContentChange,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isOperating,
}: CommentItemProps) {
  return (
    <div className="group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {comment.author.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.author}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(comment.createdAt)}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-muted-foreground italic">
                (editado)
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSaveEdit}
                  disabled={!editContent.trim() || isOperating}
                >
                  {ui.salvar}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  {ui.cancelar}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>

        {/* Menu de ações */}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 size={14} className="mr-2" />
                {ui.editar}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                {ui.excluir}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

/**
 * Versão compacta do painel de comentários (inline)
 */
interface CommentsInlineProps {
  documentId: string
  eventId: string
  className?: string
}

export function CommentsInline({
  documentId,
  eventId,
  className,
}: CommentsInlineProps) {
  const { comments, total, loading, add, isOperating } = useCommentsManager(
    documentId,
    eventId,
  )
  const [newComment, setNewComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !authorName.trim()) return

    try {
      await add(newComment.trim(), authorName.trim())
      setNewComment('')
    } catch {
      // Erro já tratado no hook
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Botão para expandir/colapsar */}
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <MessageCircle size={16} />
        <span>
          {ui.comentarios} ({total})
        </span>
      </button>

      {isExpanded && (
        <>
          {/* Lista de comentários */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {ui.nenhumComentario}
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-auto">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {comment.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">
                        {comment.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
              {total > 5 && (
                <p className="text-xs text-primary">
                  +{total - 5} comentários
                </p>
              )}
            </div>
          )}

          {/* Formulário compacto */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-20 bg-muted/30 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <input
              type="text"
              placeholder={ui.seuComentario}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-muted/30 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <Button
              type="submit"
              size="icon"
              className="h-7 w-7"
              disabled={!newComment.trim() || !authorName.trim() || isOperating}
            >
              <Send size={14} />
            </Button>
          </form>
        </>
      )}
    </div>
  )
}

