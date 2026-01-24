from fastapi import APIRouter, HTTPException
from backend.services.vector_store import delete_document_chunks, get_all_documents
from datetime import datetime

router = APIRouter()


@router.get("/documents")
async def list_documents():
    """Get a list of all uploaded documents with metadata."""
    try:
        documents = get_all_documents()
        
        # Use actual upload timestamp from metadata, fallback to current time if not available
        for doc in documents:
            if doc.get('upload_timestamp'):
                doc['last_updated'] = doc['upload_timestamp']
            else:
                # Fallback for old documents without timestamp
                doc['last_updated'] = datetime.now().isoformat()
        
        return {"documents": documents}
    
    except Exception as e:
        print(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving documents. Please try again.")


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its chunks from the vector store."""
    try:
        deleted_count = delete_document_chunks(doc_id)
        
        if deleted_count > 0:
            return {"message": f"Deleted {deleted_count} chunks for document {doc_id}"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    
    except HTTPException:
        raise
    except Exception as e:
        # Log the full error for debugging
        print(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting document. Please try again.")
