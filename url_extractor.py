import re
import requests
from bs4 import BeautifulSoup
import json

# Note: snscrape is often unstable due to Twitter changes. 
# In a real production environment, official APIs or robust scrapers are used.
# For this project, we implement a flexible extraction logic.

def extract_from_url(url: str):
    """
    Main entry point for URL extraction.
    Detects platform and routes to specific extractor.
    """
    if "twitter.com" in url or "x.com" in url:
        return extract_twitter(url)
    elif "reddit.com" in url:
        return extract_reddit(url)
    else:
        return extract_generic(url)

def extract_twitter(url: str):
    # Mock/Simplified extraction for Twitter if snscrape fails
    # Real snscrape implementation would be:
    # import snscrape.modules.twitter as sntwitter
    # tweet = next(sntwitter.TwitterTweetScraper(url).get_items())
    # return tweet.content
    
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(response.text, "html.parser")
        # Twitter often hides content from simple scrapers, but we try to find meta tags
        meta_desc = soup.find("meta", property="og:description")
        if meta_desc:
            return meta_desc["content"]
        return "Could not extract tweet content. Twitter requires authentication or advanced scraping."
    except Exception as e:
        return f"Twitter Extraction Error: {str(e)}"

def extract_reddit(url: str):
    # Simplified Reddit extraction using .json endpoint (no API key needed for public posts)
    try:
        if not url.endswith(".json"):
            json_url = url.split("?")[0].rstrip("/") + ".json"
        else:
            json_url = url
            
        response = requests.get(json_url, headers={"User-Agent": "JP-Norm-Bot/1.0"})
        data = response.json()
        
        post_data = data[0]["data"]["children"][0]["data"]
        title = post_data.get("title", "")
        body = post_data.get("selftext", "")
        
        return f"{title}\n\n{body}".strip()
    except Exception as e:
        return f"Reddit Extraction Error: {str(e)}"

def extract_generic(url: str):
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text()
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:2000] # Limit to first 2000 chars
    except Exception as e:
        return f"Generic Extraction Error: {str(e)}"

def clean_text(text: str):
    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text
