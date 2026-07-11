import React from 'react'

export default function KnowledgeBaseUpload() {
  return (
    <section className="bg-white border rounded-lg p-5">
      <h1 className="text-xl font-semibold mb-2">Knowledge Base Upload</h1>
      <p className="text-gray-600 text-sm mb-4">
        Milestone 1: backend ingestion is ready. UI upload can be added in a later milestone.
      </p>

      <div className="rounded border p-4 bg-gray-50">
        <div className="font-medium mb-2">How to test (backend endpoints)</div>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
          <li>
            Use <code className="px-1 bg-white border">POST /api/knowledge/upload</code> with PDF or TXT.
          </li>
          <li>
            Then call <code className="px-1 bg-white border">POST /api/knowledge/query</code> with a text query.
          </li>
        </ol>
      </div>
    </section>
  )
}

