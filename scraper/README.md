# Firecrawl Flask API

A Flask REST API wrapper for Firecrawl, enabling web scraping and crawling functionality.

## Features

- 🔍 Scrape single URLs
- 🕷️ Crawl websites
- 🔎 Search functionality
- 🌐 CORS enabled
- 🔐 Environment variable configuration
- 📄 Resume profile processing with Gemini, Exa, and Firecrawl integration

## Setup

1. **Clone or navigate to the project directory**

2. **Create a virtual environment** (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```
FIRECRAWL_API_KEY=your_actual_api_key_here
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
EXA_API_KEY=your_exa_api_key_here
```

You can get your API keys from:
- Firecrawl: [https://firecrawl.dev](https://firecrawl.dev)
- Gemini: [https://ai.google.dev](https://ai.google.dev)
- Exa: [https://exa.ai](https://exa.ai)

5. **Run the application**:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Testing

Run tests with pytest:

**Unit tests:**
```bash
pytest test_process_profile.py -v
```

**Full integration test with realistic sample data:**
```bash
pytest test_integration_full.py -v -s
```

The integration test demonstrates the complete flow with realistic sample data and validates all API calls work correctly.

## API Endpoints

### Health Check
```
GET /
```
Returns API status.

### Scrape URL
```
POST /api/scrape
Content-Type: application/json

{
  "url": "https://example.com",
  "formats": ["markdown", "html"]  // optional
}
```

### Crawl Website
```
POST /api/crawl
Content-Type: application/json

{
  "url": "https://example.com",
  "limit": 10,  // optional
  "formats": ["markdown"]  // optional
}
```

### Map Website
```
POST /api/map
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### Process Profile (Resume Analysis)
```
POST /api/process-profile
Content-Type: multipart/form-data

Fields:
- resume: PDF file (required)
- linkedin_url: LinkedIn profile URL (required)
- other_links: JSON array of URLs or multiple form fields (optional)

Returns a comprehensive PersonSchema with all extracted information.
```

## Example Usage

### Using cURL

**Scrape a URL**:
```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Crawl a website**:
```bash
curl -X POST http://localhost:5000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "limit": 10, "formats": ["markdown"]}'
```

**Map a website**:
```bash
curl -X POST http://localhost:5000/api/map \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Process Profile (Resume Analysis)**:
```bash
curl -X POST http://localhost:5000/api/process-profile \
  -F "resume=@/path/to/resume.pdf" \
  -F "linkedin_url=https://linkedin.com/in/username" \
  -F 'other_links=["https://github.com/username", "https://example.com/portfolio"]'
```

### Using Python

```python
import requests

# Scrape a URL
response = requests.post(
    'http://localhost:5000/api/scrape',
    json={'url': 'https://example.com', 'formats': ['markdown']}
)
print(response.json())

# Crawl a website
response = requests.post(
    'http://localhost:5000/api/crawl',
    json={'url': 'https://example.com', 'limit': 10}
)
print(response.json())

# Process Profile
with open('resume.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:5000/api/process-profile',
        files={'resume': f},
        data={
            'linkedin_url': 'https://linkedin.com/in/username',
            'other_links': json.dumps(['https://github.com/username'])
        }
    )
print(response.json())
```

## Configuration

- `PORT`: Server port (default: 5000)
- `FLASK_ENV`: Environment mode (development/production)
- `FIRECRAWL_API_KEY`: Your Firecrawl API key (required)
- `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key (required for process-profile endpoint)
- `EXA_API_KEY`: Your Exa API key (required for process-profile endpoint)

## License

MIT
