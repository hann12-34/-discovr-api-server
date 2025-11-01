const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Bar Datcha Events Scraper
 * Scrapes events from Bar Datcha in Montreal
 */
class BarDatchaEvents {
    constructor() {
        this.name = 'Bar Datcha';
        this.eventsUrl = 'https://bardatcha.com';
        this.source = 'bar-datcha';
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
            $('.event, .event-item, .evenement, article, .card, .post, .programme').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .titre').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .desc, .content').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .datetime').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Bar Datcha`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Bar Datcha',
                            address: '4177 Boulevard Saint-Laurent, Montreal, QC H2W 1Y7',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5278,
                            longitude: -73.5847
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Nightlife',
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
  const scraper = new BarDatchaEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
