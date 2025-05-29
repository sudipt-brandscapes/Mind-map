import json
import tempfile
import os
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
from PyPDF2 import PdfReader
import fitz
from llama_parse import LlamaParse

# Configuration
API_KEY = ""
LLM_MODEL = "gpt-4o"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 100

# Initialize OpenAI client
llm = OpenAI(api_key=API_KEY)

def detect_document_complexity(file_path):
    """Detect if PDF contains images or other complex elements."""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            images = page.get_images()
            if images:
                return True
        return False
    except Exception as e:
        print(f"Error detecting images in PDF: {e}")
        return False

def extract_text_simple_pdf(file_content):
    """Extract text from simple PDFs using PyPDF2."""
    reader = PdfReader(file_content)
    return "\n".join(page.extract_text() or "" for page in reader.pages)

def process_complex_document_with_llamaparse(file_path, llama_api_key):
    """Process complex document using LlamaParse."""
    try:
        parser = LlamaParse(
            api_key=llama_api_key,
            result_type="markdown",
            verbose=True,
            images=True,
            premium_mode=True
        )
        
        parsed_documents = parser.load_data(file_path)
        full_text = '\n'.join([doc.text for doc in parsed_documents])
        
        return full_text
        
    except Exception as e:
        print(f"Error in complex document processing: {str(e)}")
        raise

def extract_text_from_pdf(uploaded_file, llama_api_key=None):
    """Enhanced text extraction that uses LlamaParse for complex documents."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        for chunk in uploaded_file.chunks():
            tmp_file.write(chunk)
        tmp_file_path = tmp_file.name
    
    try:
        is_complex = detect_document_complexity(tmp_file_path)
        
        if is_complex and llama_api_key:
            text = process_complex_document_with_llamaparse(tmp_file_path, llama_api_key)
        else:
            uploaded_file.seek(0)
            text = extract_text_simple_pdf(uploaded_file)
        
        return text, is_complex
    
    finally:
        os.unlink(tmp_file_path)

def chunk_text(text):
    """Split text into chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    return splitter.split_text(text)

def generate_mindmap_json(text):
    """Generate mind map JSON using OpenAI."""
    prompt = f"""
Please output a multilevel hierarchical mind map in JSON format for the text below.
ONLY return valid JSON—no markdown, no explanations.
Structure:
{{"name":"Main Topic","children":[{{"name":"Subtopic","children":[...]}}]}}

Text:
{text}
"""
    resp = llm.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role":"user","content":prompt}],
        temperature=0.3
    )
    s = resp.choices[0].message.content

    # bracket‑count extraction
    depth = 0
    start = None
    for i, c in enumerate(s):
        if c == '{':
            if depth == 0:
                start = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and start is not None:
                return json.loads(s[start:i+1])
    return json.loads(s)

def answer_question(context, question):
    """Answer question based on context."""
    prompt = f"""Given the following content, answer the question.

Content:
{context}

Question:
{question}
"""
    resp = llm.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role":"user","content":prompt}],
        temperature=0.3
    )
    return resp.choices[0].message.content

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_pdf(request):
    """Handle PDF upload and generate mind map."""
    try:
        if 'file' not in request.FILES:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        llama_api_key = request.data.get('llama_api_key', None)
        
        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract text
        text, is_complex = extract_text_from_pdf(uploaded_file, llama_api_key)
        
        if not text.strip():
            return Response({'error': 'No text found in PDF'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Chunk text
        chunks = chunk_text(text)
        sample = "\n".join(chunks[:3])
        
        # Generate mind map
        tree = generate_mindmap_json(sample)
        
        return Response({
            'success': True,
            'mindmap': tree,
            'stats': {
                'total_characters': len(text),
                'number_of_chunks': len(chunks),
                'is_complex': is_complex
            },
            'text_sample': sample
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def ask_question(request):
    """Handle question answering."""
    try:
        data = json.loads(request.body)
        context = data.get('context', '')
        question = data.get('question', '')
        
        if not context or not question:
            return Response({'error': 'Context and question are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        answer = answer_question(context, question)
        
        return Response({
            'success': True,
            'answer': answer
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)