"""
LinkedIn profile scraping using linkedin_scraper v3.0+ (Playwright-based).
"""
import os
import asyncio


def scrape_linkedin_profile(linkedin_url: str, session_path: str = None, headless: bool = False) -> dict:
    """
    Scrape LinkedIn profile using linkedin_scraper v3.0+ (Playwright-based).
    Falls back to Exa if linkedin_scraper fails.
    
    Setup Requirements:
    1. Install: pip install linkedin_scraper
    2. Install Playwright browsers: playwright install chromium
    3. Set LinkedIn credentials in environment variables:
       - LINKEDIN_EMAIL: Your LinkedIn email
       - LINKEDIN_PASSWORD: Your LinkedIn password
    4. Ensure your LinkedIn account language is set to English
    
    Session Management:
    - First run will authenticate and save session to session_path
    - Subsequent runs will load the saved session for faster scraping
    - If session expires, it will re-authenticate automatically
    
    Args:
        linkedin_url: The LinkedIn profile URL to scrape
        session_path: Path to save/load session file. Resolution order:
                      1. Explicit parameter value
                      2. LINKEDIN_SESSION_PATH environment variable
                      3. Default: "linkedin_session.json"
        headless: Run browser in headless mode (default False, LinkedIn may block headless)
    
    Returns:
        dict with scraped profile data
    """
    
    # Resolve session path: parameter > env var > default
    resolved_session_path = session_path or os.getenv("LINKEDIN_SESSION_PATH", "linkedin_session.json")
    
    async def _scrape_async() -> dict:
        """Async implementation using linkedin_scraper v3.0+ Playwright API."""
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
        
        try:
            # Import exactly as shown in the working example
            from linkedin_scraper.scrapers.person import PersonScraper
            from linkedin_scraper.core.browser import BrowserManager as LiBrowserManager
            from linkedin_scraper import login_with_credentials
            
            profile_url = linkedin_url if linkedin_url.startswith('http') else 'https://' + linkedin_url
            if not profile_url.endswith('/'):
                profile_url = profile_url + '/'
            
            # Initialize and start browser using context manager (exactly like the example)
            async with LiBrowserManager(headless=headless) as browser:
                # Set a default timeout for all locator operations to prevent hanging
                browser.page.set_default_timeout(15000)  # 15 seconds per operation
                
                logged_in = False
                
                # Try to load existing session first (must be created first)
                if os.path.exists(resolved_session_path):
                    try:
                        await browser.load_session(resolved_session_path)
                        print(f"✓ Session loaded from {resolved_session_path}")
                        logged_in = True
                    except Exception as e:
                        print(f"Could not load LinkedIn session: {e}")
                
                # If no session, try credentials login
                if not logged_in:
                    linkedin_email = os.getenv("LINKEDIN_EMAIL")
                    linkedin_password = os.getenv("LINKEDIN_PASSWORD")
                    
                    if linkedin_email and linkedin_password:
                        try:
                            await login_with_credentials(
                                browser.page,
                                email=linkedin_email,
                                password=linkedin_password
                            )
                            # Save session for future use
                            await browser.save_session(resolved_session_path)
                            print(f"✓ Logged in to LinkedIn and saved session to {resolved_session_path}")
                            logged_in = True
                        except Exception as e:
                            print(f"LinkedIn credentials login failed: {e}")
                    else:
                        print("No LinkedIn credentials found. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars.")
                
                if not logged_in:
                    print("Could not authenticate with LinkedIn. Skipping LinkedIn scraper.")
                    return linkedin_data
                
                # Initialize scraper with the browser page
                scraper = PersonScraper(browser.page)
                
                # Scrape the profile - pass URL to scrape() with a timeout
                # The scraper can hang on certain profiles if elements don't exist
                print(f"🚀 Scraping: {profile_url}")
                try:
                    person = await asyncio.wait_for(scraper.scrape(profile_url), timeout=120.0)
                except asyncio.TimeoutError:
                    print(f"⚠️ LinkedIn scraper timed out after 120 seconds for {profile_url}")
                    return linkedin_data
                
                # Extract data from the Person model (v3.0+ Pydantic models)
                # Fields: name, location, about, open_to_work, experiences, educations, interests, accomplishments, contacts
                linkedin_data["name"] = person.name or ""
                linkedin_data["location"] = person.location or ""
                linkedin_data["about"] = person.about or ""
                linkedin_data["interests"] = person.interests or []
                
                # headline comes from job_title property (experiences[0].position_title)
                linkedin_data["headline"] = person.job_title or ""
                
                # Extract experiences (Experience model: position_title, institution_name, duration, description, location, from_date, to_date)
                if person.experiences:
                    for exp in person.experiences:
                        linkedin_data["experiences"].append({
                            "title": exp.position_title or "",
                            "company": exp.institution_name or "",
                            "duration": exp.duration or "",
                            "description": exp.description or "",
                            "location": exp.location or "",
                            "from_date": exp.from_date or "",
                            "to_date": exp.to_date or ""
                        })
                
                # Extract education (Education model: institution_name, degree, from_date, to_date, description)
                if person.educations:
                    for edu in person.educations:
                        linkedin_data["education"].append({
                            "institution": edu.institution_name or "",
                            "degree": edu.degree or "",
                            "description": edu.description or "",
                            "from_date": edu.from_date or "",
                            "to_date": edu.to_date or ""
                        })
                
                # Build full text representation
                full_text_parts = [
                    f"Name: {linkedin_data['name']}",
                    f"Headline: {linkedin_data['headline']}",
                    f"Location: {linkedin_data['location']}",
                    f"About: {linkedin_data['about']}",
                    "Interests: " + ", ".join(linkedin_data['interests']) if linkedin_data['interests'] else "Interests: ",
                    "Experiences:",
                ]
                for exp in linkedin_data["experiences"]:
                    full_text_parts.append(f"  - {exp['title']} at {exp['company']} ({exp['duration']}): {exp['description']}")
                full_text_parts.append("Education:")
                for edu in linkedin_data["education"]:
                    full_text_parts.append(f"  - {edu['degree']} at {edu['institution']}")
                
                linkedin_data["full_text"] = "\n".join(full_text_parts)
                
                print(f"✓ Successfully scraped: {person.name}")
                print(f"  Experiences: {len(person.experiences)}, Education: {len(person.educations)}")
                return linkedin_data
                
        except ImportError as e:
            print(f"linkedin_scraper import failed: {e}")
            print("Install with: pip install linkedin_scraper && playwright install chromium")
        except asyncio.CancelledError:
            # Task was cancelled, clean up gracefully
            print("LinkedIn scraper cancelled")
        except Exception as e:
            # Check if it's a TargetClosedError (browser closed during operation)
            if 'TargetClosedError' in type(e).__name__ or 'Target page, context or browser has been closed' in str(e):
                print("LinkedIn scraper interrupted (browser closed)")
            else:
                print(f"linkedin_scraper failed: {e}")
                import traceback
                traceback.print_exc()
        
        return linkedin_data
    
    # Initialize empty result
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
    
    # Ensure URL has proper protocol
    url = linkedin_url if linkedin_url.startswith('http') else 'https://' + linkedin_url
    
    # Custom exception handler to suppress TargetClosedError warnings from abandoned futures
    def _suppress_target_closed_handler(loop, context):
        """Suppress TargetClosedError from orphaned futures when browser is closed."""
        exception = context.get('exception')
        if exception:
            exc_name = type(exception).__name__
            if exc_name == 'TargetClosedError' or 'Target page, context or browser has been closed' in str(exception):
                # Silently ignore - this happens when browser closes during pending operations
                return
        # For other exceptions, use the default handler
        loop.default_exception_handler(context)
    
    # Try linkedin_scraper first (v3.0+ with Playwright)
    try:
        # Run the async scraper
        def _run_with_custom_handler():
            """Run async scraper with custom exception handler to suppress TargetClosedError."""
            loop = asyncio.new_event_loop()
            loop.set_exception_handler(_suppress_target_closed_handler)
            try:
                return loop.run_until_complete(_scrape_async())
            finally:
                # Cancel any pending tasks before closing
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                loop.close()
        
        try:
            loop = asyncio.get_running_loop()
            # If we're already in an async context, run in a new thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(_run_with_custom_handler)
                linkedin_data = future.result(timeout=90)  # 90 second timeout
        except RuntimeError:
            # No running loop, we can create one
            # Create a new loop with custom exception handler to suppress TargetClosedError
            loop = asyncio.new_event_loop()
            loop.set_exception_handler(_suppress_target_closed_handler)
            try:
                linkedin_data = loop.run_until_complete(_scrape_async())
            finally:
                # Cancel any pending tasks before closing
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                # Give tasks a chance to handle cancellation
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                loop.close()
        
        if linkedin_data.get("name") or linkedin_data.get("full_text"):
            return linkedin_data
    except Exception as e:
        print(f"linkedin_scraper failed: {e}")
    
    # Note: Exa and Firecrawl don't support LinkedIn scraping, so no fallback available
    # Return whatever data we have (may be empty)
    return linkedin_data
