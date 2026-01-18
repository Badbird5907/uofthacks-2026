"""
GitHub search and scraping using Firecrawl.
"""
import json
from firecrawl.v2.types import ScrapeOptions
from config import firecrawl, gemini_client, GEMINI_MODEL
from utils.url_utils import is_github_url, extract_result_field
from utils.redis_client import get_cached_search, set_cached_search


def search_github_for_person(name: str, usernames: list, occupation: str = "", custom_prompt: str = None, use_cache: bool = True) -> dict:
    """
    Search GitHub for a person using Firecrawl's search API with categories: ["github"].
    
    Args:
        name: Person's name
        usernames: List of known usernames/handles
        occupation: Person's occupation/title for context
        custom_prompt: Optional custom prompt for summarizing results
        use_cache: Whether to use Redis caching for search results
    
    Returns:
        dict with github_profiles, repositories, and summary
    """
    github_data = {
        "profiles": [],
        "repositories": [],
        "summary": "",
        "raw_results": []
    }
    
    # Build search queries for GitHub
    queries = []
    for username in usernames[:3]:  # Limit usernames
        queries.append(f"{username}")
    if name:
        queries.append(f"{name} {occupation}" if occupation else name)
    
    seen_urls = set()
    all_results = []
    github_search_limit = 5
    
    for query in queries:
        try:
            print(f"  GitHub search: {query}")
            
            # Check Redis cache first
            cached_results = None
            if use_cache:
                # Use "github:" prefix in query for distinct cache keys
                cache_query = f"github:{query}"
                cached_results = get_cached_search(cache_query, github_search_limit)
                if cached_results is not None:
                    print(f"    ✓ GitHub search cache hit: {query}")
                    results_data = cached_results
                else:
                    results_data = None
            else:
                results_data = None
            
            # If not cached, perform Firecrawl search
            if results_data is None:
                search_result = firecrawl.search(
                    query=query,
                    limit=github_search_limit,
                    scrape_options = ScrapeOptions(
                        formats=['markdown'],
                        only_main_content=True
                    )
                )
                
                # Handle different response formats (dict, list, or Pydantic model)
                results_data = []
                if hasattr(search_result, 'data'):
                    data = search_result.data
                    if isinstance(data, list):
                        results_data = data
                    elif isinstance(data, dict) and 'web' in data:
                        results_data = data.get('web', [])
                    elif data is not None:
                        results_data = [data]  # Single result
                elif isinstance(search_result, dict):
                    results_data = search_result.get('data', search_result.get('web', []))
                elif isinstance(search_result, list):
                    results_data = search_result
                
                # Convert Pydantic models to dicts for caching
                cacheable_results = []
                for result in results_data:
                    if hasattr(result, 'model_dump'):
                        cacheable_results.append(result.model_dump())
                    elif hasattr(result, 'dict'):
                        cacheable_results.append(result.dict())
                    elif isinstance(result, dict):
                        cacheable_results.append(result)
                    else:
                        cacheable_results.append({
                            'url': extract_result_field(result, 'url', ''),
                            'title': extract_result_field(result, 'title', ''),
                            'markdown': extract_result_field(result, 'markdown', ''),
                            'description': extract_result_field(result, 'description', ''),
                            'snippet': extract_result_field(result, 'snippet', '')
                        })
                
                # Cache the results (even if empty)
                if use_cache:
                    cache_query = f"github:{query}"
                    set_cached_search(cache_query, github_search_limit, cacheable_results)
                
                results_data = cacheable_results
            
            for result in results_data:
                # Extract URL handling both dict and Pydantic model
                url = extract_result_field(result, 'url', '')
                
                # Only include GitHub URLs
                if url and is_github_url(url) and url not in seen_urls:
                    seen_urls.add(url)
                    
                    # Extract content - try markdown, then description, then snippet
                    content = extract_result_field(result, 'markdown', '')
                    if not content:
                        content = extract_result_field(result, 'description', '')
                    if not content:
                        content = extract_result_field(result, 'snippet', '')
                    
                    result_item = {
                        'url': url,
                        'title': extract_result_field(result, 'title', ''),
                        'content': content
                    }
                    all_results.append(result_item)
                    
                    # Categorize as profile or repository
                    if 'github.com' in url.lower():
                        path_parts = url.split('github.com/')[-1].split('/')
                        # Filter out empty parts
                        path_parts = [p for p in path_parts if p]
                        if len(path_parts) <= 1:
                            github_data["profiles"].append(result_item)
                        else:
                            github_data["repositories"].append(result_item)
                    
        except Exception as e:
            print(f"  GitHub search error for '{query}': {e}")
            import traceback
            traceback.print_exc()
            continue
    
    github_data["raw_results"] = all_results
    
    # Generate summary using Gemini
    if all_results:
        summary_prompt = custom_prompt or f"""Summarize this person's GitHub presence based on the search results.
Focus on:
1. Their main projects and contributions
2. Technologies and languages they work with
3. Open source involvement
4. Any notable repositories or achievements
5. Their coding interests and focus areas

Person: {name}
Known usernames: {usernames}

GitHub search results:
{json.dumps(all_results[:10], indent=2)[:8000]}

Write a concise summary (2-3 paragraphs) of their GitHub presence and technical contributions."""
        
        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=summary_prompt
            )
            github_data["summary"] = response.text
        except Exception as e:
            print(f"  Error generating GitHub summary: {e}")
    
    print(f"  Found {len(github_data['profiles'])} GitHub profiles, {len(github_data['repositories'])} repositories")
    return github_data
