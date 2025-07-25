const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Complexe Sky Montreal Events Scraper
 * Scrapes events from Complexe Sky - Popular Montreal nightlife venue
 * URL: https://complexesky.com
 */
class ComplexeSkyEvents {
    constructor() {
        this.baseUrl = 'https://complexesky.com';
        this.eventsUrl = 'https://complexesky.com/events';
        this.source = 'Complexe Sky';
        this.city = 'Montreal';
        this.province = 'QC';
    }

    /**
     * Get default coordinates for Complexe Sky
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 45.5017,
            longitude: -73.5673
        };
    }

    /**
     * Parse date from various formats
     * @param {string} dateStr - Date string to parse
     * @returns {Date} Parsed date
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            const cleanDateStr = dateStr.trim();
            
            // Handle ISO date format
            const isoMatch = cleanDateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return new Date(isoMatch[1]);
            }
            
            // Handle various date formats
            const datePatterns = [
                /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,  // "December 15, 2024"
                /(\d{1,2})\s+(\w+)\s+(\d{4})/,     // "15 December 2024"
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/,   // "12/15/2024"
                /(\d{4})\/(\d{1,2})\/(\d{1,2})/    // "2024/12/15"
            ];
            
            for (const pattern of datePatterns) {
                const match = cleanDateStr.match(pattern);
                if (match) {
                    const parsedDate = new Date(cleanDateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate;
                    }
                }
            }
            
            // Try direct parsing
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return null;
        }
    }

    /**
     * Clean and standardize text
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        return text.trim()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .replace(/\t+/g, ' ')
            .trim();
    }

    /**
     * Extract venue information
     * @returns {Object} Venue information
     */
    extractVenueInfo() {
        return {
            name: 'Complexe Sky',
            address: '1474 Rue Sainte-Catherine E, Montreal, QC H2L 2J3',
            city: 'Montreal',
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    /**
     * Extract event details from event element
     * @param {Object} $ - Cheerio object
     * @param {Object} eventElement - Event element
     * @returns {Object} Event details
     */
    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        
        // Extract title
        const title = this.cleanText(
            $event.find('h1, h2, h3, h4, .title, .event-title, .name, .artist').first().text() ||
            $event.find('a').first().text()
        );
        
        if (!title || title.length < 3) return null;
        
        // Extract date
        const dateText = $event.find('.date, .event-date, .when, time, .start-date, .show-date').first().text();
        const eventDate = this.parseDate(dateText);
        
        // Extract description
        const description = this.cleanText(
            $event.find('.description, .summary, .excerpt, .content, p').first().text()
        );
        
        // Extract price
        const priceText = $event.find('.price, .cost, .ticket-price, .admission').text();
        const price = priceText ? this.cleanText(priceText) : 'Check website for pricing';
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        // Extract image
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        // Get venue info
        const venue = this.extractVenueInfo();
        
        // Determine category based on title/description
        let category = 'Nightlife';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('party')) {
            category = 'Party';
        } else if (titleLower.includes('concert') || titleLower.includes('music')) {
            category = 'Music';
        } else if (titleLower.includes('dj')) {
            category = 'DJ';
        } else if (titleLower.includes('dance')) {
            category = 'Dance';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Complexe Sky`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: price,
            category: category,
            source: this.source,
            url: fullEventUrl,
            image: fullImageUrl,
            scrapedAt: new Date()
        };
    }

    /**
     * Scrape events from Complexe Sky
     * @returns {Array} Array of event objects
     */
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
            
            // Look for common event selectors
            const eventSelectors = [
                '.event',
                '.event-item',
                '.event-card',
                '.show',
                '.show-item',
                '.listing',
                '.upcoming-event',
                '.party',
                '.night',
                '.card',
                '.post'
            ];
            
            let eventElements = $();
            for (const selector of eventSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    eventElements = elements;
                    console.log(`✅ Found ${elements.length} events using selector: ${selector}`);
                    break;
                }
            }
            
            if (eventElements.length === 0) {
                console.log('⚠️  No events found with standard selectors, trying alternative approach...');
                
                // Try finding events by looking for elements with dates or party names
                eventElements = $('[class*="event"], [class*="show"], [class*="party"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('2024') || text.includes('2025') || 
                           text.includes('party') || text.includes('night') ||
                           text.includes('december') || text.includes('january');
                });
            }
            
            console.log(`📅 Processing ${eventElements.length} potential events...`);
            
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
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Headers:`, error.response.headers);
            }
            return [];
        }
    }

    /**
     * Remove duplicate events based on name and date
     * @param {Array} events - Array of events
     * @returns {Array} Array of unique events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name}-${event.date}`.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Get events with date filtering
     * @param {Date} startDate - Start date filter
     * @param {Date} endDate - End date filter
     * @returns {Array} Filtered events
     */
    async getEvents(startDate = null, endDate = null) {
        const events = await this.scrapeEvents();
        
        if (!startDate && !endDate) {
            return events;
        }
        
        return events.filter(event => {
            if (!event.date) return true;
            
            const eventDate = new Date(event.date);
            
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            
            return true;
        });
    }
}

module.exports = ComplexeSkyEvents;

// Test the scraper if run directly
if (require.main === module) {
    const scraper = new ComplexeSkyEvents();
    scraper.scrapeEvents().then(events => {
        console.log(`\n📊 Total events found: ${events.length}`);
        events.slice(0, 3).forEach(event => {
            console.log(`\n🌃 ${event.name}`);
            console.log(`📅 Date: ${event.date}`);
            console.log(`📍 Venue: ${event.venue.name}`);
            console.log(`💰 Price: ${event.price}`);
            console.log(`🔗 URL: ${event.url}`);
        });
    });
}
