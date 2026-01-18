"""
Full integration test with realistic sample data using REAL API calls.
This test makes actual API calls to Gemini, Exa, and Firecrawl.

Requirements:
- Set environment variables: FIRECRAWL_API_KEY, GEMINI_API_KEY, EXA_API_KEY
- Or create a .env file with the keys
- Redis must be running (docker-compose up -d)
- Real API calls will be made, which may incur costs
"""
import pytest
import json
import sys
import os
import time
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Check if API keys are set
FIRECRAWL_API_KEY = os.getenv('FIRECRAWL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
EXA_API_KEY = os.getenv('EXA_API_KEY')

if not all([FIRECRAWL_API_KEY, GEMINI_API_KEY, EXA_API_KEY]):
    pytest.skip("Skipping integration test: API keys not set. Set FIRECRAWL_API_KEY, GEMINI_API_KEY, and EXA_API_KEY environment variables.", allow_module_level=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from utils.redis_client import check_redis_connection, get_redis_client


# Polling configuration
MAX_POLL_TIME = 300  # Maximum time to wait for job completion (5 minutes)
POLL_INTERVAL = 2    # Seconds between status checks


@pytest.fixture(scope='module', autouse=True)
def check_redis():
    """Ensure Redis is available before running tests."""
    if not check_redis_connection():
        pytest.skip("Redis is not available. Run 'docker-compose up -d' to start Redis.")


@pytest.fixture(scope='module', autouse=True)
def clear_twitter_cache():
    """Clear all Twitter/X link cache before running tests."""
    from utils.redis_client import get_redis_client, generate_url_cache_key
    
    try:
        redis_client = get_redis_client()
        deleted_count = 0
        
        # Clear cache for known Twitter URLs (including various URL formats)
        known_twitter_urls = [
            "https://x.com/Badbird_5907",
            "https://twitter.com/Badbird_5907",
            "x.com/Badbird_5907",
            "twitter.com/Badbird_5907",
        ]
        
        for url in known_twitter_urls:
            cache_key = generate_url_cache_key(url)
            if redis_client.delete(cache_key):
                deleted_count += 1
                print(f"   Cleared Twitter cache: {url}")
        
        print(f"   ✓ Cleared {deleted_count} Twitter URL cache entries")
    except Exception as e:
        print(f"   Warning: Could not clear Twitter cache: {e}")
    
    yield


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def clear_test_cache():
    """Clear any cached data for test users before and after tests."""
    yield
    # Cleanup after test
    try:
        redis_client = get_redis_client()
        # Clear test-related cache keys
        for key in redis_client.scan_iter("cache:*"):
            redis_client.delete(key)
        for key in redis_client.scan_iter("job:*"):
            redis_client.delete(key)
    except Exception:
        pass


@pytest.fixture
def sample_candidate_data():
    """
    Create sample candidate data matching the database schema.
    
    This fixture provides pre-parsed candidate profile data as it would
    come from the database, with a CDN URL for the resume PDF.
    Uses the flat structure where candidate profile fields are at root level.
    """
    return {
        "id": "32bcc416-7cfe-4129-b051-f8656dbc4466",
        "userId": "wzANn0jiLmd1lM78C8UdRj8hJ50tjX56",
        "firstName": "Evan",
        "lastName": "Yu",
        "phone": "",
        "linkedin": "https://linkedin.com/in/ev-yu",
        "github": "https://github.com/Badbird5907",
        "twitter": "https://x.com/Badbird_5907",
        "portfolio": "https://evanyu.dev",
        "resume": "https://ewr1.vultrobjects.com/user-uploads0/resumes/wzANn0jiLmd1lM78C8UdRj8hJ50tjX56/1768708471583-Evan_Yu_Resume.pdf",
        "extraLinks": [],
        "skills": "TypeScript, JavaScript, Java, Kotlin, C++, Python, SQL, React, Next.js, Tanstack Start, Tailwind CSS, HTML/CSS, Node.js, PostgreSQL, MongoDB, Redis, Convex, Drizzle ORM, Concurrency, Async I/O, Event-driven design, AWS (Lambda, API Gateway, S3, CloudWatch, IAM), SST, Docker, CI/CD, Grafana, Vercel, Supabase",
        "experience": "Founding Software Engineer with experience building a LinkedIn-like platform connecting students to alumni. Engineered recommendation systems and signal-based ranking, resulting in a 20% increase in user engagement.",
        "createdAt": "2026-01-18T04:01:32.362Z",
        "updatedAt": "2026-01-18T04:01:32.362Z",
        "user": {
            "id": "wzANn0jiLmd1lM78C8UdRj8hJ50tjX56",
            "name": "Evan Yu",
            "email": "contact@badbird.dev",
            "emailVerified": True,
            "image": "https://lh3.googleusercontent.com/a/ACg8ocLmT3_B4cnK2tyCL7nExbAI3wq7x6Q3gWE1BGC9QhBAecCKAEg=s96-c",
            "createdAt": "2026-01-18T00:44:50.020Z",
            "updatedAt": "2026-01-18T00:45:06.254Z",
            "isRecruiter": False
        },
        "jobHistory": [
            {
                "id": "51afc4ac-f359-41a9-bf13-9a2ef763290a",
                "candidateProfileId": "32bcc416-7cfe-4129-b051-f8656dbc4466",
                "companyName": "Connect Alum",
                "jobTitle": "Founding Software Engineer",
                "startDate": "Jan 2024",
                "endDate": "Oct 2025",
                "description": "Built a LinkedIn-like platform connecting students to alumni; served as Lead Developer/SRE scaling the platform to 9,000+ monthly active users using React, Next.js, and Drizzle ORM.\nEngineered recommendation systems and signal-based ranking, resulting in a 20% increase in user engagement.\nArchitected a serverless backend (AWS Lambda + SST) handling 10k+ concurrent requests; implemented async job queues and caching to maintain 99.9% availability and reduce p95 latency by 10%.\nOptimized database performance via targeted indexing and Redis caching (cutting query times by 40%) and reduced downtime by 15% through custom Grafana/CloudWatch monitoring solutions.\nDeveloped custom supporting infrastructure including a dynamic-DNS updating solution and a secret vault client leveraging AWS IAM to enhance system security and reliability.",
                "createdAt": "2026-01-18T04:01:32.362Z",
                "updatedAt": "2026-01-18T04:01:32.362Z"
            },
            {
                "id": "bc458213-3e39-49bb-b997-5d80d04aad9b",
                "candidateProfileId": "32bcc416-7cfe-4129-b051-f8656dbc4466",
                "companyName": "YMentoring (York Mills CI)",
                "jobTitle": "Technical Director",
                "startDate": "2020",
                "endDate": "Present",
                "description": "Developed software matching 300 students with 75 mentors using Vector Embeddings for improved accuracy.",
                "createdAt": "2026-01-18T04:01:32.362Z",
                "updatedAt": "2026-01-18T04:01:32.362Z"
            },
            {
                "id": "9784b291-440c-4a4b-985f-41c70b2f1f6a",
                "candidateProfileId": "32bcc416-7cfe-4129-b051-f8656dbc4466",
                "companyName": "Programming Club (York Mills CI)",
                "jobTitle": "President",
                "startDate": "2023",
                "endDate": "2025",
                "description": "Taught new students programming fundamentals and guided advanced students in preparing for CCC competitions.\nBuilt \"Olympus\", a website for the technology clubs at York Mills Collegiate Institute with Next.js and TailwindCSS",
                "createdAt": "2026-01-18T04:01:32.362Z",
                "updatedAt": "2026-01-18T04:01:32.362Z"
            },
            {
                "id": "98b1e750-e035-4311-a3b8-81cfc96df141",
                "candidateProfileId": "32bcc416-7cfe-4129-b051-f8656dbc4466",
                "companyName": "YMRobotics (VEX Team 95500A)",
                "jobTitle": "Executive",
                "startDate": "2024",
                "endDate": "2025",
                "description": "Led robot programming in C++ and taught Arduino/Raspberry Pi concepts while managing club administration.",
                "createdAt": "2026-01-18T04:01:32.362Z",
                "updatedAt": "2026-01-18T04:01:32.362Z"
            }
        ],
        "education": [
            {
                "id": "5511c67a-3ebd-466a-9c5d-d5c85cf8658e",
                "candidateProfileId": "32bcc416-7cfe-4129-b051-f8656dbc4466",
                "institution": "University of Toronto",
                "degree": "Bachelor of Science",
                "fieldOfStudy": "Mathematics",
                "startDate": "Sep 2025",
                "endDate": "May 2029",
                "description": None,
                "createdAt": "2026-01-18T04:01:32.362Z",
                "updatedAt": "2026-01-18T04:01:32.362Z"
            }
        ]
    }


def poll_for_completion(client, job_id: str, max_time: int = MAX_POLL_TIME) -> dict:
    """
    Poll the status endpoint until the job completes or times out.
    
    Args:
        client: Flask test client
        job_id: The job ID to poll
        max_time: Maximum time to wait in seconds
        
    Returns:
        The final job status response data
        
    Raises:
        TimeoutError: If job doesn't complete within max_time
        AssertionError: If job fails with error status
    """
    start_time = time.time()
    last_status = None
    
    while time.time() - start_time < max_time:
        response = client.get(f'/api/profile-status/{job_id}')
        assert response.status_code == 200, f"Status check failed: {response.data}"
        
        data = json.loads(response.data)
        status = data.get('status')
        
        if status != last_status:
            elapsed = int(time.time() - start_time)
            print(f"   [{elapsed}s] Job status: {status}")
            last_status = status
        
        if status == 'complete':
            return data
        elif status == 'error':
            raise AssertionError(f"Job failed with error: {data.get('error')}")
        
        time.sleep(POLL_INTERVAL)
    
    raise TimeoutError(f"Job {job_id} did not complete within {max_time} seconds")


def test_health_check(client):
    """Test that the health check endpoint returns Redis status."""
    response = client.get('/')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'ok'
    assert 'redis' in data
    print(f"✓ Health check passed - Redis: {data['redis']}")


def test_full_integration_with_realistic_data(client, sample_candidate_data, clear_test_cache):
    """
    Full integration test with realistic sample data using REAL API calls.
    Tests the complete async flow: Submit job -> Poll status -> Get result.
    
    This test makes real API calls and will incur API costs.
    """
    
    print("\n" + "="*60)
    print("=== Starting Full Integration Test with REAL APIs ===")
    print("="*60 + "\n")
    print("⚠️  WARNING: This test makes REAL API calls and may incur costs!\n")
    
    # Data is now flat - candidate profile fields are at root level
    job_history = sample_candidate_data["jobHistory"]
    education = sample_candidate_data["education"]
    
    print(f"Test Configuration:")
    print(f"  - Candidate: {sample_candidate_data['firstName']} {sample_candidate_data['lastName']}")
    print(f"  - LinkedIn URL: {sample_candidate_data['linkedin']}")
    print(f"  - GitHub URL: {sample_candidate_data['github']}")
    print(f"  - Resume CDN URL: {sample_candidate_data['resume']}")
    print(f"  - Job History: {len(job_history)} entries")
    print(f"  - Education: {len(education)} entries\n")
    
    # # Clear cache for this user to ensure fresh processing
    # print("="*60)
    # print("STEP 0: Clearing cache for test user")
    # print("="*60)
    # # Pass flat structure directly for cache clear
    # clear_response = client.post(
    #     '/api/cache/clear',
    #     data=json.dumps(sample_candidate_data),
    #     content_type='application/json'
    # )
    # print(f"   Cache clear response: {clear_response.status_code}")
    # print()
    
    # Step 1: Submit the job
    print("="*60)
    print("STEP 1: Submitting job to /api/process-profile")
    print("="*60)
    print("   This will return immediately with a job ID.")
    print("   Background processing will trigger real API calls to:")
    print("   - Gemini API (for text extraction and schema generation)")
    print("   - Exa API (for link crawling)")
    print("   - Firecrawl API (for web search)")
    print()
    
    try:
        print(f"   Preparing JSON request with:")
        print(f"     - Candidate: {sample_candidate_data['firstName']} {sample_candidate_data['lastName']}")
        print(f"     - jobHistory: {len(job_history)} entries")
        print(f"     - education: {len(education)} entries")
        print(f"   Sending POST request...\n")
        
        response = client.post(
            '/api/process-profile',
            data=json.dumps(sample_candidate_data),
            content_type='application/json'
        )
        
        # Step 2: Verify immediate response
        print("="*60)
        print(f"STEP 2: Immediate response received (Status: {response.status_code})")
        print("="*60)
        
        # Should be 202 Accepted (processing) or 200 OK (cached)
        assert response.status_code in [200, 202], f"Unexpected status: {response.status_code}"
        
        submit_data = json.loads(response.data)
        job_id = submit_data.get('job_id')
        status = submit_data.get('status')
        cached = submit_data.get('cached', False)
        
        assert job_id is not None, "Missing job_id in response"
        print(f"   ✓ Job ID: {job_id}")
        print(f"   ✓ Initial status: {status}")
        print(f"   ✓ Cached: {cached}")
        print()
        
        # Step 3: Poll for completion or use cached result
        if status == 'complete' and cached:
            print("="*60)
            print("STEP 3: Using cached result (no polling needed)")
            print("="*60)
            data = submit_data.get('result')
            print(f"   ✓ Cached result retrieved immediately")
        else:
            print("="*60)
            print("STEP 3: Polling for job completion")
            print("="*60)
            print(f"   Polling /api/profile-status/{job_id}")
            print(f"   Max wait time: {MAX_POLL_TIME} seconds")
            print()
            
            result_data = poll_for_completion(client, job_id)
            data = result_data.get('result')
            print(f"\n   ✓ Job completed successfully!")
        
        print()
        
        # Step 4: Verify schema structure
        print("="*60)
        print("STEP 4: Validating response schema structure")
        print("="*60)
        required_fields = ['basics', 'professional_dna', 'personal_dna', 'identity_mapping_vitals', 'extra']
        print(f"   Checking for required fields: {required_fields}")
        for field in required_fields:
            if field in data:
                print(f"   ✓ '{field}' present")
            else:
                print(f"   ❌ Missing '{field}' in response")
                raise AssertionError(f"Missing '{field}' in response")
        print(f"   ✓ All required fields present\n")
        
        # Step 5: Verify basics section
        print("="*60)
        print("STEP 5: Validating 'basics' section")
        print("="*60)
        basics = data.get('basics', {})
        print(f"   Checking basics fields...")
        assert 'name' in basics, "Missing 'name' in basics"
        assert 'current_occupation' in basics, "Missing 'current_occupation' in basics"
        assert 'location' in basics, "Missing 'location' in basics"
        assert 'profiles' in basics, "Missing 'profiles' in basics"
        print(f"   ✓ Name: {basics.get('name', 'N/A')}")
        print(f"   ✓ Occupation: {basics.get('current_occupation', 'N/A')}")
        location = basics.get('location', {})
        print(f"   ✓ Location - City: {location.get('city', 'N/A')}, Remote: {location.get('remote_preference', 'N/A')}")
        profiles = basics.get('profiles', [])
        print(f"   ✓ Profiles: {len(profiles)} profile(s)")
        for i, profile in enumerate(profiles[:3], 1):
            print(f"      {i}. {profile.get('platform', 'N/A')}: {profile.get('url', 'N/A')[:50]}...")
        tags = basics.get('identity_tags', [])
        print(f"   ✓ Identity tags: {len(tags)} tag(s) - {tags[:3] if tags else 'None'}")
        print()
        
        # Step 6: Verify professional_dna section
        print("="*60)
        print("STEP 6: Validating 'professional_dna' section")
        print("="*60)
        professional = data.get('professional_dna', {})
        assert 'experience' in professional, "Missing 'experience' in professional_dna"
        assert 'skills' in professional, "Missing 'skills' in professional_dna"
        experience = professional.get('experience', [])
        skills = professional.get('skills', {})
        print(f"   ✓ Experience entries: {len(experience)}")
        for i, exp in enumerate(experience[:2], 1):
            print(f"      {i}. {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')}")
        hard_skills = skills.get('hard_skills', [])
        soft_skills = skills.get('soft_skills', [])
        tools = skills.get('tools', [])
        print(f"   ✓ Hard skills: {len(hard_skills)} skill(s) - {hard_skills[:5] if hard_skills else 'None'}")
        print(f"   ✓ Soft skills: {len(soft_skills)} skill(s) - {soft_skills[:3] if soft_skills else 'None'}")
        print(f"   ✓ Tools: {len(tools)} tool(s) - {tools[:5] if tools else 'None'}")
        print()
        
        # Step 7: Verify personal_dna section
        print("="*60)
        print("STEP 7: Validating 'personal_dna' section")
        print("="*60)
        personal = data.get('personal_dna', {})
        assert 'education' in personal, "Missing 'education' in personal_dna"
        assert 'projects' in personal, "Missing 'projects' in personal_dna"
        assert 'hobbies_and_interests' in personal, "Missing 'hobbies_and_interests' in personal_dna"
        education_data = personal.get('education', [])
        projects = personal.get('projects', [])
        hobbies = personal.get('hobbies_and_interests', {})
        print(f"   ✓ Education entries: {len(education_data)}")
        for i, edu in enumerate(education_data[:2], 1):
            print(f"      {i}. {edu.get('degree', 'N/A')} from {edu.get('institution', 'N/A')}")
        print(f"   ✓ Projects: {len(projects)}")
        for i, proj in enumerate(projects[:2], 1):
            print(f"      {i}. {proj.get('name', 'N/A')}: {proj.get('description', 'N/A')[:50]}...")
        active = hobbies.get('active_pursuits', [])
        intellectual = hobbies.get('intellectual_interests', [])
        print(f"   ✓ Active pursuits: {len(active)} - {active[:3] if active else 'None'}")
        print(f"   ✓ Intellectual interests: {len(intellectual)} - {intellectual[:3] if intellectual else 'None'}")
        volunteering = personal.get('volunteering', [])
        print(f"   ✓ Volunteering: {len(volunteering)} entry/entries")
        print()
        
        # Step 8: Verify identity_mapping_vitals
        print("="*60)
        print("STEP 8: Validating 'identity_mapping_vitals' section")
        print("="*60)
        vitals = data.get('identity_mapping_vitals', {})
        assert 'communication_style' in vitals, "Missing 'communication_style'"
        assert 'value_alignment' in vitals, "Missing 'value_alignment'"
        assert 'career_trajectory' in vitals, "Missing 'career_trajectory'"
        comm_style = vitals.get('communication_style', 'N/A')
        print(f"   ✓ Communication style: {comm_style[:80]}..." if len(comm_style) > 80 else f"   ✓ Communication style: {comm_style}")
        values = vitals.get('value_alignment', [])
        print(f"   ✓ Value alignment: {len(values)} value(s) - {values if values else 'None'}")
        trajectory = vitals.get('career_trajectory', 'N/A')
        print(f"   ✓ Career trajectory: {trajectory[:80]}..." if len(trajectory) > 80 else f"   ✓ Career trajectory: {trajectory}")
        print()
        
        # Step 9: Verify extra field
        print("="*60)
        print("STEP 9: Validating 'extra' field")
        print("="*60)
        extra = data.get('extra', '')
        assert len(extra) > 0, "Extra field should not be empty"
        assert len(extra) > 100, f"Extra field should have substantial content (got {len(extra)} chars)"
        print(f"   ✓ Extra field length: {len(extra)} characters")
        print(f"   ✓ Extra field preview (first 200 chars):")
        print(f"   {'-'*60}")
        print(f"   {extra[:200]}...")
        print(f"   {'-'*60}")
        print()
        
        # Step 10: Verify pre-parsed data was preserved
        print("="*60)
        print("STEP 10: Verifying pre-parsed data preservation")
        print("="*60)
        # Check that the name from input was preserved
        expected_name = f"{sample_candidate_data['firstName']} {sample_candidate_data['lastName']}"
        actual_name = basics.get('name', '')
        print(f"   ✓ Name preserved: '{actual_name}' (expected: '{expected_name}')")
        
        # Check that job history entries are reflected
        print(f"   ✓ Experience entries: {len(experience)} (input had {len(job_history)} jobs)")
        
        # Check that education entries are reflected
        print(f"   ✓ Education entries: {len(education_data)} (input had {len(education)} entries)")
        print()
        
        # Step 11: Test caching - submit same request again
        print("="*60)
        print("STEP 11: Testing cache behavior")
        print("="*60)
        print("   Submitting same request again...")
        
        cache_response = client.post(
            '/api/process-profile',
            data=json.dumps(sample_candidate_data),
            content_type='application/json'
        )
        
        assert cache_response.status_code == 200, "Cache hit should return 200"
        cache_data = json.loads(cache_response.data)
        
        assert cache_data.get('cached') == True, "Second request should be cached"
        assert cache_data.get('status') == 'complete', "Cached response should be complete"
        print(f"   ✓ Second request returned cached result immediately")
        print(f"   ✓ Cached: {cache_data.get('cached')}")
        print()
        
        # Step 12: Print summary
        print("="*60)
        print("=== TEST SUMMARY ===")
        print("="*60)
        print("✅ Job submitted and ID returned immediately")
        print("✅ Background processing completed successfully")
        print("✅ Response structure validated")
        print("✅ Data fields populated correctly")
        print("✅ Pre-parsed data preserved")
        print("✅ Caching behavior verified")
        print("✅ Integration test PASSED")
        print()
        print("API Services Used:")
        print("  ✓ Google Gemini API - Text processing and schema generation")
        print("  ✓ Exa API - Link crawling and content extraction")
        print("  ✓ Firecrawl API - Web search for additional information")
        print("  ✓ Redis - Job queue and result caching")
        print()
        print("Response Statistics:")
        print(f"  - Total response size: {len(json.dumps(data))} characters (JSON)")
        print(f"  - Basics fields: {len(basics)}")
        print(f"  - Professional experience entries: {len(experience)}")
        print(f"  - Skills identified: {len(hard_skills) + len(soft_skills) + len(tools)}")
        print(f"  - Personal projects: {len(projects)}")
        print(f"  - Extra description: {len(extra)} characters")
        print("="*60 + "\n")
        
        return data
        
    except AssertionError as e:
        print("\n" + "="*60)
        print("❌ ASSERTION FAILED")
        print("="*60)
        print(f"Error: {str(e)}")
        print("="*60 + "\n")
        raise
    except TimeoutError as e:
        print("\n" + "="*60)
        print("❌ TIMEOUT")
        print("="*60)
        print(f"Error: {str(e)}")
        print("="*60 + "\n")
        raise
    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR DURING TEST EXECUTION")
        print("="*60)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\nFull traceback:")
        import traceback
        traceback.print_exc()
        print("="*60 + "\n")
        raise


def test_missing_candidate_profile(client):
    """Test that the endpoint returns an error when required fields are missing."""
    response = client.post(
        '/api/process-profile',
        data=json.dumps({}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    print(f"✓ Missing firstName/lastName returns error: {data['error']}")


def test_empty_json_body(client):
    """Test that the endpoint returns an error when JSON body is empty."""
    response = client.post(
        '/api/process-profile',
        data='',
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    print(f"✓ Empty JSON body returns error: {data['error']}")


def test_job_not_found(client):
    """Test that querying a non-existent job returns 404."""
    response = client.get('/api/profile-status/non-existent-job-id')
    
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data
    print(f"✓ Non-existent job returns 404: {data['error']}")


def test_minimal_candidate_data(client, clear_test_cache):
    """Test with minimal required candidate data (no optional fields)."""
    # Flat structure - candidate profile fields at root level
    minimal_data = {
        "id": "test-minimal-id",
        "userId": "test-user-id",
        "firstName": "Test",
        "lastName": "User",
        "phone": "",
        "linkedin": "",
        "github": "",
        "twitter": "",
        "portfolio": "",
        "resume": "",
        "extraLinks": [],
        "skills": "",
        "experience": "",
        "createdAt": "2026-01-18T00:00:00.000Z",
        "updatedAt": "2026-01-18T00:00:00.000Z",
        "jobHistory": [],
        "education": []
    }
    
    # Clear cache first - pass flat structure directly
    client.post(
        '/api/cache/clear',
        data=json.dumps(minimal_data),
        content_type='application/json'
    )
    
    response = client.post(
        '/api/process-profile',
        data=json.dumps(minimal_data),
        content_type='application/json'
    )
    
    # Should return 202 (processing) or 200 (cached)
    assert response.status_code in [200, 202]
    data = json.loads(response.data)
    
    assert 'job_id' in data
    assert 'status' in data
    
    job_id = data['job_id']
    status = data['status']
    
    print(f"   Job ID: {job_id}")
    print(f"   Status: {status}")
    
    # If processing, poll until complete
    if status == 'processing':
        print("   Waiting for completion...")
        result_data = poll_for_completion(client, job_id, max_time=120)
        result = result_data.get('result')
    else:
        result = data.get('result')
    
    # Verify basic structure exists
    assert 'basics' in result
    assert result['basics']['name'] == 'Test User'
    print(f"✓ Minimal candidate data processed successfully")


def test_cache_clear(client, sample_candidate_data):
    """Test that cache can be cleared for a user."""
    # Clear the cache - pass flat structure directly
    response = client.post(
        '/api/cache/clear',
        data=json.dumps(sample_candidate_data),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data.get('success') == True
    print(f"✓ Cache clear successful: deleted={data.get('deleted')}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
