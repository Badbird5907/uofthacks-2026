"""
Schema construction and enrichment utilities.
"""
import json
import re
from google.genai import types
from config import gemini_client, GEMINI_MODEL


def get_empty_schema() -> dict:
    """Return an empty schema structure."""
    return {
        "basics": {
            "name": "",
            "current_occupation": "",
            "location": {"city": "", "remote_preference": False},
            "profiles": [],
            "identity_tags": []
        },
        "professional_dna": {
            "experience": [],
            "skills": {"hard_skills": [], "soft_skills": [], "tools": []}
        },
        "personal_dna": {
            "education": [],
            "projects": [],
            "hobbies_and_interests": {"active_pursuits": [], "intellectual_interests": []},
            "volunteering": []
        },
        "identity_mapping_vitals": {
            "communication_style": "",
            "value_alignment": [],
            "career_trajectory": ""
        },
        "extra": ""
    }


def extract_initial_schema_from_resume(resume_text: str, linkedin_data: dict, crawled_content: list = None) -> dict:
    """Extract initial schema from resume, LinkedIn data, and crawled content from resume links."""
    
    # Build crawled content section
    crawled_section = ""
    if crawled_content:
        crawled_parts = []
        for item in crawled_content[:10]:  # Limit to first 10
            crawled_parts.append(f"URL: {item['url']}\nContent:\n{item['content'][:2000]}")
        crawled_section = f"""

ADDITIONAL CONTENT FROM RESUME LINKS:
{chr(10).join(crawled_parts)[:15000]}
"""
    
    prompt = f"""Analyze this resume, LinkedIn data, and additional web content to extract a comprehensive profile schema.

RESUME TEXT:
{resume_text}

LINKEDIN DATA:
{json.dumps(linkedin_data, indent=2)}
{crawled_section}

Extract information into this exact JSON schema. Focus on understanding the person HOLISTICALLY - not just their technical skills.

CRITICAL: Pay special attention to:
- Personal interests, hobbies, and passions outside of work
- Communication style and personality traits
- Values, causes they care about, and community involvement
- Creative pursuits, artistic interests, or side projects
- Personal achievements, awards, or recognitions
- Sports, fitness, or outdoor activities
- Travel, languages, or cultural interests
- Volunteer work or social impact
- Personal blog posts, creative writing, or non-work content

For the identity_tags field, generate 5-7 AI-derived tags that capture the person's COMPLETE essence - both professional AND personal (e.g., "Problem Solver", "Visual Thinker", "Community Builder", "Outdoor Enthusiast", "Creative Writer", "Social Advocate").

Return this exact JSON structure (use empty strings/arrays for missing data):
{{
  "basics": {{
    "name": "String",
    "current_occupation": "String",
    "location": {{ "city": "String", "remote_preference": false }},
    "profiles": [
      {{ "platform": "LinkedIn", "url": "String", "bio_summary": "String" }}
    ],
    "identity_tags": ["Array of descriptive identity tags"]
  }},
  "professional_dna": {{
    "experience": [
      {{
        "company": "String",
        "title": "String",
        "duration": "String",
        "impact_metrics": ["Quantifiable achievements"],
        "cultural_context": "e.g., Fast-paced startup environment"
      }}
    ],
    "skills": {{
      "hard_skills": ["Technical skills"],
      "soft_skills": ["Interpersonal skills"],
      "tools": ["Technologies, frameworks, tools"]
    }}
  }},
  "personal_dna": {{
    "education": [
      {{ "institution": "String", "degree": "String", "focus": "String" }}
    ],
    "projects": [
      {{
        "name": "String",
        "link": "String",
        "description": "String",
        "role": "String",
        "tech_stack": ["Technologies used"]
      }}
    ],
    "hobbies_and_interests": {{
      "active_pursuits": ["Things they DO"],
      "intellectual_interests": ["Things they STUDY or are curious about"]
    }},
    "volunteering": [
      {{ "organization": "String", "cause": "String", "role": "String" }}
    ]
  }},
  "identity_mapping_vitals": {{
    "communication_style": "Derived from resume tone and writing style",
    "value_alignment": ["Values like Transparency, Autonomy, Impact"],
    "career_trajectory": "e.g., Specialist-to-Generalist transition"
  }},
  "extra": ""
}}"""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error extracting initial schema: {e}")
        return get_empty_schema()


def enrich_schema_with_crawled_content(initial_schema: dict, crawled_content: list, search_results: list, github_data: dict = None) -> dict:
    """Enrich the schema with additional crawled content, search results, and GitHub data.
    
    Prioritizes discovering personal, non-technical, and identity-related information.
    """
    
    # Combine all crawled content
    all_content = []
    for item in crawled_content:
        all_content.append(f"URL: {item['url']}\nContent:\n{item['content'][:3000]}")
    for item in search_results:
        all_content.append(f"URL: {item['url']}\nContent:\n{item['content'][:3000]}")
    
    combined_content = "\n\n---\n\n".join(all_content)
    
    # Add GitHub data if available
    github_section = ""
    if github_data and github_data.get('summary'):
        github_section = f"""

GITHUB PRESENCE:
Summary: {github_data.get('summary', '')}
Profiles: {json.dumps(github_data.get('profiles', [])[:5], indent=2)}
Repositories: {json.dumps(github_data.get('repositories', [])[:10], indent=2)}
"""
    
    prompt = f"""You have an initial profile schema and additional web content about the same person.
Enrich and complete the schema with any new information found in the web content.

INITIAL SCHEMA:
{json.dumps(initial_schema, indent=2)}

ADDITIONAL WEB CONTENT (from personal searches, excluding GitHub/LinkedIn):
{combined_content[:3000000]}
{github_section}

CRITICAL INSTRUCTIONS - Focus on the WHOLE PERSON, not just technical skills:

1. Keep all existing information from the initial schema
2. Add new profiles found (Twitter, Instagram, personal websites, blogs, etc.)
3. PRIORITIZE discovering personal aspects:
   - Hobbies, interests, and passions outside of work
   - Creative pursuits (art, music, writing, photography)
   - Sports, fitness, outdoor activities
   - Travel experiences, languages, cultural interests
   - Volunteer work, causes they support, community involvement
   - Personal achievements or awards
   - Family life, pets, lifestyle
   - Humor style, communication tone
   - Personal values and beliefs
   
4. Enhance identity_tags to capture BOTH professional AND personal identity (aim for 6-8 tags)
5. Update communication_style based on their overall online presence tone
6. Add to value_alignment based on causes/topics they genuinely care about
7. Fill hobbies_and_interests comprehensively:
   - active_pursuits: Things they DO (sports, hobbies, activities)
   - intellectual_interests: Things they STUDY, read about, or are curious about
8. Add any volunteering or social impact work discovered
9. Fill the "extra" field with a DETAILED NARRATIVE (3-5 paragraphs) about:
   - Their personality and character beyond technical skills
   - What they're passionate about outside of work
   - How they present themselves online
   - Unique aspects of their identity or background
   - Communities they're part of
   - What makes them interesting as a PERSON, not just a professional

CRITICAL: Return ONLY valid JSON. Do not include any special escape sequences like \\n in strings - use actual newlines or spaces instead. All string values must be properly escaped for JSON.

Return the complete enriched JSON schema with the same structure."""

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        # Try to parse the response, with fallback handling for escape issues
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Try to fix common escape issues
            fixed_text = response.text.replace('\\\\', '\\')
            try:
                return json.loads(fixed_text)
            except json.JSONDecodeError:
                # Last resort: use ast.literal_eval style approach
                import re
                # Replace problematic escapes
                cleaned = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', response.text)
                return json.loads(cleaned)
    except Exception as e:
        print(f"Error enriching schema: {e}")
        return initial_schema


def build_initial_schema_from_input(candidate_profile: dict, job_history: list, education: list) -> dict:
    """Build initial schema from pre-parsed candidate profile data."""
    
    # Build experience from job history
    experiences = []
    for job in job_history:
        experiences.append({
            "company": job.get("companyName", ""),
            "title": job.get("jobTitle", ""),
            "duration": f"{job.get('startDate', '')} - {job.get('endDate', 'Present')}",
            "impact_metrics": [],
            "cultural_context": "",
            "description": job.get("description", "")
        })
    
    # Build education list
    education_list = []
    for edu in education:
        education_list.append({
            "institution": edu.get("institution", ""),
            "degree": edu.get("degree", ""),
            "focus": edu.get("fieldOfStudy", ""),
            "description": edu.get("description", ""),
            "duration": f"{edu.get('startDate', '')} - {edu.get('endDate', 'Present')}"
        })
    
    # Build profiles list from provided URLs
    profiles = []
    if candidate_profile.get("linkedin"):
        profiles.append({
            "platform": "LinkedIn",
            "url": candidate_profile.get("linkedin"),
            "bio_summary": ""
        })
    if candidate_profile.get("github"):
        profiles.append({
            "platform": "GitHub",
            "url": candidate_profile.get("github"),
            "bio_summary": ""
        })
    if candidate_profile.get("twitter"):
        profiles.append({
            "platform": "Twitter",
            "url": candidate_profile.get("twitter"),
            "bio_summary": ""
        })
    if candidate_profile.get("portfolio"):
        profiles.append({
            "platform": "Portfolio",
            "url": candidate_profile.get("portfolio"),
            "bio_summary": ""
        })
    
    # Get current occupation from most recent job
    current_occupation = ""
    if experiences:
        current_occupation = experiences[0].get("title", "")
    
    return {
        "basics": {
            "name": f"{candidate_profile.get('firstName', '')} {candidate_profile.get('lastName', '')}".strip(),
            "current_occupation": current_occupation,
            "location": {"city": "", "remote_preference": False},
            "profiles": profiles,
            "identity_tags": [],
            "phone": candidate_profile.get("phone", ""),
            "extra_links": candidate_profile.get("extraLinks", [])
        },
        "professional_dna": {
            "experience": experiences,
            "skills": {
                "hard_skills": [],
                "soft_skills": [],
                "tools": []
            },
            "skills_raw": candidate_profile.get("skills", ""),
            "experience_raw": candidate_profile.get("experience", "")
        },
        "personal_dna": {
            "education": education_list,
            "projects": [],
            "hobbies_and_interests": {"active_pursuits": [], "intellectual_interests": []},
            "volunteering": []
        },
        "identity_mapping_vitals": {
            "communication_style": "",
            "value_alignment": [],
            "career_trajectory": ""
        },
        "extra": ""
    }
