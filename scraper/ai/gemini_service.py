"""
Gemini AI service for content extraction, query generation, and summarization.
"""
import json
from google.genai import types
from config import gemini_client, GEMINI_MODEL


def extract_nicknames_and_links_from_resume(resume_text: str) -> dict:
    """Use Gemini to extract nicknames and links from resume text."""
    prompt = f"""Analyze this resume text and extract:
1. Any nicknames, aliases, or alternate names the person uses (not their legal name)
2. All URLs and links found (GitHub, personal websites, portfolio links, social media, etc.)
3. Any usernames or handles mentioned (e.g., @username, github.com/username)

Resume text:
{resume_text}

Return your response as a JSON object with this exact structure:
{{
    "nicknames": ["list of nicknames/aliases"],
    "links": ["list of URLs found"],
    "usernames": ["list of usernames/handles extracted from links or mentioned"],
    "legal_name": "the person's full legal name if found"
}}

Only include actual items found. Return empty arrays if nothing found for a category."""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Error extracting nicknames/links: {e}")
        return {"nicknames": [], "links": [], "usernames": [], "legal_name": ""}


def generate_search_queries(name: str, occupation: str, location: str, usernames: list) -> list:
    """Use Gemini to generate smart search queries for finding the person online.
    
    Focuses on discovering personal, non-technical, and identity-related information
    beyond their professional/technical presence.
    """
    prompt = f"""Generate search queries to find personal and non-technical information about this person.

Person's details:
- Name: {name}
- Current occupation/title: {occupation}
- Location: {location}
- Known usernames/handles: {usernames}

Generate STRICTLY 6 (SIX) UNIQUE keyword search queries that would help find this person's:
1. Personal blogs, creative writing, or personal websites; talks about non-work topics
2. Social media profiles (Twitter, Instagram, personal accounts)
3. Hobbies, interests, and extracurricular activities, personal achievements or awards outside of work
4. Community involvement, volunteering, or causes they support
5. Creative work (art, music, photography, etc.)
6. Sports teams, clubs, or group memberships

IMPORTANT: Do NOT generate queries for:
- GitHub or code repositories (handled separately)
- LinkedIn profiles (handled separately)
- Technical/coding content

Focus on discovering WHO the person is beyond their technical skills.

Return as a JSON array of search query strings. Make queries specific enough to identify this person. Make the queries short and concise.
Example: ["John Doe hobbies interests", "John Doe volunteer", "John Doe personal blog", "johndoe <social media platform>", "John Doe <podcast/interview>"]"""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        queries = json.loads(response.text)
        return queries if isinstance(queries, list) else []
    except Exception as e:
        print(f"Error generating search queries: {e}")
        # Fallback to basic queries
        basic_queries = []
        if usernames:
            basic_queries.extend([f"{u}" for u in usernames[:2]])
        if name:
            basic_queries.append(f"{name} {occupation}" if occupation else name)
        return basic_queries


def generate_extra_description(schema: dict, all_content: str) -> str:
    """Generate a comprehensive extra description about the person focusing on personal identity."""
    prompt = f"""Based on all the information gathered about this person, write a detailed description capturing their COMPLETE HUMAN IDENTITY - going far beyond their professional skills.

PERSON'S PROFILE:
{json.dumps(schema, indent=2)}

ALL GATHERED CONTENT:
{all_content[:15000]}

Write a comprehensive, engaging narrative (4-6 paragraphs) that paints a vivid picture of WHO this person is. Focus heavily on NON-TECHNICAL and PERSONAL aspects:

REQUIRED COVERAGE:
1. PERSONALITY & CHARACTER: What kind of person are they? How do they come across? Are they humorous, serious, curious, adventurous? What's their vibe?

2. PASSIONS & INTERESTS: What do they LOVE doing outside of work? Hobbies, sports, creative pursuits, intellectual curiosities? What gets them excited?

3. VALUES & BELIEFS: What do they stand for? What causes do they care about? What communities do they belong to? Any volunteer work or social impact?

4. COMMUNICATION STYLE: How do they express themselves? Are they witty, direct, thoughtful, casual? What's their online presence tone?

5. UNIQUE IDENTITY: What makes them DIFFERENT and INTERESTING? Any unusual backgrounds, experiences, or perspectives? Cultural influences?

6. LIFE OUTSIDE WORK: Family, pets, travel, lifestyle? Any personal achievements, adventures, or life experiences?

7. OVERALL IMPRESSION: If you met this person at a party, what would you remember about them? What makes them memorable as a HUMAN BEING?

WRITING STYLE:
- Write as if introducing someone to a friend, not as a formal HR document
- Be specific and vivid - use details and examples
- Capture what makes this person unique and interesting
- Balance professional context with personal depth
- Make it feel like a real person, not a resume summary

This should help someone understand the COMPLETE person - someone they might want to grab coffee with, not just hire.
Return only the description text, no JSON."""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Error generating extra description: {e}")
        return ""
