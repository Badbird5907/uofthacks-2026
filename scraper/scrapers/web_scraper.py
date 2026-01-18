"""
General web scraping and search utilities using Firecrawl and Exa.
"""
from firecrawl.v2.types import ScrapeOptions
from config import firecrawl, exa_client
from utils.url_utils import is_twitter_url, is_linkedin_url, is_github_url, extract_result_field
from utils.redis_client import get_cached_url, set_cached_url, get_cached_search, set_cached_search
from scrapers.twitter_scraper import scrape_twitter_profile


def crawl_url_with_fallback(url: str, use_cache: bool = True) -> str:
    """Crawl a URL using appropriate method based on URL type.
    
    - LinkedIn URLs: Skip (not supported by Firecrawl/Exa, use scrape_linkedin_profile instead)
    - Twitter/X URLs: Use Exa's twitter-wrapped endpoint
    - Other URLs: Try Firecrawl, fallback to Exa
    
    Results are cached in Redis to avoid redundant API calls.
    """
    # Ensure URL has protocol
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
    
    # Skip LinkedIn URLs
    if is_linkedin_url(url):
        return ""
    
    # Check Redis cache first
    if use_cache:
        cached_content = get_cached_url(url)
        if cached_content:
            print(f"  ✓ Cache hit: {url}")
            return cached_content
    
    content = ""
    
    # Check if this is a Twitter/X URL - use special Twitter scraper
    if is_twitter_url(url):
        try:
            twitter_data = scrape_twitter_profile(url)
            if twitter_data.get('full_text'):
                print(f"  ✓ Crawled Twitter profile: {url}")
                content = twitter_data['full_text']
        except Exception as e:
            print(f"  Twitter scraper failed for {url}: {e}")
    
    # Try Firecrawl first for non-Twitter URLs
    if not content:
        try:
            result = firecrawl.scrape(url, formats=['markdown'], only_main_content=True)
            if result and 'markdown' in result:
                print(f"  ✓ Crawled with Firecrawl: {url}")
                content = result['markdown']
        except Exception as e:
            print(f"  Firecrawl failed for {url}: {e}")
    
    # Fallback to Exa
    if not content:
        try:
            exa_url = url if url.startswith('http') else 'https://' + url
            result = exa_client.get_contents([exa_url], text=True)
            if result.results and len(result.results) > 0:
                text = result.results[0].text or ""
                print(f"  ✓ Crawled with Exa: {url}")
                content = text
        except Exception as e:
            print(f"  Exa failed for {url}: {e}")
    
    # Cache the result if we got content
    if content and use_cache:
        set_cached_url(url, content)
    
    if not content:
        print(f"  ✗ Failed to crawl: {url}")
    
    return content


def crawl_all_links(links: list) -> list:
    """Crawl all provided links and return their content."""
    crawled_content = []
    seen_urls = set()
    
    for link in links:
        if link and link not in seen_urls:
            seen_urls.add(link)
            content = crawl_url_with_fallback(link)
            if content:
                crawled_content.append({
                    'url': link,
                    'content': content
                })
    
    return crawled_content


def search_for_person_online(queries: list, reference_info: dict, max_results_per_query: int = 3, exclude_urls: list = None, use_cache: bool = True) -> list:
    """Search for person online using Firecrawl search and verify results.
    
    Excludes GitHub and LinkedIn URLs by default since they are handled separately.
    Results are cached in Redis to avoid redundant API calls.
    """
    all_results = []
    seen_urls = set()
    
    # Default exclusions: GitHub and LinkedIn are handled by dedicated scrapers
    if exclude_urls is None:
        exclude_urls = []
    
    for query in queries[:6]:  # Limit to 6 queries
        try:
            print(f"Searching: {query}")
            
            # Check Redis cache first
            cached_results = None
            if use_cache:
                cached_results = get_cached_search(query, max_results_per_query)
                if cached_results is not None:
                    print(f"  ✓ Search cache hit: {query}")
                    results_data = cached_results
                else:
                    results_data = None
            else:
                results_data = None
            
            # If not cached, perform Firecrawl search
            if results_data is None:
                # Firecrawl search with scrape options to get full markdown
                search_result = firecrawl.search(
                    query=query,
                    limit=max_results_per_query,
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
                
                # Cache the results (even if empty to avoid re-querying)
                if use_cache:
                    set_cached_search(query, max_results_per_query, cacheable_results)
                
                results_data = cacheable_results
            
            for result in results_data:
                # Extract URL handling both dict and Pydantic model
                url = extract_result_field(result, 'url', '')
                if not url or url in seen_urls:
                    continue
                
                # Skip GitHub or LinkedIn URLs (handled by search_github_for_person or scrape_linkedin_profile)
                if is_github_url(url) or is_linkedin_url(url):
                    continue
                
                # Skip any explicitly excluded URLs
                skip = False
                for exclude_url in exclude_urls:
                    if exclude_url in url:
                        print(f"  Skipping excluded URL: {url}")
                        skip = True
                        break
                if skip:
                    continue
                
                seen_urls.add(url)
                
                # Extract content - try markdown, then description, then snippet
                content = extract_result_field(result, 'markdown', '')
                if not content:
                    content = extract_result_field(result, 'description', '')
                if not content:
                    content = extract_result_field(result, 'snippet', '')
                
                all_results.append({
                    'url': url,
                    'title': extract_result_field(result, 'title', ''),
                    'content': content
                })
                        
        except Exception as e:
            print(f"Search error for query '{query}': {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return all_results
