"""
Agentic URL Resolver & Validator
================================
Validates and enriches job apply URLs.
If a job has a generic search link or simple ID link, this agent searches
DuckDuckGo to locate the exact direct corporate apply URL or the fully
slugged LinkedIn/Naukri direct job posting page.
"""

import requests
import urllib.parse
import re
from bs4 import BeautifulSoup
from typing import Optional, List

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


class AgenticURLResolver:
    """
    Agentic resolver that searches DuckDuckGo in real-time to find 
    direct corporate application URLs or slugged direct job links.
    """

    def ddg_search(self, query: str) -> List[str]:
        """Free, keyless search on DuckDuckGo HTML engine."""
        url = "https://html.duckduckgo.com/html/"
        params = {"q": query}
        headers = {
            "User-Agent": USER_AGENTS[0],
            "Accept-Language": "en-US,en;q=0.5",
        }
        try:
            resp = requests.post(url, data=params, headers=headers, timeout=3)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                links = []
                for tag in soup.select("a.result__url"):
                    href = tag.get("href", "").strip()
                    if "uddg=" in href:
                        parsed = urllib.parse.urlparse(href)
                        qs = urllib.parse.parse_qs(parsed.query)
                        if "uddg" in qs:
                            href = qs["uddg"][0]
                    links.append(href)
                return links
        except Exception:
            pass
        return []

    def is_generic_search_url(self, url: str) -> bool:
        """Returns True if the URL points to a search result page instead of a specific job."""
        if not url:
            return True
        url_lower = url.lower()
        return any(
            x in url_lower
            for x in [
                "/jobs/search",
                "/jobs/results",
                "careers.google.com/jobs/results",
                "careers.microsoft.com/us/en/search-results",
                "amazon.jobs/en/search",
                "careers.walmart.com/results",
            ]
        )

    def resolve_apply_url(self, title: str, company: str, current_url: Optional[str] = None) -> str:
        """
        Main entry point: attempts to find the absolute direct apply URL.
        If current_url is already a specific job page, returns it immediately.
        """
        # If we have a specific direct link, keep it
        if current_url and not self.is_generic_search_url(current_url):
            # Clean up raw view/ID URLs into full slugged URLs if possible
            if "linkedin.com/jobs/view/" in current_url and current_url.endswith("/"):
                # Clean simple /jobs/view/12345/ might need full context to load reliably
                pass
            else:
                return current_url

        print(f"[AgenticURLResolver] Resolving direct link for '{title}' @ '{company}'")

        # 1. Search Query: "Company" "Job Title" careers India
        query = f'"{company}" "{title}" careers India'
        links = self.ddg_search(query)

        # Fallback query if no results: Company Job Title careers
        if not links:
            query = f'{company} {title} careers'
            links = self.ddg_search(query)

        # 2. Iterate through search results and prioritize direct listings
        # Priority 1: Corporate career portals (Lever, Greenhouse, Workday, Company Domain)
        for link in links:
            link_lower = link.lower()
            
            # Avoid aggregator domains and generic search URLs
            is_aggregator = any(
                domain in link_lower
                for domain in [
                    "linkedin.com", "naukri.com", "glassdoor", "indeed.com", 
                    "foundit", "monster", "ambitionbox", "simplyhired"
                ]
            )
            
            # Check for corporate application portals
            is_ats = any(
                ats in link_lower
                for ats in ["lever.co", "greenhouse.io", "myworkdayjobs", "recruitee.com", "smartrecruiters.com"]
            )
            
            # If it's a corporate site or direct ATS page, return it immediately!
            if not is_aggregator and ("careers" in link_lower or "job" in link_lower or is_ats):
                print(f"[AgenticURLResolver] Direct Corporate link resolved: {link}")
                return link

        # Priority 2: Specific slugged LinkedIn job views
        for link in links:
            if "linkedin.com/jobs/view/" in link and not self.is_generic_search_url(link):
                # Ensure it's a specific posting link
                print(f"[AgenticURLResolver] Direct LinkedIn link resolved: {link}")
                return link

        # Priority 3: Specific Naukri listings
        for link in links:
            if "naukri.com/job-listings-" in link:
                print(f"[AgenticURLResolver] Direct Naukri link resolved: {link}")
                return link

        # Fallback: Reconstruct a clean search link if nothing specific was found
        title_enc = urllib.parse.quote(title)
        company_enc = urllib.parse.quote(company)
        fallback_url = f"https://www.linkedin.com/jobs/search/?keywords={title_enc}%20{company_enc}&location=India&f_TPR=r604800&sortBy=DD"
        
        if current_url:
            return current_url
            
        print(f"[AgenticURLResolver] No direct link found, falling back to: {fallback_url}")
        return fallback_url
