const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class SaddledomeScraper {
    constructor() {
        this.source = 'Scotiabank Saddledome';
        this.baseUrl = 'https://www.scotiabanksaddledome.com';
        this.eventsUrl = 'https://www.scotiabanksaddledome.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://www.scotiabanksaddledome.com/events/');
            const $ = cheerio.load(response.data);
            const events = [];

            // Use more specific selectors for actual event cards/items
            const eventSelectors = [
                '.event-card',
                '.event-item',
                'article.event',
                '[class*="EventCard"]',
                '.tribe-events-list-event',
                'article[class*="event"]'
            ];
            
            let foundEvents = false;
            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $element = $(element);
                    
                    // Get title from heading or strong text
                    let title = $element.find('h1, h2, h3, h4, .event-title, .title').first().text().trim();
                    if (!title) title = $element.find('strong, .name').first().text().trim();
                    
                    if (!title || title.length < 5) return;
                    
                    // CRITICAL: Filter out UI elements and non-event text
                    const titleLower = title.toLowerCase();
                    const invalidKeywords = [
                        'details', 'view details', 'more info', 'buy tickets',
                        'calendar', 'filter', 'search', 'menu', 'navigation',
                        'live music', 'upcoming', 'past events', 'all events'
                    ];
                    
                    // Check if title is just a date (e.g., "February 11, 2026", "December 19, 2...")
                    const isDateOnly = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(title);
                    
                    if (invalidKeywords.some(kw => titleLower.includes(kw)) || isDateOnly || titleLower === 'details') {
                        return; // Skip this one
                    }
                    
                    const link = $element.find('a').first().attr('href') || $element.attr('href');
                    const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();
                    const description = $element.find('p, .description').first().text().trim();
                    
                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description || `${title} at Scotiabank Saddledome`,
                        date: dateText || null,
                        venue: { name: this.source, address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1', city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        category: 'Sports & Entertainment',
                        source: 'saddledome',
                        url: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
                        slug: slugify(title, { lower: true })
                    });
                    foundEvents = true;
                });
            });
            
            // Remove duplicates
            const uniqueEvents = [];
            const seen = new Set();
            events.forEach(event => {
                const key = event.title.toLowerCase().substring(0, 30);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueEvents.push(event);
                }
            });

            console.log(`📅 Found ${uniqueEvents.length} events from ${this.source}`);
            return filterEvents(uniqueEvents);
        } catch (error) {
            console.log(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new SaddledomeScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

