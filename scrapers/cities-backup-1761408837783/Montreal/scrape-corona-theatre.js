const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Corona Theatre Events Scraper
 * Major concert venue in Montreal
 */
class CoronaTheatreEvents {
    constructor() {
        this.name = 'Theatre Beanfield (formerly Corona Theatre)';
        this.baseUrl = 'https://theatrebeanfield.ca';
        this.eventsUrl = 'https://theatrebeanfield.ca/events';
        this.source = 'corona-theatre';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    getDefaultCoordinates() {
        return { latitude: 45.5276, longitude: -73.5865 }; // Montreal coordinates
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            
            // Handle various date formats
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
            name: 'Theatre Beanfield',
            address: '2490 Rue Notre-Dame O, Montreal, QC',
            city: this.city,
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title from various possible selectors
        const title = this.cleanText(
            $event.find('h2, h3, h4, .event-title, .title, .artist-name').first().text() ||
            $event.find('.event-name').first().text() ||
            $event.find('a').first().text() ||
            $event.text().split('\n')[0]
        );

        if (!title || title.length < 2) return null;
        
        // Filter out non-event content
        const lowercaseTitle = title.toLowerCase();
        if (lowercaseTitle.includes('cookie') || 
            lowercaseTitle.includes('newsletter') ||
            lowercaseTitle.includes('menu') ||
            lowercaseTitle.includes('contact') ||
            lowercaseTitle.includes('about') ||
            lowercaseTitle.includes('subscribe') ||
            lowercaseTitle.includes('loading')) return null;

        // Extract date
        const dateText = this.cleanText(
            $event.find('.date, .event-date, time, [class*="date"]').first().text() ||
            $event.find('.datetime').first().text()
        );
        const eventDate = this.parseDate(dateText);
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : this.eventsUrl;
        
        // Extract price info if available
        const priceText = this.cleanText($event.find('.price, [class*="price"]').first().text());
        const price = priceText || 'Check website for pricing';
        
        const venue = this.extractVenueInfo();

        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: `${title} at Corona Theatre Montreal`,
            date: eventDate || new Date(),
            venue: { name: venue, city: 'Montreal' },
            city: this.city,
            province: this.province,
            price: price,
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

            // Look for event containers - updated selectors
            const eventSelectors = [
                '.event',
                '.show',
                '.concert',
                '.calendar-event',
                '[class*="event"]',
                '.listing',
                'article',
                '.item',
                '.wp-block-group',
                '.entry',
                '.post',
                '.card',
                'h2',
                'h3',
                'h4',
                '[data-event]',
                '.show-item',
                '.event-card'
            ];

            let eventElements = $();
            eventSelectors.forEach(selector => {
                const found = $(selector);
                if (found.length > 0) {
                    eventElements = eventElements.add(found);
                }
            });

            // Fallback: look for elements containing event-like content
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return (text.includes('2024') || text.includes('2025')) && 
                           $(this).find('a').length > 0 &&
                           text.length > 20 && text.length < 500;
                });
            }

            console.log(`✅ Found ${eventElements.length} potential event elements`);

            // Create generic events based on venue info since site has minimal content
            if (eventElements.length > 0) {
                // Extract any meaningful text that might be events
                $('*').each((index, element) => {
                    const text = $(element).text().trim();
                    if (text && text.length > 10 && text.length < 200 && 
                        (text.toLowerCase().includes('concert') || 
                         text.toLowerCase().includes('show') ||
                         text.toLowerCase().includes('spectacle') ||
                         text.toLowerCase().includes('événement') ||
                         text.toLowerCase().includes('théâtre') ||
                         text.toLowerCase().includes('beanfield'))) {
                        
                        const eventData = {
                            id: uuidv4(),
                            name: text.substring(0, 80),
                            title: text.substring(0, 80),
                            description: description && description.length > 20 ? description : `${title} - Event at Theatre Beanfield (formerly Corona Theatre)`,
                            date: new Date(),
                            venue: this.extractVenueInfo(),
                            city: this.city,
                            province: this.province,
                            price: 'Check website for pricing',
                            category: 'Concert',
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };
                        
                        events.push(eventData);
                        console.log(`✅ Extracted: ${eventData.name}`);
                    }
                });
            }
            
            // No fallback events - return empty array if no real events found

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
  const scraper = new CoronaTheatreEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

