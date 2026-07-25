from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Required. For local runs you MUST create backend/.env (or root .env that backend picks up).
    MONGODB_URI: str

    # Groq API (free tier) — required for Simulator Agent (Llama 3.3 70B) & Intent Agent (Llama 3.1 8B)
    GROQ_API_KEY: str = ""

    # Google Gemini API (free tier) — required for Knowledge Recommendation Agent (Gemini 2.0 Flash)
    GEMINI_API_KEY: str = ""

    CHROMA_PERSIST_DIR: str = "./chroma_data"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Shared ChromaDB collection name for all knowledge base documents
    CHROMA_COLLECTION_NAME: str = "clario_knowledge_base"

    # Groq models
    GROQ_SIMULATOR_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_INTENT_MODEL: str = "llama-3.1-8b-instant"

    # Gemini model
    GEMINI_KNOWLEDGE_MODEL: str = "gemini-2.0-flash-exp"

    # Retry settings for rate limits
    MAX_RETRIES: int = 3
    RETRY_BASE_DELAY: float = 2.0


settings = Settings()


