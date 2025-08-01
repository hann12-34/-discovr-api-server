const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Vieux-Montréal Events Scraper
 * Scrapes events from Vieux-Montréal (Old Montreal) website
 * URL: https://vieuxmontreal.ca
 */
class VieuxMontrealEvents {
    constructor() {
        this.baseUrl = 'https://vieuxmontreal.ca';
        this.eventsUrl = 'https://vieuxmontreal.ca/en/events';
        this.source = 'Vieux-Montréal';
        this.city = 'Montreal';
        this.province = 'QC';
    }

    /**
     * Get default coordinates for Old Montreal
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 45.5086,
            longitude: -73.5539
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
            
            // Handle French date formats
            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };
            
            let englishDateStr = cleanDateStr;
            for (const [french, english] of Object.entries(frenchMonths)) {
                englishDateStr = englishDateStr.replace(new RegExp(french, 'gi'), english);
            }
            
            // Handle various date formats
            const datePatterns = [
                /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,  // "December 15, 2024"
                /(\d{1,2})\s+(\w+)\s+(\d{4})/,     // "15 December 2024"
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/,   // "12/15/2024"
                /(\d{4})\/(\d{1,2})\/(\d{1,2})/    // "2024/12/15"
            ];
            
            for (const pattern of datePatterns) {
                const match = englishDateStr.match(pattern);
                if (match) {
                    const parsedDate = new Date(englishDateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate;
                    }
                }
            }
            
            // Try direct parsing
            const parsedDate = new Date(englishDateStr);
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
     * Extract venue information from event element
     * @param {Object} $ - Cheerio object
     * @param {Object} eventElement - Event element
     * @returns {Object} Venue information
     */
    extractVenueInfo($, eventElement) {
        const $event = $(eventElement);
        
        // Try to extract venue name
        const venueText = this.cleanText(
            $event.find('.venue, .location, .place, .lieu').first().text() ||
            $event.find('.address').first().text()
        );
        
        // Try to extract address
        const addressText = this.cleanText(
            $event.find('.address, .location, .adresse').first().text()
        );
        
        return {
            name: venueText || 'Old Montreal',
            address: addressText || 'Old Montreal, QC',
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
            $event.find('h1, h2, h3, h4, .title, .event-title, .name, .titre').first().text() ||
            $event.find('a').first().text()
        );
        
        if (!title || title.length < 3) return null;
        
        // Extract date
        const dateText = $event.find('.date, .event-date, .when, time, .start-date, .date-debut').first().text();
        const eventDate = this.parseDate(dateText);
        
        // Extract description
        const description = this.cleanText(
            $event.find('.description, .summary, .excerpt, .content, p, .resume').first().text()
        );
        
        // Extract price
        const priceText = $event.find('.price, .cost, .ticket-price, .admission, .prix').text();
        const price = priceText ? this.cleanText(priceText) : 'Free/Varies';
        
        // Extract event URL
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : `${this.baseUrl}${eventUrl}`) : null;
        
        // Extract image
        const imageUrl = $event.find('img').first().attr('src');
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`) : null;
        
        // Get venue info
        const venue = this.extractVenueInfo($, eventElement);
        
        // Determine category based on title/description
        let category = 'Culture & Heritage';
        const titleLower = title.toLowerCase();
        if (titleLower.includes('festival') || titleLower.includes('fête')) {
            category = 'Festival';
        } else if (titleLower.includes('tour') || titleLower.includes('visite')) {
            category = 'Tour';
        } else if (titleLower.includes('market') || titleLower.includes('marché')) {
            category = 'Market';
        } else if (titleLower.includes('exhibition') || titleLower.includes('exposition')) {
            category = 'Exhibition';
        }
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} in Old Montreal`,
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
     * Scrape events from Vieux-Montréal
     * @returns {Array} Array of event objects
     */
    async scrapeEvents() {
        try {
            console.log(`🏛️ Scraping events from ${this.source}...`);
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Check if website is being rebuilt
            const bodyText = $('body').text().toLowerCase();
            if (bodyText.includes('nouvelle ère') || bodyText.includes('repassez nous voir') || bodyText.includes('coming soon')) {
                console.log('⚠️  Website is being rebuilt/updated - no events available currently');
                return [];
            }
            
            // Look for common event selectors
            const eventSelectors = [
                '.event',
                '.event-item',
                '.event-card',
                '.activity',
                '.activity-item',
                '.listing',
                '.evenement',
                '.activite',
                '.programme',
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
                
                // Try finding events by looking for elements with dates or activity names
                eventElements = $('[class*="event"], [class*="activity"], [class*="evenement"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('2024') || text.includes('2025') || 
                           text.includes('festival') || text.includes('exhibition') ||
                           text.includes('décembre') || text.includes('janvier') ||
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

module.exports = VieuxMontrealEvents;

// Test runner
if (require.main === module) {
    async function testScraper() {
        const scraper = new VieuxMontrealEvents();
        const events = await scraper.scrapeEvents();
        console.log('\n' + '='.repeat(50));
        console.log('VIEUX-MONTRÉAL EVENTS TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Found ${events.length} events`);
        
        events.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Date: ${event.date ? event.date.toDateString() : 'TBD'}`);
            console.log(`   Category: ${event.category}`);
            console.log(`   Venue: ${event.venue.name}`);
            if (event.url) console.log(`   URL: ${event.url}`);
        });
    }
    
    testScraper();
}
