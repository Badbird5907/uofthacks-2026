import os
import json
import random
import time
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from twelvelabs import TwelveLabs
from twelvelabs.types import ResponseFormat
import requests
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

API_KEY = os.getenv('API_KEY')
API_URL = os.getenv('API_URL')
index_id = os.getenv('INDEX_ID')

client = TwelveLabs(api_key=API_KEY)

print("Environment Variables:")
print(f"API_URL exists: {'API_URL' in os.environ}")
print(f"API_KEY exists: {'API_KEY' in os.environ}")
print(f"index_id exists: {'INDEX_ID' in os.environ}")


def check_api_connection():
    try:

        api_url = "https://api.twelvelabs.io/v1.3/tasks" 
        print(f"Attempting to connect to API: {api_url}")
        print(f"API Key (first 4 chars): {API_KEY[:4]}...")
        
        response = requests.get(api_url, headers={
            "x-api-key": API_KEY,
            "Accept": "application/json"
        })
        print(f"Response status code: {response.status_code}")
        return response.status_code in [200, 401, 403]
    except requests.RequestException as e:
        print(f"API connection check failed. Detailed error: {str(e)}")
        return False


def process_api_response(data, schema=None):
    """
    Process API response dynamically based on the data or provided schema.
    - If schema is provided, use its properties as defaults
    - Otherwise, just parse and return whatever the API sends
    """
    # Build default values from schema if provided
    if schema and "properties" in schema:
        processed_data = {}
        for key, prop in schema["properties"].items():
            if prop.get("type") == "array":
                processed_data[key] = []
            elif prop.get("type") == "number":
                processed_data[key] = 0
            elif prop.get("type") == "string":
                processed_data[key] = ""
            else:
                processed_data[key] = None
    else:
        processed_data = {}
    
    try:
        # Parse JSON string if needed
        if isinstance(data, str):
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', data)
                if json_match:
                    data = json.loads(json_match.group())
                else:
                    data = json.loads(data)
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"Raw data: {data}")
                return processed_data
        
        # Copy all fields from response data
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (int, float)):
                    processed_data[key] = value
                elif isinstance(value, str):
                    # Try to convert numeric strings to numbers
                    if value.replace('.', '').replace('-', '').isdigit():
                        processed_data[key] = float(value)
                    else:
                        processed_data[key] = value
                elif isinstance(value, list):
                    processed_data[key] = value
                else:
                    processed_data[key] = value
                        
    except Exception as e:
        print(f"Error processing response: {e}")
        print(f"Raw data: {data}")
    
    return processed_data

@app.route('/')
def index():
    # return jsonify({"hello": "world"})
    return render_template('index.html')

@app.route('/get_question')
def get_question():
    question = "Who are you?"
    return jsonify({"question": question})

@app.route('/upload', methods=['POST'])
def upload():
    url = "https://api.twelvelabs.io/v1.3/tasks"
    headers = {"x-api-key": API_KEY}
    
    # Get video_url from request body (JSON)
    try:
        data = request.get_json()
    except Exception as e:
        print(f"Error parsing input data: {e}")
        return jsonify({"error": f"Invalid input data: {e}"}), 400
    video_url = data.get('video_url') if data else None
    print("Data received:", data)
    try:

        if video_url:
            data = {
                'index_id': (None, index_id),
                'video_url': (None, video_url)
            }
            response = requests.post(url, files=data, headers=headers)
            print("Upload complete: ", response.json())
        else:
            video_path = "/Users/johndoe/stuff/TwelveLabs-Interview-App/uploads/interview.mp4" or ""
            
            # if not os.path.exists(video_path):
            #     return jsonify({"error": f"Video file not found: {video_path}"}), 400
            
            with open(video_path, 'rb') as video_file:
                files = {"video_file": video_file}
                payload = {"index_id": index_id}
                response = requests.post(url, data=payload, files=files, headers=headers)

        return analyze_video(response.json()['video_id'])

        # return analyze_video("696c0ba4684c0432bbde7e1c")

    except Exception as e:
        print(f"Error uploading video: {str(e)}")
        return jsonify({"error": str(e)}), 500

def analyze_video(video_id):
    """Common video analysis logic"""

    try:

        # 5. Monitor the indexing process
        print("Waiting for indexing to complete.")
        while True:
            indexed_asset = client.indexes.indexed_assets.retrieve(
                index_id=index_id,
                indexed_asset_id=video_id
            )
            print(f"  Status={indexed_asset.status}")
            if indexed_asset.status == "ready":
                print("Indexing complete!")
                break
            elif indexed_asset.status == "failed":
                raise RuntimeError("Indexing failed")
            time.sleep(2)
        
        prompt = """You're an Interviewer, Analyze the video clip of the interview answer.

        Rate the numerical categories based on the interview, where 1 is the lowest and 10 is the highest.

        You must be strict and justifiable with the ratings.

        If the face is not present in the video then provide lower points (less than 5) for all categories.
        If and only if the submission is not a valid interview, then the key_points should say so, and all categories should be 0.

        Provide the response in the following JSON format with numerical values from 1-10:
        {
            "confidence": <number>,
            "clarity": <number>,
            "speech_rate": <number>,
            "eye_contact": <number>,
            "body_language": <number>,
            "voice_tone": <number>,
            "key_points": [<List of technical and non-technical strengths and weaknesses as strings to create a candidate identity profile.>]
        }"""

        main_schema = {
            "type": "object",
            "properties": {
                "confidence": {"type": "number"},
                "clarity": {"type": "number"},
                "speech_rate": {"type": "number"},
                "eye_contact": {"type": "number"},
                "body_language": {"type": "number"},
                "voice_tone": {"type": "number"},
                "key_points": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["confidence", "clarity", "speech_rate", "eye_contact", "body_language", "voice_tone", "key_points"],
        }

        test_prompt = """You're a trailer critict, analyze the trailer clip and provide a rating for the trailer.
        You must be strict and justifiable with the ratings.
        Provide the response in the provided JSON format with numerical values from 1-10.
        Provide key points as a list of technical and non-technical strengths and weaknesses as strings to create a trailer identity profile."""

        test_schema = {
            "type": "object",
            "properties": {
                "keywords": {"type": "string"},
                "catchiness": {"type": "number"},
                "clarity": {"type": "number"},
                "speech_rate": {"type": "number"},
                "eye_contact": {"type": "number"},
                "body_language": {"type": "number"},
                "voice_tone": {"type": "number"},
                "key_points": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["keywords", "catchiness", "clarity", "speech_rate", "eye_contact", "body_language", "voice_tone", "key_points"],
        }

        active_schema = test_schema
        # active_schema = main_schema
        # 6. Perform open-ended analysis
        result = client.analyze(
            video_id=video_id,
            prompt=test_prompt,
            # temperature=0.2,
            # max_tokens=1024,
            response_format=ResponseFormat(
                json_schema= active_schema,
            ),
            # You can also use `response_format` to request structured JSON responses
        )
 
        print("Raw API Response:", result.data)
        
        processed_data = process_api_response(result.data, active_schema)
        return jsonify(processed_data), 200
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return jsonify({"error": f"Error processing video {video_id}: {str(e)}"}), 500
    

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True, port=6767)