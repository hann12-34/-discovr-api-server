#!/usr/bin/env python3
"""
Fortune Sound Club Event Scraper
--------------------------------
This script scrapes event data from Fortune Sound Club website
and formats it according to the MongoDB API models used in the Discovr app.
"""

import requests
from bs4 import BeautifulSoup
import json
import logging
import datetime
import re
import os
import time
import sys
from typing import List, Dict, Any, Optional

# Custom JSON encoder for datetime objects
class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super().default(obj)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('fortune_scraper')

# Constants
BASE_URL = "https://www.fortunesoundclub.com"
EVENTS_URL = f"{BASE_URL}/events"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "fortune_events.json")
VENUE_NAME = "Fortune Sound Club"
VENUE_ADDRESS = "147 East Pender Street, Vancouver, BC, V6A 1T6, Canada"
VENUE_LAT = 49.280528
VENUE_LNG = -123.100751

# Headers to mimic a browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}


class FortuneScraper:
    """Scraper for Fortune Sound Club events"""
    
    def __init__(self):
        """Initialize the scraper"""
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
    
    def get_page(self, url: str) -> BeautifulSoup:
        """Get a page and return its BeautifulSoup object"""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            raise
    
    def get_event_links(self) -> List[str]:
        """Get all event links from the main events page"""
        soup = self.get_page(EVENTS_URL)
        event_links = []
        
        # Find all event links - they're in <a> tags with links to /events/[event-slug]
        links = soup.find_all('a', href=lambda href: href and href.startswith('/events/') and href != '/events/')
        
        for link in links:
            href = link.get('href')
            # Ensure each link is only added once
            if href and href not in event_links:
                event_links.append(href)
        
        logger.info(f"Found {len(event_links)} event links")
        return event_links
    
    def parse_date_time(self, date_str: str, time_str: str) -> Optional[datetime.datetime]:
        """Parse date and time strings into a datetime object"""
        try:
            # Format: Friday, June 27, 2025
            date_parts = date_str.split(',')
            if len(date_parts) >= 2:
                date_str = date_parts[1].strip() + date_parts[2].strip() if len(date_parts) > 2 else date_parts[1].strip()
            
            # Format: 10:00 p.m.
            time_str = time_str.strip()
            
            # Fix common issues in date strings
            # Handle missing spaces between day and year (e.g., "June 272025")
            date_str = re.sub(r'(\d{1,2})(\d{4})', r'\1 \2', date_str)
            
            # Combine date and time
            datetime_str = f"{date_str} {time_str}"
            
            # Remove periods from am/pm
            datetime_str = datetime_str.replace("a.m.", "AM").replace("p.m.", "PM")
            
            # Try different format patterns
            formats = [
                "%B %d %Y %I:%M %p",  # June 27 2025 10:00 PM
                "%B %d, %Y %I:%M %p",  # June 27, 2025 10:00 PM
                "%b %d %Y %I:%M %p",  # Jun 27 2025 10:00 PM
                "%b %d, %Y %I:%M %p",  # Jun 27, 2025 10:00 PM
            ]
            
            for fmt in formats:
                try:
                    return datetime.datetime.strptime(datetime_str, fmt)
                except ValueError:
                    # If we fail, try one more cleanup - sometimes months have trailing spaces
                    try:
                        cleaned_str = re.sub(r'\s+', ' ', datetime_str)
                        return datetime.datetime.strptime(cleaned_str, fmt)
                    except ValueError:
                        continue
            
            logger.warning(f"Could not parse date/time: {date_str} {time_str} (Combined: {datetime_str})")
            return None
        except Exception as e:
            logger.error(f"Error parsing date/time: {date_str} {time_str} - {e}")
            return None
    
    def extract_ticket_link(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract ticket link from event page"""
        # Look for "buy tickets" link
        ticket_links = soup.find_all('a', string=lambda s: s and 'buy tickets' in s.lower())
        if ticket_links:
            return ticket_links[0]['href']
        
        # Also check for links to on.fortunesoundclub.com
        ticket_links = soup.find_all('a', href=lambda href: href and 'on.fortunesoundclub.com' in href)
        if ticket_links:
            return ticket_links[0]['href']
        
        return None
    
    def extract_image_url(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract event image URL"""
        # Look for image in the content area
        images = soup.select('.sqs-block-image img[data-src]')
        if images:
            return images[0].get('data-src')
        
        # Look for any image in the page
        images = soup.select('img[data-src]')
        if images:
            return images[0].get('data-src')
        
        return None
        
    def create_event(self, title, description, start_date, end_date, ticket_url=None, image_url=None, source_url=None):
        """Create event dictionary based on scraped data, matching Fox Cabaret format"""
        # Generate consistent ID
        event_id = f"fortunesound-{re.sub('[^a-zA-Z0-9]', '-', title.lower())}-{int(start_date.timestamp()) if start_date else '0'}"
        
        # Determine categories based on event title/description
        categories = ['music', 'concert', 'nightlife']
        if re.search(r'hip.?hop|rap', title.lower() + ' ' + description.lower()):
            categories.append('hip-hop')
        elif re.search(r'jazz', title.lower() + ' ' + description.lower()):
            categories.append('jazz')
        elif re.search(r'electronic|dj|dance|edm|house|techno', title.lower() + ' ' + description.lower()):
            categories.append('electronic')
        
        # Determine season
        season = 'year-round'
        if start_date:
            month = start_date.month
            if 3 <= month <= 5:
                season = 'spring'
            elif 6 <= month <= 8:
                season = 'summer'
            elif 9 <= month <= 11:
                season = 'fall'
            else:
                season = 'winter'
        
        return {
            'id': event_id,
            'name': title,
            'title': title,  # For iOS compatibility
            'description': description,
            'image': image_url,
            'date': start_date.isoformat() if start_date else None,  # For iOS compatibility
            'startDate': start_date,
            'endDate': end_date,
            'season': season,
            'category': categories[0],  # Single category for iOS compatibility
            'categories': categories,
            'location': VENUE_NAME,
            'venue': {
                'name': VENUE_NAME,
                'address': VENUE_ADDRESS,
                'city': 'Vancouver',
                'state': 'BC',
                'country': 'Canada',
                'coordinates': { 'lat': VENUE_LAT, 'lng': VENUE_LNG }
            },
            'sourceURL': 'https://www.fortunesoundclub.com/events',
            'officialWebsite': source_url,
            'ticketURL': ticket_url
        }
    
    def get_event_details(self, event_url: str) -> Dict[str, Any]:
        """Get details for a specific event"""
        full_url = f"{BASE_URL}{event_url}"
        logger.info(f"Scraping event: {full_url}")
        
        soup = self.get_page(full_url)
        
        # Extract title
        title = soup.find('h1')
        title_text = title.text.strip() if title else "Unknown Event"
        
        # Extract date and time
        date_time_elements = soup.select('.eventitem-meta-date')
        start_date = None
        end_date = None
        
        if date_time_elements:
            date_blocks = []
            for element in date_time_elements:
                date_text = element.get_text(strip=True, separator="\n").split("\n")
                date_blocks.extend(date_text)
            
            # Clean up the date blocks to get date and time parts
            date_blocks = [block.strip() for block in date_blocks if block.strip()]
            
            if len(date_blocks) >= 4:  # Assuming we have start date, start time, end date, end time
                start_date = self.parse_date_time(date_blocks[0], date_blocks[1])
                if len(date_blocks) >= 4:
                    end_date = self.parse_date_time(date_blocks[2], date_blocks[3])
        
        # Extract description
        description_block = soup.select('.sqs-html-content')
        description = ""
        if description_block:
            paragraphs = description_block[0].find_all(['p', 'h2', 'h3', 'h4'])
            description_parts = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)]
            description = "\n".join(description_parts)
        
        # Extract ticket link
        ticket_link = self.extract_ticket_link(soup)
        
        # Extract image
        image_url = self.extract_image_url(soup)
        
        # Create event dictionary
        event_data = self.create_event(title_text, description, start_date, end_date, ticket_link, image_url, full_url)
        
        return event_data
    
    def scrape_all_events(self) -> List[Dict[str, Any]]:
        """Scrape all events from the website"""
        event_links = self.get_event_links()
        all_events = []
        
        for i, link in enumerate(event_links):
            try:
                logger.info(f"Processing event {i+1}/{len(event_links)}: {link}")
                event_data = self.get_event_details(link)
                all_events.append(event_data)
                
                # Be nice to the server - add a small delay between requests
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error processing event {link}: {e}")
        
        return all_events
    
    def save_to_json(self, events: List[Dict[str, Any]], filepath: str = OUTPUT_FILE) -> None:
        # Save events to file in the same format as Fox Cabaret scraper
        # Direct array of events instead of wrapped in a data field
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2, ensure_ascii=False, cls=DateTimeEncoder)
        
        logger.info(f"Saved {len(events)} events to {OUTPUT_FILE}")
        logger.info(f"Successfully scraped {len(events)} events from Fortune Sound Club")


def main():
    """Main function to run the scraper"""
    logger.info("Starting Fortune Sound Club event scraper")
    
    scraper = FortuneScraper()
    
    try:
        events = scraper.scrape_all_events()
        scraper.save_to_json(events)
        logger.info(f"Successfully scraped {len(events)} events from Fortune Sound Club")
    except Exception as e:
        logger.error(f"Error during scraping: {e}")


if __name__ == "__main__":
    main()
