# AI Interview Analyzer

A video analysis pipeline that ingests interview videos from cloud storage and uses [Twelve Labs](https://twelvelabs.io/) video understanding API to provide detailed feedback on interview performance.

## About

This application receives interview videos from blob/object storage (S3, Vultr) and processes them through Twelve Labs' multimodal AI pipeline:

1. **Marengo 3.0** (Embedding Engine) - Indexes the video content for semantic understanding
2. **Pegasus 1.2** (Analysis Engine) - Analyzes and scores various interview parameters

The system evaluates multiple aspects of interview performance including confidence, clarity, speech rate, eye contact, body language, and voice tone.

## Features

- **Cloud Storage Integration** - Ingest videos directly from S3, Vultr, or other object storage via URL
- **Video Indexing** - Semantic video indexing powered by Marengo 3.0 embedding engine
- **AI Analysis** - Comprehensive video analysis using Pegasus 1.2
- **Performance Metrics** - Numerical ratings for multiple categories:
  - Confidence
  - Clarity
  - Speech Rate
  - Eye Contact
  - Body Language
  - Voice Tone
- **Key Points** - Summarizes the candidate's overall strengths and weaknesses

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | JavaScript, HTML, CSS |
| **Backend** | Python, Flask |
| **AI/ML** | TwelveLabs API |
| **Containerization** | Docker |

## Prerequisites

- Python 3.11+
- A [Twelve Labs](https://twelvelabs.io/) API key
- A Twelve Labs Index ID

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone ...
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Copy the example environment file and fill in your credentials:
   ```bash
   cp .example.env .env
   ```
   
   Then edit `.env` with your Twelve Labs credentials:
   ```env
   API_KEY=your_twelvelabs_api_key
   API_URL=https://api.twelvelabs.io/v1.3
   INDEX_ID=your_twelvelabs_index_id
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

   The app will be available at `http://localhost:6767`

## Usage

1. Send a POST request to `/upload` with a `video_url` pointing to your video in cloud storage (S3, Vultr, etc.)
2. The video is indexed using Marengo 3.0 embedding engine
3. Pegasus 1.2 analyzes the indexed video and scores interview parameters
4. Receive JSON response with performance metrics and key points

### Example Request

```bash
curl -X POST http://localhost:6767/upload \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://your-storage.com/interview.mp4"}'
```

## Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t twelvelabs-app .
   ```

2. **Run the container**
   ```bash
   docker run -p 6767:6767 --env-file .env twelvelabs-app
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main interview interface |
| `POST` | `/upload` | Indexes and analyzes a video from cloud storage (accepts `video_url` in JSON body) |

## Project Structure

```
twelvelabs/
├── src/
│   └── README.md
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
├── templates/
│   └── index.html
├── app.py
├── Dockerfile
├── README.md
├── requirements.txt
├── .dockerignore
├── .example.env
└── .gitignore
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Your Twelve Labs API key | Yes |
| `API_URL` | Twelve Labs API base URL | Yes |
| `INDEX_ID` | Your Twelve Labs index ID | Yes |


