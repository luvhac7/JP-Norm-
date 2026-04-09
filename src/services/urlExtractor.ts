import axios from 'axios';
import * as cheerio from 'cheerio';

export async function extractFromUrl(url: string): Promise<string> {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return extractTwitter(url);
  } else if (url.includes('reddit.com')) {
    return extractReddit(url);
  } else {
    return extractGeneric(url);
  }
}

async function extractTwitter(url: string): Promise<string> {
  try {
    // Try fxtwitter.com first as it's optimized for embeds/meta tags
    const fxUrl = url.replace(/(twitter\.com|x\.com)/, 'fxtwitter.com');
    const response = await axios.get(fxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    // fxtwitter often puts the text in og:description or a specific tag
    const description = $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="description"]').attr('content');
    
    if (description) {
      return description.replace(/^“/, '').replace(/”$/, '').trim();
    }
    
    return "Could not extract tweet content. Twitter's protection prevents simple scraping. Please paste the text directly.";
  } catch (error: any) {
    return `Twitter Extraction Error: ${error.message}`;
  }
}

async function extractReddit(url: string): Promise<string> {
  try {
    // Reddit has a simple .json endpoint for public posts
    const jsonUrl = url.split('?')[0].replace(/\/$/, '') + '.json';
    const response = await axios.get(jsonUrl, {
      headers: {
        'User-Agent': 'JP-Norm-Bot/1.0'
      }
    });
    
    const postData = response.data[0].data.children[0].data;
    const title = postData.title || '';
    const body = postData.selftext || '';
    
    return `${title}\n\n${body}`.trim();
  } catch (error: any) {
    return `Reddit Extraction Error: ${error.message}`;
  }
}

async function extractGeneric(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header').remove();
    
    const text = $('body').text();
    return text.replace(/\s+/g, ' ').trim().substring(0, 2000);
  } catch (error: any) {
    return `Generic Extraction Error: ${error.message}`;
  }
}

export function cleanExtractedText(text: string): string {
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/\S+/g, '');
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}
