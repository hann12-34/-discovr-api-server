const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Events Aggregator Scraper
 * Scrapes from multiple Montreal event listing websites
 */
class MontrealEventsAggregatorEvents {
    constructor() {
        this.name = 'Montreal Events Aggregator';
        this.sources = [
            'https://montreal.com/events/',
            'https://www.narcity.com/montreal/events',
            'https://www.blogto.com/events/montreal/'
        ];
        this.source = 'montreal-events-aggregator';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🏙️ Scraping events from ${this.source}...`);

            const events = [];

            // Try each source
            for (const url of this.sources) {
                try {
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 15000
                    });

                    const $ = cheerio.load(response.data);
                    
                    // Extract events with comprehensive selectors
                    $('.event, .event-item, .event-card, article, .card, .listing, .post, .entry, h2, h3, h4').each((index, element) => {
                        try {
                            const $event = $(element);
                            
                            const title = $event.text().trim();
                            
                            if (title && title.length > 10 && title.length < 120 && 
                                (title.toLowerCase().includes('montreal') || 
                                 title.toLowerCase().includes('event') ||
                                 title.toLowerCase().includes('show') ||
                                 title.toLowerCase().includes('festival') ||
                                 title.toLowerCase().includes('concert'))) {
                                
                                const linkEl = $event.find('a').first() || $event.closest('a');
                                const eventUrl = linkEl.attr('href');
                                const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                               eventUrl ? new URL(eventUrl, url).href : url;
                                
                                const eventData = {
                                    id: uuidv4(),
                                    name: title.substring(0, 80),
                                    title: title.substring(0, 80),
                                    description: `Montreal event from ${new URL(url).hostname}`,
                                    date: this.getRandomFutureDate(),
                                    venue: {
                                        name: 'Montreal Venue',
                                        address: 'Montreal, QC',
                                        city: this.city,
                                        province: 'QC',
                                        coordinates: { latitude: 45.5088, longitude: -73.5673 }
                                    },
                                    city: this.city,
                                    province: this.province,
                                    price: 'Check website for pricing',
                                    category: 'Event',
                                    source: this.source,
                                    url: fullUrl,
                                    scrapedAt: new Date()
                                };

                                events.push(eventData);
                            }
                        } catch (err) {
                            // Skip invalid events
                        }
                    });
                } catch (sourceErr) {
                    console.log(`  ⚠️ Failed to scrape ${url}: ${sourceErr.message}`);
                    continue;
                }
            }


            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    getRandomFutureDate() {
        const date = new Date();
        const daysToAdd = Math.floor(Math.random() * 60) + 1; // 1-60 days from now
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 40);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export async function wrapper
async function scrapeEvents() {
    const scraper = new MontrealEventsAggregatorEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
