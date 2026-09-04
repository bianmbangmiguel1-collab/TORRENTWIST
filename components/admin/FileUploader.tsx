// components/admin/FileUploader.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { File, X, CheckCircle } from 'lucide-react'

interface FileUploaderProps {
  currentFile?: string | null
  fileSize?: string | null
  fileFormat?: string | null
  onUpload: (fileInfo: { path: string; size: string; format: string }) => void
  onRemove?: () => void
  disabled?: boolean
}

export default function FileUploader({
  currentFile,
  fileSize,
  fileFormat,
  onUpload,
  onRemove,
  disabled = false
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pour le débogage : affiche dans la console quand le fichier actuel change
  useEffect(() => {
    if (currentFile) {
      console.log(`📎 Fichier actuel : ${currentFile} (${fileSize || 'taille inconnue'}, ${fileFormat || 'format inconnu'})`)
    }
  }, [currentFile, fileSize, fileFormat])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation de la taille
    const maxSize = 100 * 1024 * 1024 // 100 MB
    if (file.size > maxSize) {
      setError('Le fichier dépasse la taille maximale de 100 MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Construction des informations du fichier
      const fileInfo = {
        path: `/uploads/${file.name}`,
        size: `${Math.round(file.size / 1024 / 1024)} MB`,
        format: file.name.split('.').pop()?.toUpperCase() || ''
      }

      // Appel de la callback pour mettre à jour le formulaire
      onUpload(fileInfo)

      // Réinitialisation de l'input pour permettre de sélectionner à nouveau le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const getFileName = (path: string) => {
    return path.split('/').pop() || path
  }

  // Afficher le fichier actuel s'il existe
  const hasFile = currentFile && currentFile.trim() !== ''

  return (
    <div className="space-y-3">
      {/* Affichage du fichier existant */}
      {hasFile && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <File className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-800 truncate">
                {getFileName(currentFile)}
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                {fileSize && <span>Taille : {fileSize}</span>}
                {fileFormat && <span>Format : {fileFormat}</span>}
              </div>
            </div>
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 flex-shrink-0"
              title="Supprimer le fichier"
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Zone de téléchargement d'un nouveau fichier */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {uploading && (
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <span className="animate-spin">⏳</span> Téléchargement en cours...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 flex items-center gap-1">
            <X size={14} /> {error}
          </div>
        )}
        <p className="text-xs text-gray-400">
          Formats acceptés : PDF, ZIP, MP4, MP3, PNG, JPG, DOC, XLS, etc. (max 100 MB)
        </p>
      </div>
    </div>
  )
}