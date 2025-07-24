const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class VancouverCivicTheatresEvents {
  constructor() {
    this.name = 'Vancouver Civic Theatres Events';
    this.url = 'https://vancouvercivictheatres.com/events/';
    this.venue = {
      name: "Vancouver Civic Theatres",
      id: "vancouver-civic-theatres",
      address: "630 Hamilton St",
      city: "Vancouver",
      state: "BC", 
      country: "Canada",
      postalCode: "V6B 5N6",
      location: {
        coordinates: [-123.1178014, 49.2813118]
      }
    };
  }

  async scrape() {
    console.log('🔍 Starting Vancouver Civic Theatres Events scraper...');
    const events = [];

    try {
      console.log(`Fetching ${this.url}`);
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      
      // Look for event data in script tags or JSON
      const scriptTags = $('script[type="application/json"], script[type="text/html"]');
      console.log(`Found ${scriptTags.length} script tags`);
      
      // Also try basic selectors for any visible events
      const selectors = [
        '.event',
        '.show',
        '.performance',
        '[data-event]',
        '[class*="event"]',
        '[class*="show"]',
        'a[href*="event"]',
        'a[href*="show"]'
      ];
      
      let eventElements = $();
      for (const selector of selectors) {
        eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      // If no events found with selectors, try to find links to individual shows
      if (eventElements.length === 0) {
        console.log('No events found with standard selectors, trying links...');
        eventElements = $('a').filter((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          return (href.includes('show') || href.includes('event') || 
                  text.length > 5 && text.length < 100 && 
                  !text.toLowerCase().includes('home') &&
                  !text.toLowerCase().includes('about'));
        });
        console.log(`Found ${eventElements.length} potential event links`);
      }
      
      eventElements.each((i, element) => {
        try {
          const $el = $(element);
          
          // Get title
          let title = $el.find('h1, h2, h3, h4, .title, .event-title, .entry-title').first().text().trim() ||
                     $el.text().trim().split('\n')[0];
          
          // Skip if no valid title
          if (!title || title.length < 3 || title.length > 200) return;
          
          // Skip non-event content
          const skipWords = ['home', 'about', 'contact', 'menu', 'search', 'navigation', 'subscribe', 'follow', 'upcoming', 'bring your next event'];
          if (skipWords.some(word => title.toLowerCase().includes(word))) return;
          
          // Extract date
          let dateStr = $el.find('.date, .event-date, .start-date, time, .datetime, .tribe-event-date').first().text().trim();
          
          // Look for date patterns if not found
          if (!dateStr) {
            const text = $el.text();
            const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/i;
            const match = text.match(datePattern);
            if (match) dateStr = match[0];
          }
          
          // Extract other data
          const description = $el.find('p, .description, .event-description, .excerpt, .entry-content').first().text().trim();
          let link = $el.find('a').first().attr('href') || this.url;
          if (link && link.startsWith('/')) {
            link = 'https://vancouvercivictheatres.com' + link;
          }
          const imageUrl = $el.find('img').first().attr('src') || '';
          
          const event = {
            id: uuidv4(),
            title: title,
            description: description || '',
            date: dateStr || 'Date TBA',
            time: '7:30 PM', // Default theatre time
            venue: this.venue,
            category: 'Theatre',
            price: 'Check website',
            ticketUrl: link,
            sourceUrl: this.url,
            imageUrl: imageUrl,
            organizer: this.venue.name,
            tags: ['Theatre', 'Live Performance', 'Vancouver'],
            source: 'vancouver-civic-theatres',
            scrapedAt: new Date().toISOString()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title}`);
          
        } catch (error) {
          console.log(`Error processing element: ${error.message}`);
        }
      });

    } catch (error) {
      console.error('Error scraping Vancouver Civic Theatres:', error.message);
    }

    console.log(`🎉 Scraped ${events.length} events from Vancouver Civic Theatres`);
    return events;
  }
}

module.exports = new VancouverCivicTheatresEvents();
