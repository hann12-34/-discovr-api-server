/**
 * Fortune Sound Club Scraper - Fixed Version
 * Properly extracts event dates from do604.com URLs
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class FortuneSoundClubScraper {
  constructor() {
    this.name = 'Fortune Sound Club';
    this.sourceIdentifier = 'fortune-sound-club';
    this.baseUrl = 'https://do604.com/venues/fortune-sound-club';
    this.venue = {
      name: 'Fortune Sound Club',
      id: 'fortune-sound-club',
      address: '147 E Pender St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6A 1T5',
      coordinates: { lat: 49.2801, lng: -123.1022 },
      websiteUrl: 'https://fortunesoundclub.com',
      description: 'Fortune Sound Club is a premier electronic music venue in Vancouver\'s Chinatown.'
    };
  }

  async scrape() {
    try {
      console.log(`🎵 Scraping ${this.name} events from do604.com...`);
      
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const events = [];
      
      // Look for event links with date patterns
      $('a[href*="/events/"]').each((index, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        
        // Convert relative URLs to absolute
        const eventUrl = href.startsWith('http') ? href : `https://do604.com${href}`;
        
        // Extract date from URL pattern: /events/2025/8/30/event-name
        const dateMatch = eventUrl.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
        if (!dateMatch) return;
        
        const [, year, month, day] = dateMatch;
        const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Skip past events
        const now = new Date();
        if (eventDate < now) return;
        
        // Extract title from URL
        const urlParts = eventUrl.split('/');
        const slug = urlParts[urlParts.length - 1];
        let title = slug.replace(/-tickets$/, '').replace(/-/g, ' ').trim();
        title = title.replace(/\b\w/g, l => l.toUpperCase());
        
        // Get better title from link text if available
        const linkText = $(element).text().trim();
        if (linkText && linkText.length > 2 && !linkText.toLowerCase().includes('view')) {
          title = linkText;
        }
        
        // Skip if title is too short or generic
        if (!title || title.length < 3 || title.toLowerCase().includes('tickets')) return;
        
        const event = {
          id: `fortune-sound-club-${slug}-${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          title: title,
          description: `${title} at Fortune Sound Club`,
          startDate: eventDate,
          endDate: null,
          venue: this.venue,
          category: 'nightlife',
          categories: ['nightlife', 'music', 'electronic'],
          sourceURL: eventUrl,
          officialWebsite: eventUrl,
          ticketURL: eventUrl,
          image: null,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added: ${title} on ${eventDate.toDateString()}`);
      });
      
      // Remove duplicates based on date and title
      const uniqueEvents = [];
      const seen = new Set();
      
      for (const event of events) {
        const key = `${event.title}-${event.startDate.toDateString()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEvents.push(event);
        }
      }
      
      console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from Fortune Sound Club`);
      return uniqueEvents;
      
    } catch (error) {
      console.error(`❌ Error scraping Fortune Sound Club:`, error.message);
      return [];
    }
  }
}

// Export function for compatibility
function scrapeEvents() {
  const scraper = new FortuneSoundClubScraper();
  return scraper.scrape();
}

module.exports = new FortuneSoundClubScraper();
