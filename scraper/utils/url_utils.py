"""
URL utility functions for validating and extracting information from URLs.
"""
import re


def is_twitter_url(url: str) -> bool:
    """Check if a URL is a Twitter/X profile URL."""
    twitter_patterns = [
        r'(?:https?://)?(?:www\.)?twitter\.com/([a-zA-Z0-9_]+)/?$',
        r'(?:https?://)?(?:www\.)?x\.com/([a-zA-Z0-9_]+)/?$',
    ]
    for pattern in twitter_patterns:
        if re.match(pattern, url):
            return True
    return False


def is_linkedin_url(url: str) -> bool:
    """Check if a URL is a LinkedIn URL (not supported by Firecrawl/Exa)."""
    linkedin_patterns = [
        r'(?:https?://)?(?:www\.)?linkedin\.com/',
    ]
    for pattern in linkedin_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


def is_github_url(url: str) -> bool:
    """Check if a URL is a GitHub URL."""
    github_patterns = [
        r'(?:https?://)?(?:www\.)?github\.com/',
    ]
    for pattern in github_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


def extract_twitter_username(url: str) -> str | None:
    """Extract Twitter username from a Twitter/X URL."""
    twitter_patterns = [
        r'(?:https?://)?(?:www\.)?twitter\.com/([a-zA-Z0-9_]+)/?$',
        r'(?:https?://)?(?:www\.)?x\.com/([a-zA-Z0-9_]+)/?$',
    ]
    for pattern in twitter_patterns:
        match = re.match(pattern, url)
        if match:
            return match.group(1)
    return None


def extract_result_field(result, field: str, default: str = "") -> str:
    """Extract a field from a search result, handling both dicts and Pydantic models."""
    if isinstance(result, dict):
        return result.get(field, default)
    elif hasattr(result, field):
        value = getattr(result, field, default)
        # Handle Pydantic Url type or other objects
        return str(value) if value is not None else default
    return default
