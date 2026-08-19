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
  filename: string
  chunk_count: number
  total_chunks_in_collection: number
  chroma_collection_id: string
}

export interface KnowledgeQueryRequest {
  query: string
  top_k?: number
  filter_source_document?: string | null
}

export interface KnowledgeResult {
  text: string
  similarity: number
  source_document: string
  chunk_index: number
  upload_date: string
}

export interface KnowledgeQueryResponse {
  results: KnowledgeResult[]
  total_chunks_in_collection: number
}

export interface SimulatorStartRequest {
  session_id: string
  mode: CreateSessionModeBackend
  product_context: string
  scenario: string
  persona: string | null
}

export interface SimulatorStartResponse {
  session_id: string
  thread_id: string
  messages: { role: string; content: string; turn_index: number }[]
}

export interface SimulatorTurnRequest {
  session_id: string
  thread_id: string
  user_message: string
  turn_index: number
}

export interface SimulatorTurnResponse {
  session_id: string
  thread_id: string
  turn_index: number
  customer_message: string
  metadata: { tone: string }
  intent_sentiment: {
    intent: string
    emotion: string
    frustration_score: number
    satisfaction_trend: string
  } | null
  knowledge: {
    results: {
      chunk_text: string
      source_document: string
      relevance_score: number
      why_relevant: string
    }[]
    note?: string
  } | null
  frustration_level: number | null
}

export interface ConversationTurnRequest {
  session_id: string
  mode: CreateSessionModeBackend
  product_context: string
  scenario: string
  persona: string | null
  user_message: string
  turn_index: number
}

export interface ConversationTurnResponse {
  session_id: string
  mode: CreateSessionModeBackend
  turn_index: number
  intent_sentiment: {
    intent: string
    emotion: string
    frustration_score: number
    satisfaction_trend: string
  }
  knowledge: {
    results: {
      chunk_text: string
      source_document: string
      relevance_score: number
      why_relevant: string
    }[]
    note?: string
  }
  coaching: {
    coaching_tips: string[]
    suggested_response: string
    tone_feedback?: string
    communication_tips?: string[]
    confidence?: number
  }
  escalation: {
    escalation_risk: number
    risk_level: string
    reasoning: string[]
    recommended_action?: string
    alert_triggered: boolean
    score: number
  }
  customer_simulation: {
    customer_message: string
    internal_frustration_level: number
    turn_index?: number
  }
}

// ─── Milestone 3: Replay Mode ──────────────────────────────────────

export interface ReplayUploadResponse {
  session_id: string
  total_turns: number
  position: number
}

export interface ReplayNextResponse {
  session_id: string
  done: boolean
  role: 'customer' | 'agent' | null
  content: string | null
  turn_index: number
  position: number
  total_turns: number
  intent_sentiment: ConversationTurnResponse['intent_sentiment'] | null
  knowledge: ConversationTurnResponse['knowledge'] | null
  coaching: ConversationTurnResponse['coaching'] | null
  escalation: ConversationTurnResponse['escalation'] | null
  customer_simulation: ConversationTurnResponse['customer_simulation'] | null
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

async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await parseErrorBody(res)
    throw new Error(`API Error ${res.status}: ${errBody}`)
  }

  return (await res.json()) as T
}

export interface SessionDetailResponse {
  session_id: string
  mode: CreateSessionModeBackend
  product_context: string
  scenario: string
  persona: string | null
  created_at: string
  status: string
}

export async function createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
  return apiPost<CreateSessionResponse>('/api/sessions/', data)
}

export async function getSession(sessionId: string): Promise<SessionDetailResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`)
  if (!res.ok) {
    const errBody = await parseErrorBody(res)
    throw new Error(`Failed to fetch session: ${errBody}`)
  }
  return res.json()
}

export async function uploadKnowledgeBase(file: File): Promise<UploadKnowledgeResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/api/knowledge/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new Error(`Failed to upload to knowledge base. Status: ${res.status}. ${body}`)
  }

  return (await res.json()) as UploadKnowledgeResponse
}

export async function queryKnowledge(query: string, sourceDoc?: string): Promise<KnowledgeQueryResponse> {
  return apiPost<KnowledgeQueryResponse>('/api/knowledge/query', {
    query,
    top_k: 3,
    filter_source_document: sourceDoc || null,
  } as KnowledgeQueryRequest)
}

export async function startSimulator(data: SimulatorStartRequest): Promise<SimulatorStartResponse> {
  return apiPost<SimulatorStartResponse>('/api/simulator/start', data)
}

export async function simulatorTurn(data: SimulatorTurnRequest): Promise<SimulatorTurnResponse> {
  return apiPost<SimulatorTurnResponse>('/api/simulator/message', data)
}

export async function conversationTurn(data: ConversationTurnRequest): Promise<ConversationTurnResponse> {
  return apiPost<ConversationTurnResponse>('/api/conversation/turn', data)
}

export function getSimulatorStreamUrl(sessionId: string, agentMessage: string, turnIndex: number): string {
  const params = new URLSearchParams({
    agent_message: agentMessage,
    turn_index: turnIndex.toString(),
  })
  return `${API_BASE}/api/simulator/stream/${sessionId}?${params.toString()}`
}

// ─── Milestone 3: Replay Mode ──────────────────────────────────────

export async function uploadReplayTranscript(sessionId: string, file: File): Promise<ReplayUploadResponse> {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/api/replay/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new Error(`Failed to upload transcript. Status: ${res.status}. ${body}`)
  }

  return (await res.json()) as ReplayUploadResponse
}

export async function replayNext(sessionId: string): Promise<ReplayNextResponse> {
  const formData = new FormData()
  formData.append('session_id', sessionId)

  const res = await fetch(`${API_BASE}/api/replay/next`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new Error(`Failed to advance replay. Status: ${res.status}. ${body}`)
  }

  return (await res.json()) as ReplayNextResponse
}

export async function fetchHealth(): Promise<{ status: string; milestone: string }> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new Error('Backend not reachable')
  return res.json()
}