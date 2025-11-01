const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class LeBelmontEvents {
    constructor() {
        this.name = 'Le Belmont';
        this.eventsUrl = 'https://www.lebelmont.com/evenements';
        this.source = 'le-belmont';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = false; // Domain no longer active
    }

    async scrapeEvents() {
        try {
            if (!this.enabled) {
                console.log(`${this.name} scraper is disabled - domain no longer active`);
                return [];
            }

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            $('.event, .evenement, .soiree, article, .card, .listing').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details, .content').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .when').first().text().trim();
                    
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Le Belmont`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Le Belmont',
                            address: '4483 Boulevard Saint-Laurent, Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5288,
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
  const scraper = new LeBelmontEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
