from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGODB_URI: str
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"


settings = Settings()

