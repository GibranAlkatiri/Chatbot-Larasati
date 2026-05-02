import os
from dotenv import load_dotenv

load_dotenv()


class Config:

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    COHERE_API_KEY = os.getenv("COHERE_API_KEY")

    EMBEDDING_MODEL = os.getenv(
        "EMBEDDING_MODEL",
        "text-embedding-3-small"
    )

    MODELS = {
        "simple": os.getenv("GEMINI_MODEL"),
        "medium": os.getenv("GROQ_MODEL"),
        "complex": os.getenv("OPENAI_MODEL"),
    }

    RERANK_MODELS = {
        "medium": os.getenv("MINILM_RERANK_MODEL"),
        "complex": os.getenv("COHERE_RERANK_MODEL"),
    }

    DOCS_FOLDER = os.getenv("DOCS_FOLDER", "docs")
    VECTOR_DB = os.getenv("VECTOR_DB", "vector_db")

    N8N_WEBHOOKS = {
        "simple": os.getenv("N8N_WEBHOOK_SIMPLE"),
        "medium": os.getenv("N8N_WEBHOOK_MEDIUM"),
        "complex": os.getenv("N8N_WEBHOOK_COMPLEX"),
    }
