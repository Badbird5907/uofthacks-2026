"""
Configuration and client initialization for the application.
"""
import os
from dotenv import load_dotenv
from firecrawl import Firecrawl
from google import genai
from exa_py import Exa

# Load environment variables
load_dotenv()

# Initialize clients
firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')
gemini_api_key = os.getenv('GEMINI_API_KEY')
exa_api_key = os.getenv('EXA_API_KEY')

if not firecrawl_api_key:
    raise ValueError("FIRECRAWL_API_KEY environment variable is not set")
if not gemini_api_key:
    raise ValueError("GOOGLE_GEMINI_API_KEY environment variable is not set")
if not exa_api_key:
    raise ValueError("EXA_API_KEY environment variable is not set")

firecrawl = Firecrawl(api_key=firecrawl_api_key)
gemini_client = genai.Client(api_key=gemini_api_key)
exa_client = Exa(api_key=exa_api_key)

# Model to use for Gemini
GEMINI_MODEL = "gemini-3-flash-preview"

