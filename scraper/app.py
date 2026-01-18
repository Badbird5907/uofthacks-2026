"""
Flask API for processing identity profiles using Firecrawl, Gemini, and various scrapers.
Implements async job processing with Redis caching.
"""
import os
import uuid
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import utilities
from utils.pdf_utils import extract_text_from_pdf, fetch_pdf_from_cdn
from utils.url_utils import is_linkedin_url, is_github_url, extract_twitter_username
from utils.redis_client import (
    generate_cache_key,
    get_cached_result,
    set_cached_result,
    get_job_status,
    set_job_status,
    check_redis_connection
)

# Import scrapers
from scrapers.linkedin_scraper import scrape_linkedin_profile
from scrapers.github_scraper import search_github_for_person
from scrapers.web_scraper import crawl_all_links, search_for_person_online

# Import AI services
from ai.gemini_service import (
    extract_nicknames_and_links_from_resume,
    generate_search_queries,
    generate_extra_description
)

# Import schema builders
from schemas.schema_builder import (
    get_empty_schema,
    build_initial_schema_from_input,
    enrich_schema_with_crawled_content
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route('/')
def health_check():
    """Health check endpoint"""
    redis_ok = check_redis_connection()
    return jsonify({
        'status': 'ok',
        'message': 'Firecrawl API is running',
        'redis': 'connected' if redis_ok else 'disconnected'
    })


def process_profile_task(job_id: str, cache_key: str, data: dict):
    """
    Background task to process a profile.
    Runs in a separate thread.
    
    Data is expected in flat structure with candidate profile fields at root level.
    """
    try:
        print("\n" + "="*60)
        print(f"=== Processing Identity Profile (Job: {job_id}) ===")
        print("="*60)
        
        # Data is now flat - candidate profile fields are at root level
        job_history = data.get('jobHistory', [])
        education = data.get('education', [])
        
        # Extract URLs directly from data (flat structure)
        linkedin_url = data.get('linkedin', '')
        github_url = data.get('github', '')
        twitter_url = data.get('twitter', '')
        portfolio_url = data.get('portfolio', '')
        resume_cdn_url = data.get('resume', '')
        extra_links = data.get('extraLinks', [])
        
        print(f"Candidate: {data.get('firstName', '')} {data.get('lastName', '')}")
        print(f"LinkedIn URL: {linkedin_url}")
        print(f"GitHub URL: {github_url}")
        print(f"Resume CDN URL: {resume_cdn_url}")
        print(f"Extra links: {extra_links}")
        
        # Step 1: Build initial schema from pre-parsed data
        print("\n--- Step 1: Building schema from pre-parsed candidate data ---")
        # Pass the flat data structure directly (it contains the candidate profile fields)
        initial_schema = build_initial_schema_from_input(data, job_history, education)
        print(f"Initial schema built for: {initial_schema.get('basics', {}).get('name', 'Unknown')}")
        
        # Step 2: Fetch and extract text from PDF resume if CDN URL provided
        resume_text = ""
        if resume_cdn_url:
            print("\n--- Step 2: Fetching PDF from CDN ---")
            try:
                resume_bytes = fetch_pdf_from_cdn(resume_cdn_url)
                resume_text = extract_text_from_pdf(resume_bytes)
                print(f"Extracted {len(resume_text)} characters from resume PDF")
            except Exception as e:
                print(f"Warning: Could not fetch/extract resume PDF: {e}")
        else:
            print("\n--- Step 2: No resume CDN URL provided, skipping ---")
        
        # Step 3: Extract additional nicknames and links from resume text
        resume_info = {"nicknames": [], "links": [], "usernames": [], "legal_name": ""}
        if resume_text:
            print("\n--- Step 3: Extracting additional info from resume text ---")
            resume_info = extract_nicknames_and_links_from_resume(resume_text)
            print(f"Found nicknames: {resume_info.get('nicknames', [])}")
            print(f"Found links: {resume_info.get('links', [])}")
            print(f"Found usernames: {resume_info.get('usernames', [])}")
        
        # Step 4: Scrape LinkedIn profile
        linkedin_data = {
            "name": "",
            "headline": "",
            "location": "",
            "about": "",
            "experiences": [],
            "education": [],
            "interests": [],
            "full_text": ""
        }
        if linkedin_url:
            print("\n--- Step 4: Scraping LinkedIn profile ---")
            linkedin_data = scrape_linkedin_profile(linkedin_url)
        else:
            print("\n--- Step 4: No LinkedIn URL provided, skipping ---")
        
        # Step 5: Crawl ALL links
        print("\n--- Step 5: Crawling all profile links ---")
        all_links = list(set(
            extra_links + 
            resume_info.get('links', []) +
            ([portfolio_url] if portfolio_url else []) +
            ([twitter_url] if twitter_url else [])
        ))
        all_links = [l for l in all_links if l and not is_linkedin_url(l) and not is_github_url(l)]
        crawled_content = crawl_all_links(all_links)
        print(f"Successfully crawled {len(crawled_content)} links")
        
        # Step 6: Build reference info for person verification
        reference_info = {
            'name': initial_schema.get('basics', {}).get('name', '') or resume_info.get('legal_name', ''),
            'occupation': initial_schema.get('basics', {}).get('current_occupation', ''),
            'location': initial_schema.get('basics', {}).get('location', {}).get('city', ''),
            'usernames': resume_info.get('usernames', [])
        }
        
        if github_url:
            github_username = github_url.rstrip('/').split('/')[-1]
            if github_username and github_username not in reference_info['usernames']:
                reference_info['usernames'].append(github_username)
        
        if twitter_url:
            twitter_username = extract_twitter_username(twitter_url)
            if twitter_username and twitter_username not in reference_info['usernames']:
                reference_info['usernames'].append(twitter_username)
        
        # Step 7: Search for person online
        print("\n--- Step 6: Searching for person online (personal focus) ---")
        search_queries = generate_search_queries(
            reference_info['name'],
            reference_info['occupation'],
            reference_info['location'],
            reference_info['usernames']
        )
        print(f"Generated search queries: {search_queries}")
        
        search_results = search_for_person_online(search_queries, reference_info)
        print(f"Found {len(search_results)} verified online profiles (excluding GitHub/LinkedIn)")
        
        # Step 8: Search GitHub separately
        print("\n--- Step 7: Searching GitHub ---")
        github_data = search_github_for_person(
            name=reference_info['name'],
            usernames=reference_info['usernames'],
            occupation=reference_info['occupation']
        )
        print(f"GitHub search complete: {len(github_data.get('profiles', []))} profiles, {len(github_data.get('repositories', []))} repositories")
        
        # Step 9: Enrich schema
        print("\n--- Step 8: Enriching schema with all gathered content ---")
        enriched_schema = enrich_schema_with_crawled_content(
            initial_schema, 
            crawled_content, 
            search_results,
            github_data
        )
        
        # Step 10: Generate comprehensive extra description
        print("\n--- Step 9: Generating extra description ---")
        all_text_content = resume_text + "\n\n"
        all_text_content += linkedin_data.get('full_text', '') + "\n\n"
        all_text_content += "\n\n".join([c['content'] for c in crawled_content])
        all_text_content += "\n\n".join([r['content'] for r in search_results])
        if github_data.get('summary'):
            all_text_content += "\n\nGitHub Summary:\n" + github_data['summary']
        
        extra_description = generate_extra_description(enriched_schema, all_text_content)
        enriched_schema['extra'] = extra_description
        
        # Add GitHub data to schema
        if github_data.get('summary') or github_data.get('profiles'):
            if 'github' not in enriched_schema:
                enriched_schema['github'] = {
                    'summary': github_data.get('summary', ''),
                    'profiles': github_data.get('profiles', []),
                    'repositories': github_data.get('repositories', [])
                }
        
        # Ensure all required fields exist
        if 'basics' not in enriched_schema:
            enriched_schema['basics'] = get_empty_schema()['basics']
        if 'professional_dna' not in enriched_schema:
            enriched_schema['professional_dna'] = get_empty_schema()['professional_dna']
        if 'personal_dna' not in enriched_schema:
            enriched_schema['personal_dna'] = get_empty_schema()['personal_dna']
        if 'identity_mapping_vitals' not in enriched_schema:
            enriched_schema['identity_mapping_vitals'] = get_empty_schema()['identity_mapping_vitals']
        
        print("\n" + "="*60)
        print(f"=== Profile Processing Complete (Job: {job_id}) ===")
        print("="*60)
        
        # Cache the result
        set_cached_result(cache_key, enriched_schema)
        
        # Update job status to complete
        set_job_status(job_id, 'complete', cache_key, result=enriched_schema)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Job {job_id} failed: {str(e)}")
        set_job_status(job_id, 'error', cache_key, error=str(e))


@app.route('/api/process-profile', methods=['POST'])
def process_profile():
    """
    Submit a profile for processing.
    
    Returns immediately with a job ID. The processing happens asynchronously.
    If the same user has been processed before, returns the cached result immediately.
    
    Expected JSON body (flat structure):
    {
        "id": "string (candidate profile ID)",
        "userId": "string",
        "firstName": "string",
        "lastName": "string",
        "phone": "string",
        "linkedin": "string",
        "github": "string",
        "twitter": "string",
        "portfolio": "string",
        "resume": "string (CDN URL)",
        "extraLinks": ["string"],
        "skills": "string",
        "experience": "string",
        "createdAt": "string (ISO date)",
        "updatedAt": "string (ISO date)",
        "user": { ... },
        "jobHistory": [...],
        "education": [...]
    }
    
    Returns:
    - If cached: { "job_id": "...", "status": "complete", "result": {...} }
    - If new: { "job_id": "...", "status": "processing" }
    """
    try:
        # Check Redis connection
        if not check_redis_connection():
            return jsonify({
                'error': 'Redis is not available. Please ensure Redis is running.',
                'success': False
            }), 503
        
        # Parse JSON body (silent=True returns None instead of raising on invalid JSON)
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'JSON body is required'}), 400
        
        # Validate required fields (flat structure - candidate profile fields at root)
        if not data.get('firstName') and not data.get('lastName'):
            return jsonify({'error': 'firstName or lastName is required'}), 400
        
        # Generate cache key based on user identity (using flat structure)
        cache_key = generate_cache_key(data)
        
        # Check if we have a cached result
        cached_result = get_cached_result(cache_key)
        if cached_result:
            print(f"Cache hit for {data.get('firstName', '')} {data.get('lastName', '')}")
            # Generate a job ID for consistency
            job_id = str(uuid.uuid4())
            return jsonify({
                'job_id': job_id,
                'status': 'complete',
                'cached': True,
                'result': cached_result
            }), 200
        
        # Generate new job ID
        job_id = str(uuid.uuid4())
        
        # Set initial job status
        set_job_status(job_id, 'processing', cache_key)
        
        # Start background processing
        thread = threading.Thread(
            target=process_profile_task,
            args=(job_id, cache_key, data)
        )
        thread.daemon = True
        thread.start()
        
        print(f"Started job {job_id} for {data.get('firstName', '')} {data.get('lastName', '')}")
        
        return jsonify({
            'job_id': job_id,
            'status': 'processing',
            'cached': False
        }), 202
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@app.route('/api/profile-status/<job_id>', methods=['GET'])
def get_profile_status(job_id: str):
    """
    Get the status of a profile processing job.
    
    Returns:
    - Processing: { "job_id": "...", "status": "processing" }
    - Complete: { "job_id": "...", "status": "complete", "result": {...} }
    - Error: { "job_id": "...", "status": "error", "error": "..." }
    - Not found: 404
    """
    try:
        # Check Redis connection
        if not check_redis_connection():
            return jsonify({
                'error': 'Redis is not available. Please ensure Redis is running.',
                'success': False
            }), 503
        
        job_data = get_job_status(job_id)
        
        if not job_data:
            return jsonify({
                'error': 'Job not found',
                'job_id': job_id
            }), 404
        
        status = job_data.get('status', 'unknown')
        
        response = {
            'job_id': job_id,
            'status': status
        }
        
        if status == 'complete':
            response['result'] = job_data.get('result')
        elif status == 'error':
            response['error'] = job_data.get('error')
        
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """
    Clear cached result for a specific user.
    Useful for forcing a re-process.
    
    Expected JSON body (flat structure):
    {
        "firstName": "string",
        "lastName": "string",
        "linkedin": "string",
        ...
    }
    """
    try:
        if not check_redis_connection():
            return jsonify({
                'error': 'Redis is not available.',
                'success': False
            }), 503
        
        data = request.get_json()
        if not data or (not data.get('firstName') and not data.get('lastName')):
            return jsonify({'error': 'firstName or lastName is required'}), 400
        
        # Use flat structure directly for cache key
        cache_key = generate_cache_key(data)
        
        from utils.redis_client import get_redis_client
        client = get_redis_client()
        deleted = client.delete(cache_key)
        
        return jsonify({
            'success': True,
            'deleted': deleted > 0
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
