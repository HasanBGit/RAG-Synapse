from typing import List, Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
