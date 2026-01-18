"""
Twitter/X profile scraping using Exa's Twitter Wrapped API endpoints.
"""
import requests
from typing import Optional
from utils.url_utils import extract_twitter_username

# Exa Twitter Wrapped API endpoints
TWITTER_FETCH_URL = "https://twitterwrapped.exa.ai/api/twitter-fetch"
DYNAMODB_TWEETS_URL = "https://twitterwrapped.exa.ai/api/dynamodb-tweets"

# Common headers for API requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://twitterwrapped.exa.ai",
    "Referer": "https://twitterwrapped.exa.ai/",
}


def _fetch_from_twitter_api(username: str) -> Optional[dict]:
    """
    Try to fetch tweets from the twitter-fetch API endpoint.
    
    Args:
        username: Twitter username (without @)
        
    Returns:
        Response JSON if successful, None otherwise
    """
    try:
        response = requests.post(
            TWITTER_FETCH_URL,
            headers=HEADERS,
            json={"username": username},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            # Check if response has meaningful data
            if data and (data.get('tweets') or data.get('searchResults') or data.get('data')):
                print(f"  ✓ twitter-fetch API returned data for @{username}")
                return data
        
        return None
    except Exception as e:
        print(f"  twitter-fetch API error: {e}")
        return None


def _fetch_from_dynamodb_api(username: str) -> Optional[dict]:
    """
    Try to fetch tweets from the dynamodb-tweets API endpoint.
    
    Args:
        username: Twitter username (without @)
        
    Returns:
        Response JSON if successful, None otherwise
    """
    try:
        response = requests.post(
            DYNAMODB_TWEETS_URL,
            headers=HEADERS,
            json={"username": username},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            # Check if response has meaningful data
            if data and (data.get('tweets') or data.get('searchResults') or data.get('data')):
                print(f"  ✓ dynamodb-tweets API returned data for @{username}")
                return data
        
        return None
    except Exception as e:
        print(f"  dynamodb-tweets API error: {e}")
        return None


def _extract_tweets_from_response(data: dict) -> list:
    """
    Extract tweets from various response formats.
    
    Args:
        data: API response data
        
    Returns:
        List of normalized tweet objects
    """
    tweets = []
    
    # Try different response formats
    raw_tweets = (
        data.get('tweets') or 
        data.get('searchResults') or 
        data.get('data', {}).get('tweets') or
        data.get('data', {}).get('searchResults') or
        []
    )
    
    for tweet in raw_tweets:
        if isinstance(tweet, dict):
            tweet_data = {
                "id": tweet.get('id', ''),
                "text": tweet.get('text', '') or tweet.get('snippet', '') or tweet.get('content', ''),
                "url": tweet.get('url', ''),
                "metrics": tweet.get('twitterMetrics', {}) or tweet.get('metrics', {}) or {
                    "like_count": tweet.get('like_count', 0) or tweet.get('likes', 0),
                    "retweet_count": tweet.get('retweet_count', 0) or tweet.get('retweets', 0),
                }
            }
            if tweet_data['text']:  # Only add if there's actual text
                tweets.append(tweet_data)
        elif isinstance(tweet, str):
            # Sometimes tweets might just be strings
            tweets.append({
                "id": "",
                "text": tweet,
                "url": "",
                "metrics": {}
            })
    
    return tweets


def _build_full_text(username: str, tweets: list, top_tweets: list = None) -> str:
    """
    Build a full text representation of the Twitter profile data.
    
    Args:
        username: Twitter username
        tweets: List of tweet objects
        top_tweets: Optional list of top/highlighted tweets
        
    Returns:
        Formatted text string
    """
    full_text_parts = [f"Twitter Profile: @{username}", ""]
    full_text_parts.append(f"Total tweets fetched: {len(tweets)}")
    full_text_parts.append("")
    
    if top_tweets:
        full_text_parts.append("Top Tweets:")
        for tweet in top_tweets[:5]:
            if isinstance(tweet, dict):
                text = tweet.get('text', '') or tweet.get('snippet', '')
                if text:
                    full_text_parts.append(f"- {text}")
                    full_text_parts.append("")
        full_text_parts.append("")
    
    full_text_parts.append("Recent Tweets:")
    
    for tweet in tweets[:20]:
        text = tweet.get('text', '')
        if not text:
            continue
            
        metrics = tweet.get('metrics', {})
        likes = metrics.get('like_count', 0) or metrics.get('likes', 0)
        retweets = metrics.get('retweet_count', 0) or metrics.get('retweets', 0)
        
        full_text_parts.append(f"- {text}")
        if likes or retweets:
            full_text_parts.append(f"  [{likes} likes, {retweets} retweets]")
        full_text_parts.append("")
    
    return "\n".join(full_text_parts)


def scrape_twitter_profile(twitter_url: str, session_path: str = None, headless: bool = True) -> dict:
    """
    Scrape a Twitter/X profile using Exa's Twitter Wrapped API endpoints.
    
    This makes direct API calls to Exa's Twitter Wrapped service to fetch tweets.
    Tries the twitter-fetch endpoint first, falls back to dynamodb-tweets.
    
    Args:
        twitter_url: Twitter/X profile URL
        session_path: Unused, kept for backward compatibility
        headless: Unused, kept for backward compatibility
    
    Returns:
        dict with tweets data and user info:
        - username: Twitter username
        - tweets: List of tweet objects
        - top_tweets: List of top tweets (if available)
        - full_text: Formatted text representation
    """
    username = extract_twitter_username(twitter_url)
    if not username:
        print(f"  Could not extract username from Twitter URL: {twitter_url}")
        return {"username": "", "tweets": [], "top_tweets": [], "full_text": ""}
    
    print(f"🐦 Fetching tweets for @{username}")
    
    result = {
        "username": username,
        "tweets": [],
        "top_tweets": [],
        "full_text": ""
    }
    
    # Try twitter-fetch API first
    data = _fetch_from_twitter_api(username)
    
    # Fall back to dynamodb-tweets if first endpoint failed or returned empty
    if not data:
        print(f"  Trying dynamodb-tweets API for @{username}...")
        data = _fetch_from_dynamodb_api(username)
    
    # If we got data, extract tweets
    if data:
        tweets = _extract_tweets_from_response(data)
        top_tweets = data.get('top_tweets', []) or data.get('data', {}).get('top_tweets', [])
        
        result['tweets'] = tweets
        result['top_tweets'] = top_tweets
        result['full_text'] = _build_full_text(username, tweets, top_tweets)
        
        print(f"  ✓ Fetched {len(tweets)} tweets for @{username}")
    else:
        print(f"  ✗ Could not fetch tweets for @{username} (both APIs failed)")
        result['full_text'] = f"Twitter Profile: @{username}\n\nNo tweets could be fetched."
    
    return result
