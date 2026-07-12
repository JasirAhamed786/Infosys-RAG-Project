import React, { useMemo, useState } from 'react'
import { uploadKnowledgeBase } from '../services/api'

type UploadState = {
  file: File | null
  fileName: string
  fileSizeBytes: number
}

export default function KnowledgeBaseUpload() {
  const [state, setState] = useState<UploadState>({
    file: null,
    fileName: '',
    fileSizeBytes: 0,
  })

  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ chroma_collection_id: string; chunk_count: number } | null>(null)

  const sizeLabel = useMemo(() => {
    if (!state.fileSizeBytes) return ''
    const mb = state.fileSizeBytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    const kb = state.fileSizeBytes / 1024
    return `${kb.toFixed(1)} KB`
  }, [state.fileSizeBytes])

  const allowedUiExtensions = ['.pdf', '.txt', '.md']
  const allowedBackendExtensions = ['.pdf', '.txt']

  function getExtension(name: string): string {
    const idx = name.lastIndexOf('.')
    return idx >= 0 ? name.slice(idx).toLowerCase() : ''
  }

  function validateClientSide(file: File): string | null {
    const ext = getExtension(file.name)

    if (!allowedUiExtensions.includes(ext)) {
      return `Unsupported file type. Allowed: ${allowedUiExtensions.join(', ')}`
    }

    if (!allowedBackendExtensions.includes(ext)) {
      return 'Backend currently only supports .pdf and .txt. Please select a .pdf or .txt file.'
    }

    return null
  }

  function resetMessages() {
    setError(null)
    setSuccess(null)
  }

  function onPickFile(file: File | null) {
    resetMessages()
    if (!file) {
      setState({ file: null, fileName: '', fileSizeBytes: 0 })
      return
    }

    const ext = getExtension(file.name)
    if (!allowedUiExtensions.includes(ext)) {
      setState({ file: null, fileName: '', fileSizeBytes: 0 })
      setError(`Unsupported file type. Allowed: ${allowedUiExtensions.join(', ')}`)
      return
    }

    const backendValidation = validateClientSide(file)
    if (backendValidation) {
      setState({ file, fileName: file.name, fileSizeBytes: file.size })
      setError(backendValidation)
      return
    }

    setState({ file, fileName: file.name, fileSizeBytes: file.size })
  }

  async function onUpload() {
    resetMessages()

    if (!state.file) {
      setError('Please select a valid document to upload.')
      return
    }

    const backendValidation = validateClientSide(state.file)
    if (backendValidation) {
      setError(backendValidation)
      return
    }

    setLoading(true)
    try {
      const res = await uploadKnowledgeBase(state.file)
      setSuccess({ chroma_collection_id: res.chroma_collection_id, chunk_count: res.chunk_count })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed due to a network or server error.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Knowledge Base Upload</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
              RAG Ingestion
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">
            Ingest training documents into your vector database to enhance retrieval-augmented generation.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Drag & Drop Zone */}
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ease-in-out p-8 text-center ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.999]'
              : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragActive(true)
            resetMessages()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragActive(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragActive(false)
            const file = e.dataTransfer.files && e.dataTransfer.files.length > 0 ? e.dataTransfer.files[0] : null
            onPickFile(file)
          }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4 text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Drag and drop your training file here</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Supported formats: <span className="font-medium text-gray-700">{allowedUiExtensions.join(', ')}</span>. 
                  (Backend currently accepts <span className="font-semibold text-indigo-600">{allowedBackendExtensions.join(', ')}</span>).
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <label className="relative inline-flex items-center justify-center cursor-pointer rounded-xl bg-white border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 transition-all">
                <input
                  type="file"
                  className="sr-only"
                  accept={allowedUiExtensions.map((x) => `.${x.replace('.', '')}`).join(',')}
                  disabled={loading}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null
                    onPickFile(file)
                  }}
                />
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Browse Files
              </label>
            </div>
          </div>

          {/* Selected File Card */}
          {state.file && (
            <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm flex items-center justify-between text-left transition-all animate-fadeIn">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Ready for Ingestion</div>
                  <div className="font-medium text-gray-900 truncate text-sm mt-0.5">{state.fileName}</div>
                </div>
              </div>
              <div className="shrink-0 text-right pl-4">
                <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {sizeLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Upload Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={onUpload}
            disabled={loading || !state.file}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingesting into Vector Database...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload to Knowledge Base
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-500 sm:justify-end">
            <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tip: Test retrieval using <code className="font-mono bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200">POST /api/knowledge/query</code></span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3.5 transition-all animate-fadeIn">
            <div className="shrink-0 text-rose-500 mt-0.5">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-rose-900">Upload Failed</h4>
              <p className="text-sm text-rose-700 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-6 transition-all animate-fadeIn shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">Document Successfully Ingested</h4>
                <p className="text-xs text-emerald-800">Your embeddings are indexed and ready for AI retrieval.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl bg-white border border-emerald-200/80 p-3.5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Chroma Collection ID</span>
                <span className="text-sm font-mono text-gray-900 font-medium break-all">{success.chroma_collection_id}</span>
              </div>
              <div className="rounded-xl bg-white border border-emerald-200/80 p-3.5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Total Vector Chunks</span>
                <span className="text-sm font-mono font-bold text-emerald-600">{success.chunk_count} chunks created</span>
              </div>
            </div>
          </div>
        )}


      </div>
    </section>
  )
}