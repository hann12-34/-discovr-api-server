const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class LeBalconEvents {
    constructor() {
        this.name = 'Le Balcon';
        this.eventsUrl = 'https://lebalcon.ca/events';
        this.source = 'lebalcon';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            $('.event, .event-item, .event-card, .show, .party, .listing, .card').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Le Balcon`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Le Balcon',
                            address: 'Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5088,
                            longitude: -73.5878
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
                    console.log(`Error extracting event ${index + 1}:`, error.message);
                }
            });

            return filterEvents(events);
        } catch (error) {
            console.error(`Error scraping ${this.source}:`, error.message);
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
  const scraper = new LeBalconEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
