const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * MTELUS Concert Venue Events Scraper
 * Major concert venue in Montreal
 */
class MTELUSEvents {
    constructor() {
        this.name = 'MTELUS';
        this.baseUrl = 'https://mtelus.com';
        this.eventsUrl = 'https://www.livenation.com/venue/KovZpZAFFEnA/mtelus-events';
        this.source = 'mtelus';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    getDefaultCoordinates() {
        return { latitude: 45.5088, longitude: -73.5563 }; // Montreal coordinates
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            
            // Handle various date formats from LiveNation
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: 'MTELUS',
            address: '59 Sainte-Catherine St E, Montreal, QC',
            city: this.city,
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title from various possible selectors
        const title = this.cleanText(
            $event.find('h3, h4, .event-name, .artist-name, .title').first().text() ||
            $event.find('a[href*="/event/"]').first().text() ||
            $event.text().split('\n')[0]
        );

        if (!title || title.length < 3) return null;

        // Extract date
        const dateText = this.cleanText(
            $event.find('.date, .event-date, time, [datetime]').first().text() ||
            $event.find('.event-date').attr('datetime')
        );
        const eventDate = this.parseDate(dateText);
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `https://www.livenation.com${eventUrl}`) : this.eventsUrl;
        
        const venue = this.extractVenueInfo();

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: `${title} at MTELUS Montreal`,
            date: eventDate || new Date(),
            venue: { name: venue.name, city: 'Montreal' },  // FIX: Use venue.name (string) not venue (object)
            city: this.city,
            province: this.province,
            price: 'Check Ticketmaster for pricing',
            category: 'Concert',
            source: this.source,
            url: fullUrl,
            scrapedAt: new Date()
        };
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

            // Look for event containers on LiveNation site
            const eventSelectors = [
                '.event-card',
                '.event-item',
                '.show-card',
                '.listing-item',
                '[data-event-id]',
                '.event-listing',
                'article'
            ];

            let eventElements = $();
            eventSelectors.forEach(selector => {
                const found = $(selector);
                if (found.length > 0) {
                    eventElements = eventElements.add(found);
                }
            });

            // Fallback: look for any elements containing event-like content
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return text.includes('2024') || text.includes('2025') || 
                           $(this).find('a[href*="/event/"]').length > 0;
                });
            }

            console.log(`✅ Found ${eventElements.length} potential event elements`);

            eventElements.each((index, element) => {
                try {
                    const eventData = this.extractEventDetails($, element);
                    if (eventData && eventData.name) {
                        events.push(eventData);
                        console.log(`✅ Extracted: ${eventData.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} unique events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase().trim()}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async getEvents(startDate = null, endDate = null) {
        const events = await this.scrapeEvents();
        if (!startDate && !endDate) return filterEvents(events);

        return events.filter(event => {
            if (!event.date) return true;
            const eventDate = new Date(event.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
        });
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new MTELUSEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

