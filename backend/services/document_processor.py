from typing import List, Tuple
import PyPDF2
import docx
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Text splitter configuration (1000 chunk size, 150 overlap)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    length_function=len,
)


def extract_text_from_pdf(file_path: str) -> List[Tuple[str, int]]:
    """Extract text from PDF with page numbers."""
    texts = []
    with open(file_path, 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num, page in enumerate(pdf_reader.pages, start=1):
            text = page.extract_text()
            if text.strip():
                texts.append((text, page_num))
    return texts


def extract_text_from_docx(file_path: str) -> List[Tuple[str, int]]:
    """Extract text from DOCX (no page numbers for DOCX)."""
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text)
    text = "\n".join(full_text)
    return [(text, 1)] if text.strip() else []


def extract_text_from_txt(file_path: str) -> List[Tuple[str, int]]:
    """Extract text from TXT file."""
    with open(file_path, 'r', encoding='utf-8') as txt_file:
        text = txt_file.read()
    return [(text, 1)] if text.strip() else []


def extract_text(file_path: str, file_name: str) -> List[Tuple[str, int]]:
    """Extract text based on file extension."""
    extension = file_name.lower().split('.')[-1]
    
    if extension == 'pdf':
        return extract_text_from_pdf(file_path)
    elif extension in ['docx', 'doc']:
        return extract_text_from_docx(file_path)
    elif extension == 'txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {extension}")


def split_text(text: str) -> List[str]:
    """Split text into chunks using the text splitter."""
    return text_splitter.split_text(text)
