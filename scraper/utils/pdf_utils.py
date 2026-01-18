"""
PDF processing utilities.
"""
import io
import requests
from PyPDF2 import PdfReader


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text content from PDF bytes."""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""


def fetch_pdf_from_cdn(pdf_url: str) -> bytes:
    """Fetch PDF bytes from a CDN URL."""
    try:
        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error fetching PDF from CDN: {e}")
        raise
