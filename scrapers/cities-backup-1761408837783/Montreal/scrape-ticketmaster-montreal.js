const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Ticketmaster Montreal Events Scraper
 * Scrapes events from Ticketmaster's Montreal events page
 */
class TicketmasterMontrealEvents {
    constructor() {
        this.name = 'Ticketmaster Montreal';
        this.baseUrl = 'https://www.ticketmaster.ca';
        this.eventsUrl = 'https://www.ticketmaster.ca/browse/concerts-music-qc-montreal-_-tickets';
        this.source = 'ticketmaster-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎫 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Ticketmaster specific selectors
            $('[data-testid="attraction-card"], .event-card, .attraction-card, .event-listing, .search-result-item, .event-item').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h3, h4, .event-name, .attraction-name, [data-testid="attraction-name"]');
                    const title = titleEl.first().text().trim();
                    
                    if (title && title.length > 2) {
                        const venueEl = $event.find('.venue-name, .location, [data-testid="venue-name"]');
                        const venueName = venueEl.first().text().trim() || 'Montreal Venue';
                        
                        const dateEl = $event.find('.date, .event-date, time, [data-testid="event-date"]');
                        const dateText = dateEl.first().text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `${this.baseUrl}${eventUrl}` : this.eventsUrl;

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} - Live event in Montreal`,
                            date: this.parseDate(dateText) || this.getDefaultFutureDate(),
                            venue: {
                                name: venueName,
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'Check Ticketmaster for pricing',
                            category: 'Entertainment',
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
            const cleanDateStr = dateStr.trim().replace(/\s+/g, ' ');
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    getDefaultFutureDate() {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 60) + 7);
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
    const scraper = new TicketmasterMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
