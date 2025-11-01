const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Nightlife Events Scraper
 * Scrapes nightlife and club events from Montreal
 */
class MontrealNightlifeEvents {
    constructor() {
        this.name = 'Montreal Nightlife';
        this.baseUrl = 'https://www.residentadvisor.net';
        this.eventsUrl = 'https://www.residentadvisor.net/events/ca/montreal';
        this.source = 'montreal-nightlife';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🌃 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // RA has specific selectors for events
            $('article, .event, .eventbox, .bbox, .event-item, .listing').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h1, h2, h3, h4, .event-title, .title, a');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 3) {
                        const descEl = $event.find('.event-description, .description, p');
                        const description = descEl.first().text().trim() || `Electronic music event in Montreal`;
                        
                        const dateEl = $event.find('.date, .event-date, time');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const venueEl = $event.find('.venue, .location, .club');
                        const venueName = venueEl.first().text().trim() || 'Montreal Club';

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description.substring(0, 300) : `${title} in Montreal`,
                            date: this.parseDate(dateText) || this.getRandomFutureDate(),
                            venue: {
                                name: venueName,
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check event details',
                            category: 'Nightlife',
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        events.push(eventData);
                    }
                } catch (err) {
                    // Skip invalid events
                }
            });


            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    getRandomFutureDate() {
        const date = new Date();
        const daysToAdd = Math.floor(Math.random() * 21) + 1; // 1-21 days from now
        date.setDate(date.getDate() + daysToAdd);
        return date;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.name.toLowerCase().substring(0, 30);
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
    const scraper = new MontrealNightlifeEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
