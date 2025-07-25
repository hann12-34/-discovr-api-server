const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class RoxyVancouverEvents {
  constructor() {
    this.name = 'Roxy Vancouver Events';
    this.url = 'https://www.roxyvan.com/events';
    this.venue = {
      name: "The Roxy",
      id: "roxy-vancouver",
      address: "932 Granville St",
      city: "Vancouver",
      state: "BC", 
      country: "Canada",
      postalCode: "V6Z 1L2",
      location: {
        coordinates: [-123.1232, 49.2798]
      }
    };
  }

  async scrape() {
    console.log('🔍 Starting Roxy Vancouver Events scraper...');
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
      
      // Try multiple selectors for events
      const selectors = [
        '.event-item',
        '.event-card', 
        '.sqs-block-content',
        '.content-block',
        'article',
        '.grid-item',
        '.event-listing',
        '.sqs-block',
        'h1, h2, h3'
      ];
      
      let eventElements = $();
      for (const selector of selectors) {
        eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      eventElements.each((i, element) => {
        try {
          const $el = $(element);
          
          // Get title
          let title = $el.find('h1, h2, h3, h4, .title, .event-title').first().text().trim() ||
                     $el.text().trim().split('\n')[0];
          
          // Skip if no valid title
          if (!title || title.length < 3 || title.length > 200) return;
          
          // Skip non-event content
          const skipWords = ['home', 'about', 'contact', 'menu', 'search', 'navigation'];
          if (skipWords.some(word => title.toLowerCase().includes(word))) return;
          
          // Extract date
          let dateStr = $el.find('.date, .event-date, time, .datetime').first().text().trim();
          
          // Look for date patterns if not found
          if (!dateStr) {
            const text = $el.text();
            const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/i;
            const match = text.match(datePattern);
            if (match) dateStr = match[0];
          }
          
          // Extract other data
          const description = $el.find('p, .description, .content, .excerpt').first().text().trim();
          let link = $el.find('a').first().attr('href') || this.url;
          if (link && link.startsWith('/')) {
            link = 'https://www.roxyvan.com' + link;
          }
          const imageUrl = $el.find('img').first().attr('src') || '';
          
          const event = {
            id: uuidv4(),
            title: title,
            description: description || '',
            date: dateStr || 'Date TBA',
            time: '9:00 PM',
            venue: this.venue,
            category: 'Nightlife',
            price: 'Check website',
            ticketUrl: link,
            sourceUrl: this.url,
            imageUrl: imageUrl,
            organizer: this.venue.name,
            tags: ['Nightlife', 'Live Music', 'Vancouver'],
            source: 'roxy-vancouver',
            scrapedAt: new Date().toISOString()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title}`);
          
        } catch (error) {
          console.log(`Error processing element: ${error.message}`);
        }
      });

    } catch (error) {
      console.error('Error scraping Roxy Vancouver:', error.message);
    }

    console.log(`🎉 Scraped ${events.length} events from Roxy Vancouver`);
    return events;
  }
}

module.exports = new RoxyVancouverEvents();
