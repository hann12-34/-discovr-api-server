const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class ArtsCommonsScraper {
    constructor() {
        this.source = 'Arts Commons';
        this.baseUrl = 'https://arts-commons.com';
        this.eventsUrl = 'https://arts-commons.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Try multiple selectors for events
            const eventSelectors = [
                '.event-card',
                '.event-item',
                'article',
                '[class*="event"]',
                'a[href*="/events/"]'
            ];
            
            eventSelectors.forEach(selector => {
                $(selector).each((i, el) => {
                    const $el = $(el);
                    
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
                    if (!title) title = $el.find('a').first().text().trim();
                    
                    if (!title || title.length < 3) return;
                    
                    const link = $el.find('a').first().attr('href') || $el.attr('href');
                    const url = link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl;
                    
                    const dateText = $el.find('.date, time, [class*="date"]').first().text().trim();
                    
                    events.push({
                        id: uuidv4(),
                        title,
                        date: dateText || null,
                        url,
                        venue: { name: this.source, city: this.city },
                        location: `${this.city}, ${this.province}`,
                        category: 'Arts & Culture',
                        city: this.city,
                        source: 'arts-commons',
                        description: `${title} at Arts Commons Calgary`
                    });
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
            
            console.log(`✅ Found ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;
            
        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new ArtsCommonsScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

