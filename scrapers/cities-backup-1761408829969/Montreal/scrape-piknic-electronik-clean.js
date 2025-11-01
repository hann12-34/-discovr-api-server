const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Piknic Électronik Event Scraper
 * Major outdoor electronic music festival at Parc Jean-Drapeau
 * Website: https://piknicelectronik.com/en
 */
class PiknicElektronikEvents {
    constructor() {
        this.name = 'Piknic Électronik';
        this.eventsUrl = 'https://piknicelectronik.com/en/events';
        this.source = 'piknic-electronik';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
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
            $('.event, .event-item, .festival-event, article, .card').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .when').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Piknic Électronik`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Parc Jean-Drapeau',
                            address: '1 Circuit Gilles Villeneuve, Montreal, QC H3C 1A9',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5050,
                            longitude: -73.5344
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Festival',
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
            return new Date(dateStr);
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
  const scraper = new PiknicElektronikEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

