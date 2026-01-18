"""
Redis client for job queue and caching.
"""
import os
import json
import hashlib
from typing import Optional, Any
import redis
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

# Cache TTL in seconds (7 days default)
CACHE_TTL = int(os.getenv('CACHE_TTL', 604800))

# Job TTL in seconds (24 hours for job status)
JOB_TTL = int(os.getenv('JOB_TTL', 86400))

# Prefix for Redis keys
KEY_PREFIX_JOB = "job:"
KEY_PREFIX_CACHE = "cache:"
KEY_PREFIX_URL = "url:"
KEY_PREFIX_SEARCH = "search:"


def get_redis_client() -> redis.Redis:
    """Get Redis client connection."""
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True
    )


def generate_url_cache_key(url: str) -> str:
    """
    Generate a unique cache key for a URL.
    Normalizes the URL and creates a hash.
    """
    # Normalize URL
    normalized_url = url.lower().strip()
    
    # Generate hash
    hash_value = hashlib.sha256(normalized_url.encode()).hexdigest()[:16]
    
    return f"{KEY_PREFIX_URL}{hash_value}"


def get_cached_url(url: str) -> Optional[str]:
    """
    Retrieve cached URL content from Redis.
    Returns None if not found or expired.
    """
    try:
        client = get_redis_client()
        cache_key = generate_url_cache_key(url)
        result = client.get(cache_key)
        if result:
            return result  # Already decoded as string
        return None
    except Exception as e:
        print(f"Redis URL cache get error: {e}")
        return None


def set_cached_url(url: str, content: str) -> bool:
    """
    Store URL content in Redis cache with TTL.
    Returns True on success.
    """
    try:
        client = get_redis_client()
        cache_key = generate_url_cache_key(url)
        client.setex(cache_key, CACHE_TTL, content)
        return True
    except Exception as e:
        print(f"Redis URL cache set error: {e}")
        return False


def generate_search_cache_key(query: str, limit: int) -> str:
    """
    Generate a unique cache key for a search query.
    Includes the query and limit to ensure different searches are cached separately.
    """
    # Normalize query
    normalized_query = query.lower().strip()
    
    # Create key data including limit
    key_data = f"{normalized_query}:{limit}"
    
    # Generate hash
    hash_value = hashlib.sha256(key_data.encode()).hexdigest()[:16]
    
    return f"{KEY_PREFIX_SEARCH}{hash_value}"


def get_cached_search(query: str, limit: int) -> Optional[list]:
    """
    Retrieve cached search results from Redis.
    Returns None if not found or expired.
    """
    try:
        client = get_redis_client()
        cache_key = generate_search_cache_key(query, limit)
        result = client.get(cache_key)
        if result:
            return json.loads(result)
        return None
    except Exception as e:
        print(f"Redis search cache get error: {e}")
        return None


def set_cached_search(query: str, limit: int, results: list) -> bool:
    """
    Store search results in Redis cache with TTL.
    Returns True on success.
    """
    try:
        client = get_redis_client()
        cache_key = generate_search_cache_key(query, limit)
        client.setex(cache_key, CACHE_TTL, json.dumps(results))
        return True
    except Exception as e:
        print(f"Redis search cache set error: {e}")
        return False


def generate_cache_key(candidate_profile: dict) -> str:
    """
    Generate a unique cache key based on candidate identity.
    Uses a hash of identifying fields to create a consistent key.
    """
    # Use stable identifying fields for cache key
    identity_fields = {
        'firstName': candidate_profile.get('firstName', '').lower().strip(),
        'lastName': candidate_profile.get('lastName', '').lower().strip(),
        'linkedin': candidate_profile.get('linkedin', '').lower().strip(),
        'email': candidate_profile.get('email', '').lower().strip(),
    }
    
    # Create deterministic string representation
    identity_str = json.dumps(identity_fields, sort_keys=True)
    
    # Generate hash
    hash_value = hashlib.sha256(identity_str.encode()).hexdigest()[:16]
    
    return f"{KEY_PREFIX_CACHE}{hash_value}"


def get_cached_result(cache_key: str) -> Optional[dict]:
    """
    Retrieve cached result from Redis.
    Returns None if not found or expired.
    """
    try:
        client = get_redis_client()
        result = client.get(cache_key)
        if result:
            return json.loads(result)
        return None
    except Exception as e:
        print(f"Redis cache get error: {e}")
        return None


def set_cached_result(cache_key: str, result: dict) -> bool:
    """
    Store result in Redis cache with TTL.
    Returns True on success.
    """
    try:
        client = get_redis_client()
        client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return True
    except Exception as e:
        print(f"Redis cache set error: {e}")
        return False


def get_job_status(job_id: str) -> Optional[dict]:
    """
    Get job status and result from Redis.
    
    Returns dict with:
    - status: 'processing' | 'complete' | 'error'
    - result: The enriched schema (if complete)
    - error: Error message (if error)
    - cache_key: The cache key for this job
    """
    try:
        client = get_redis_client()
        job_key = f"{KEY_PREFIX_JOB}{job_id}"
        result = client.get(job_key)
        if result:
            return json.loads(result)
        return None
    except Exception as e:
        print(f"Redis job status get error: {e}")
        return None


def set_job_status(job_id: str, status: str, cache_key: str, 
                   result: Optional[dict] = None, error: Optional[str] = None) -> bool:
    """
    Set job status in Redis.
    
    Args:
        job_id: Unique job identifier
        status: 'processing' | 'complete' | 'error'
        cache_key: The cache key for this user's result
        result: The enriched schema (if complete)
        error: Error message (if error)
    """
    try:
        client = get_redis_client()
        job_key = f"{KEY_PREFIX_JOB}{job_id}"
        
        job_data = {
            'status': status,
            'cache_key': cache_key,
        }
        
        if result is not None:
            job_data['result'] = result
        if error is not None:
            job_data['error'] = error
            
        client.setex(job_key, JOB_TTL, json.dumps(job_data))
        return True
    except Exception as e:
        print(f"Redis job status set error: {e}")
        return False


def check_redis_connection() -> bool:
    """Check if Redis is available."""
    try:
        client = get_redis_client()
        client.ping()
        return True
    except Exception as e:
        print(f"Redis connection error: {e}")
        return False
