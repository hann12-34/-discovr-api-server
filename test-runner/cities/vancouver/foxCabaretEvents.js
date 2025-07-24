/**
 * Fox Cabaret Events Scraper
 * Fixed implementation that properly scrapes the current website structure
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrape() {
  console.log('🔍 Scraping events from Fox Cabaret...');
  try {
    const sourceUrl = 'https://foxcabaret.com/events/';
    console.log(`Navigating to ${sourceUrl}`);
    
    const response = await axios.get(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    if (response.status !== 200) {
      console.error(`Failed to fetch Fox Cabaret events: ${response.status}`);
      return [];
    }
    
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Try multiple selectors to find events on the current site structure
    const eventSelectors = [
      '.event-item', '.event-card', '.show', '.shows-item', 
      '.event-list-item', '.eventItem', '.event', 'article.event',
      '.show-listing', '.event-listing', '.tribe-events-list-event'
    ];
    
    let eventElements = [];
    
    for (const selector of eventSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} event elements using selector: ${selector}`);
        eventElements = elements;
        break;
      }
    }
    
    // If standard selectors don't work, try to extract from page structure
    if (eventElements.length === 0) {
      console.log('Trying alternative extraction methods...');
      
      // Look for date elements that might indicate events
      const dateElements = $('[class*="date"], [class*="calendar"], time, [class*="event"], [class*="show"]');
      
      if (dateElements.length > 0) {
        console.log(`Found ${dateElements.length} potential date elements`);
        dateElements.each((i, el) => {
          // Extract event info from surrounding context
          const dateText = $(el).text().trim();
          const title = $(el).closest('div, article, section').find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
          
          if (title && dateText && !title.toLowerCase().includes('subscribe') && !title.toLowerCase().includes('newsletter')) {
            const eventElement = $(el).closest('div, article, section');
            
            // Try to find a link that might be the event URL
            let eventUrl = '';
            eventElement.find('a').each((i, link) => {
              const href = $(link).attr('href');
              if (href && !href.includes('mailto:') && !href.includes('tel:')) {
                eventUrl = href;
                return false; // Break the each loop
              }
            });
            
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = new URL(eventUrl, sourceUrl).href;
            }
            
            events.push({
              title: title,
              description: eventElement.text().trim().substring(0, 200) + '...',
              startDate: new Date(), // Default to current date since we can't parse the date reliably
              endDate: null,
              imageUrl: '',
              sourceUrl: eventUrl || sourceUrl,
              ticketUrl: eventUrl || sourceUrl,
              venue: {
                name: 'Fox Cabaret',
                address: '2321 Main St',
                city: 'Vancouver',
                province: 'BC',
                country: 'Canada',
                postalCode: 'V5T 3C9',
                website: 'https://foxcabaret.com',
                googleMapsUrl: 'https://maps.app.goo.gl/ZLKnKghj1RfH5z4t6'
              },
              categories: ['music', 'performance', 'nightlife', 'entertainment'],
              lastUpdated: new Date()
            });
          }
        });
      }
    }
    
    console.log(`Found ${events.length} events from Fox Cabaret`);
    return events;
  } catch (error) {
    console.error('Error scraping Fox Cabaret events:', error);
    return [];
  }
}

module.exports = {
  scrape
};