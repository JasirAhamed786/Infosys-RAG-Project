export type CreateSessionModeBackend = 'Simulator' | 'Manual' | 'Replay'

export interface CreateSessionRequest {
  mode: CreateSessionModeBackend
  product_context: string
  scenario: string
  persona: string | null
}

export interface CreateSessionResponse {
  session_id: string
}

export interface UploadKnowledgeResponse {
  chroma_collection_id: string
  chunk_count: number
}

const API_BASE = 'http://127.0.0.1:8000'

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (text && text.trim().length > 0) return text
  } catch {
    // ignore if parsing fails
  }
  return `HTTP ${res.status}`
}

export async function createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
  // Added trailing slash just in case FastAPI expects it!
  const endpoint = `${API_BASE}/api/sessions/`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new Error(`Failed to create session. Status: ${res.status}. ${body}`)
  }

  return (await res.json()) as CreateSessionResponse
}

export async function uploadKnowledgeBase(file: File): Promise<UploadKnowledgeResponse> {
  // 👇 CRITICAL FIX: Added trailing slash "/" to prevent browser CORS redirect errors on uploads! 👇
  const endpoint = `${API_BASE}/api/knowledge/upload`

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new Error(`Failed to upload to knowledge base. Status: ${res.status}. ${body}`)
  }

  return (await res.json()) as UploadKnowledgeResponse
}