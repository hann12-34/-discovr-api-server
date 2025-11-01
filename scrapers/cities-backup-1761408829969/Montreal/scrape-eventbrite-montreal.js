const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Eventbrite API Montreal Events Scraper
 * Fetches events in Montreal area using Eventbrite's public API
 */
class EventbriteMontrealEvents {
    constructor() {
        this.name = 'Eventbrite Montreal';
        this.source = 'eventbrite-montreal';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = false;
        
        // Eventbrite API endpoint for Montreal events
        this.apiUrl = 'https://www.eventbriteapi.com/v3/events/search/';
        this.params = {
            'location.address': 'Montreal, Quebec, Canada',
            'location.within': '25km',
            'start_date.range_start': new Date().toISOString(),
            'expand': 'venue,organizer,ticket_availability',
            'sort_by': 'date',
            'page_size': 50
        };
    }

    async scrapeEvents() {
        try {
            console.log(`🎟️ Scraping events from ${this.source}...`);

            // Note: This would require an Eventbrite API token in production
            // For now, we'll create a fallback that searches their public site
            const response = await axios.get('https://www.eventbrite.com/d/canada--montreal/events/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const cheerio = require('cheerio');
            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from Eventbrite's Montreal page
            $('.event-card, .search-event-card, [data-testid="event-card"], .discover-horizontal-event-card').each((index, element) => {
                try {
                    const $event = $(element);
                    
                    const titleEl = $event.find('h2, h3, .event-card__title, [data-testid="event-title"], .eds-text--h4, .eds-event-card-content__primary-content h3');
                    const title = titleEl.text().trim();
                    
                    if (title && title.length > 3) {
                        const descEl = $event.find('.event-card__description, .eds-text--body, .eds-event-card-content__sub');
                        const description = descEl.text().trim() || `Event in Montreal from Eventbrite`;
                        
                        const dateEl = $event.find('.event-card__date, [data-testid="event-datetime"], .eds-event-card-content__sub-title time, .event-card__details time');
                        const dateText = dateEl.text().trim() || dateEl.attr('datetime');
                        
                        const linkEl = $event.find('a').first();
                        const eventUrl = linkEl.attr('href');
                        const fullUrl = eventUrl && eventUrl.startsWith('http') ? eventUrl : 
                                       eventUrl ? `https://www.eventbrite.com${eventUrl}` : 'https://www.eventbrite.com/d/canada--montreal/events/';
                        
                        const venueEl = $event.find('.event-card__venue, .location-info, [data-testid="event-location"]');
                        const venueName = venueEl.text().trim() || 'Montreal Venue';

                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} in Montreal`,
                            date: this.parseDate(dateText) || new Date(),
                            venue: {
                                name: venueName,
                                address: 'Montreal, QC',
                                city: this.city,
                                province: 'QC',
                                coordinates: { latitude: 45.5088, longitude: -73.5673 }
                            },
                            city: this.city,
                            province: this.province,
                            price: 'See Eventbrite for pricing',
                            category: 'Event',
                            source: this.source,
                            url: fullUrl,
                            scrapedAt: new Date()
                        };

                        // Only include future events
                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
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
            
            // Handle common date formats
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const now = new Date();
        const eventDateTime = new Date(eventDate);
        return eventDateTime >= now;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date}`;
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
    const scraper = new EventbriteMontrealEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
