from fastapi import APIRouter, HTTPException, status
from backend.models import ChatRequest, ChatResponse
from backend.config import get_embedding, get_llm_client, test_huggingface_connection, test_deepseek_connection, test_chromadb_connection, get_api_config_status
from backend.services.vector_store import search_similar_chunks

router = APIRouter()


def is_simple_greeting(query: str) -> bool:
    """Check if the query is a simple greeting or casual conversation."""
    query_lower = query.lower().strip()
    greetings = ['hello', 'hi', 'hey', 'how are you', 'how are u', "how're you", "how're u",
                 'what\'s up', 'whats up', 'greetings', 'good morning', 'good afternoon', 
                 'good evening', 'good night', 'sup', 'yo', 'hows it going', "how's it going"]
    
    # Check for exact matches or if query is very short
    if query_lower in greetings or len(query_lower.split()) <= 2:
        return True
    
    # Check if query starts with a greeting
    for greeting in greetings:
        if query_lower.startswith(greeting):
            return True
    
    return False


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint that retrieves context and generates response with citations."""
    try:
        # Check if LLM client is available
        try:
            llm_client = get_llm_client()
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"LLM service is not available: {str(e)}. Please check your DEEPSEEK_API_KEY environment variable."
            )
        
        # Handle simple greetings first - respond conversationally without searching documents
        if is_simple_greeting(request.query):
            response = llm_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a friendly and helpful AI assistant. Respond naturally to greetings and casual conversation. Be warm, conversational, and helpful. Keep responses brief and friendly."
                    },
                    {"role": "user", "content": request.query}
                ],
                temperature=0.7
            )
            answer = response.choices[0].message.content
            
            return ChatResponse(
                answer=answer,
                sources=[]
            )
        
        # For actual questions, search documents
        try:
            query_embedding = get_embedding(request.query, is_query=True)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Embedding service is not available: {str(e)}. Please check your HF_API_KEY environment variable."
            )
        
        search_results = search_similar_chunks(query_embedding, request.top_k)
        
        # If no documents found, allow general conversation
        if not search_results:
            response = llm_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a friendly and helpful AI assistant. You can have normal conversations with users. If they ask about documents, politely let them know they need to upload documents first. Otherwise, be conversational and helpful."
                    },
                    {"role": "user", "content": request.query}
                ],
                temperature=0.7
            )
            answer = response.choices[0].message.content
            
            return ChatResponse(
                answer=answer,
                sources=[]
            )
        
        # Check if search results have low relevance (threshold: 0.3)
        max_score = max(r['score'] for r in search_results) if search_results else 0
        
        # If low relevance, respond conversationally but mention documents are available
        if max_score < 0.3:
            response = llm_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a friendly AI assistant. You have access to uploaded documents, but the current question doesn't seem directly related to them. Answer naturally and helpfully. If appropriate, you can mention that you have documents available if they want to ask about them."
                    },
                    {"role": "user", "content": request.query}
                ],
                temperature=0.7
            )
            answer = response.choices[0].message.content
            
            return ChatResponse(
                answer=answer,
                sources=[]
            )
        
        # Prepare context with sources for RAG mode
        context_parts = []
        sources = []
        
        for idx, result in enumerate(search_results, start=1):
            payload = result['payload']
            context_parts.append(
                f"[Source {idx}] (File: {payload['file_name']}, Page: {payload['page']}, Chunk: {payload['chunk_id']})\n{payload['text']}"
            )
            sources.append({
                "file_name": payload['file_name'],
                "page": payload['page'],
                "chunk_id": payload['chunk_id'],
                "score": result['score'],
                "text": payload.get('text', '')
            })
        
        context = "\n\n".join(context_parts)
        
        # Create prompt with instructions for RAG mode
        prompt = f"""You are a helpful assistant that answers questions based on the provided context from uploaded documents.

When answering:
1. Use information from the context below to answer the question naturally
2. Include inline citations for specific facts or information using the format [source:filename | page X | chunk Y]
3. Be conversational and helpful - don't force citations for every sentence
4. If the answer is not fully in the context, say what you can from the context
5. Only cite actual facts, not general conversation

Context from documents:
{context}

User Question: {request.query}

Answer naturally with citations for facts:"""

        # Get response from DeepSeek
        response = llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that answers questions using information from uploaded documents. Include citations for facts, but be natural and conversational."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        answer = response.choices[0].message.content
        
        return ChatResponse(
            answer=answer,
            sources=sources
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (like 503 Service Unavailable)
        raise
    except Exception as e:
        # Log the full error for debugging
        print(f"Error processing chat request: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing your request: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint to test API connectivity."""
    huggingface_status = test_huggingface_connection()
    deepseek_status = test_deepseek_connection()
    chromadb_status = test_chromadb_connection()
    
    # Overall status is ok if all services are ok
    overall_status = "ok" if all(
        s["status"] == "ok" 
        for s in [huggingface_status, deepseek_status, chromadb_status]
    ) else "degraded"
    
    return {
        "status": overall_status,
        "services": {
            "huggingface": huggingface_status,
            "deepseek": deepseek_status,
            "chromadb": chromadb_status
        },
        "config": get_api_config_status()
    }
