import os
import warnings
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
import chromadb
from chromadb.config import Settings
from openai import OpenAI
import numpy as np

# Suppress ChromaDB telemetry warnings
warnings.filterwarnings("ignore", message=".*telemetry.*")

# Load environment variables
load_dotenv()

# Lazy initialization for API clients
_embeddings_client = None
_embeddings_error = None
_llm_client = None
_llm_error = None

EMBEDDING_DIMENSION = 4096
EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-8B"


def get_embeddings_client():
    """Get or initialize Hugging Face embeddings client (lazy initialization)."""
    global _embeddings_client, _embeddings_error
    if _embeddings_client is None and _embeddings_error is None:
        try:
            HF_API_KEY = os.getenv("HF_API_KEY")
            HF_PROVIDER = os.getenv("HF_PROVIDER", "default")
            
            if not HF_API_KEY:
                raise ValueError("HF_API_KEY not found in environment variables. Get your free API key at https://huggingface.co/settings/tokens")
            
            # Initialize Hugging Face Inference client
            if HF_PROVIDER and HF_PROVIDER != "default":
                print(f"Using Hugging Face Inference API with provider: {HF_PROVIDER}")
                _embeddings_client = InferenceClient(
                    provider=HF_PROVIDER,
                    api_key=HF_API_KEY,
                )
            else:
                print("Using Hugging Face Inference API (default provider)...")
                _embeddings_client = InferenceClient(
                    api_key=HF_API_KEY,
                )
        except Exception as e:
            _embeddings_error = str(e)
            print(f"Warning: Failed to initialize Hugging Face client: {_embeddings_error}")
    
    if _embeddings_error:
        raise ValueError(f"Embeddings client not initialized: {_embeddings_error}")
    return _embeddings_client


def get_llm_client():
    """Get or initialize DeepSeek LLM client (lazy initialization)."""
    global _llm_client, _llm_error
    if _llm_client is None and _llm_error is None:
        try:
            DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
            if not DEEPSEEK_API_KEY:
                raise ValueError("DEEPSEEK_API_KEY not found in environment variables")
            
            # DeepSeek uses OpenAI-compatible API
            _llm_client = OpenAI(
                api_key=DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com"
            )
        except Exception as e:
            _llm_error = str(e)
            print(f"Warning: Failed to initialize DeepSeek client: {_llm_error}")
    
    if _llm_error:
        raise ValueError(f"LLM client not initialized: {_llm_error}")
    return _llm_client


# Note: For direct access to clients, use get_embeddings_client() and get_llm_client()
# These functions handle lazy initialization and provide clear error messages

# Initialize ChromaDB
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
chroma_client = chromadb.PersistentClient(
    path=CHROMA_DB_PATH,
    settings=Settings(anonymized_telemetry=False)
)

# Collection name
COLLECTION_NAME = "documents"

# Get or create collection
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)


def get_embedding(text: str, is_query: bool = False) -> list:
    """
    Get embedding from Hugging Face Inference API.
    
    Args:
        text: Text to embed
        is_query: If True, uses query prompt for better retrieval
    
    Returns:
        List of embedding values (4096 dimensions)
    """
    try:
        # Get embeddings client (lazy initialization)
        client = get_embeddings_client()
        
        # For queries, format with instruction for better retrieval
        if is_query:
            formatted_text = f"Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: {text}"
        else:
            formatted_text = text
        
        # Call Hugging Face Inference API using InferenceClient
        result = client.feature_extraction(
            formatted_text,
            model=EMBEDDING_MODEL,
        )
        
        # Convert to numpy array and normalize
        embedding = np.array(result)
        
        # Handle both single and batch responses
        if embedding.ndim > 1:
            embedding = embedding[0]
        
        # Normalize the embedding
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding.tolist()
    except Exception as e:
        print(f"Error getting embedding from Hugging Face API: {str(e)}")
        raise


def test_huggingface_connection() -> dict:
    """Test Hugging Face API connectivity."""
    try:
        client = get_embeddings_client()
        # Make a simple test call with a short text
        result = client.feature_extraction("test", model=EMBEDDING_MODEL)
        return {"status": "ok", "error": None}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def test_deepseek_connection() -> dict:
    """Test DeepSeek API connectivity."""
    try:
        client = get_llm_client()
        # Make a simple test call
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        return {"status": "ok", "error": None}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def test_chromadb_connection() -> dict:
    """Test ChromaDB connection."""
    try:
        # Try to access the collection
        collection = chroma_client.get_collection(COLLECTION_NAME)
        # Try a simple query to verify it works
        collection.peek(limit=1)
        return {"status": "ok", "error": None}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def get_api_config_status() -> dict:
    """Get API configuration status (without exposing keys)."""
    return {
        "huggingface": {
            "api_key_present": os.getenv("HF_API_KEY") is not None,
            "provider": os.getenv("HF_PROVIDER", "default"),
            "initialized": _embeddings_client is not None,
            "error": _embeddings_error
        },
        "deepseek": {
            "api_key_present": os.getenv("DEEPSEEK_API_KEY") is not None,
            "initialized": _llm_client is not None,
            "error": _llm_error
        },
        "chromadb": {
            "path": CHROMA_DB_PATH,
            "collection": COLLECTION_NAME,
            "initialized": chroma_client is not None
        }
    }
