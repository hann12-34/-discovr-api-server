const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * MTL.org Events Scraper
 * Scrapes events from the official Montreal tourism site
 */
class MTLOrgEvents {
    constructor() {
        this.name = 'MTL.org Events';
        this.eventsUrl = 'https://www.mtl.org/en/what-to-do/festivals-and-events';
        this.source = 'mtl-org';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = false; // Focuses on general tourism content rather than specific events
    }

    async scrapeEvents() {
        if (!this.enabled) {
            console.log(`${this.name} scraper is disabled`);
            return [];
        }

        try {
            console.log(`🎵 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event elements
            $('.event, .activity, .listing, .card, article, .result').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .name').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .summary, .excerpt').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .when, .period').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} - Official Montreal tourism site`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Various Montreal Venues',
                            address: 'Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5017,
                            longitude: -73.5673
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Tourism',
                        source: this.source,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            console.log(`🎉 Successfully scraped ${events.length} events from ${this.source}`);
            return filterEvents(events);

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            // Translate French months to English
            const frenchToEnglish = {
                'janvier': 'january', 'février': 'february', 'mars': 'march',
                'avril': 'april', 'mai': 'may', 'juin': 'june',
                'juillet': 'july', 'août': 'august', 'septembre': 'september',
                'octobre': 'october', 'novembre': 'november', 'décembre': 'december'
            };
            
            let processedDate = dateStr.toLowerCase();
            for (const [french, english] of Object.entries(frenchToEnglish)) {
                processedDate = processedDate.replace(new RegExp(french, 'gi'), english);
            }
            
            return new Date(processedDate);
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new MTLOrgEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
