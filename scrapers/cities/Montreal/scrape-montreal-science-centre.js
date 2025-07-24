const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Montreal Science Centre Events Scraper
 * Scrapes events from Montreal Science Centre
 * URL: https://montrealsciencecentre.com
 */
class MontrealScienceCentreEvents {
    constructor() {
        this.baseUrl = 'https://www.montrealsciencecentre.com';
        this.eventsUrl = 'https://www.montrealsciencecentre.com/special-events';
        this.source = 'Montreal Science Centre';
        this.city = 'Montreal';
        this.province = 'QC';
    }

    /**
     * Get default coordinates for Montreal Science Centre
     * @returns {Object} Default coordinates
     */
    getDefaultCoordinates() {
        return {
            latitude: 45.5016,
            longitude: -73.5650
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
     * Extract venue information
     * @returns {Object} Venue information
     */
    extractVenueInfo() {
        return {
            name: 'Montreal Science Centre',
            address: '2 Rue de la Commune O, Montreal, QC H2Y 4B2',
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
            $event.find('h1, h2, h3, h4, .title, .event-title, .name, .exhibit-title').first().text() ||
            $event.find('a').first().text()
        );
        
        if (!title || title.length < 3) return null;
        
        // Extract date
        const dateText = $event.find('.date, .event-date, .when, time, .start-date').first().text();
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
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || `${title} at Montreal Science Centre`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: price,
            category: 'Science & Education',
            source: this.source,
            url: fullEventUrl,
            image: fullImageUrl,
            scrapedAt: new Date()
        };
    }

    /**
     * Scrape events from Montreal Science Centre
     * @returns {Array} Array of event objects
     */
    async scrapeEvents() {
        try {
            console.log(`🔬 Scraping events from ${this.source}...`);
            
            const events = [];
            
            // Scrape special events
            await this.scrapeSpecialEvents(events);
            
            // Scrape IMAX theater shows
            await this.scrapeImaxShows(events);
            
            // Filter out duplicate events
            const uniqueEvents = this.removeDuplicateEvents(events);
            
            // Filter for live events only (today or future)
            const liveEvents = this.filterLiveEvents(uniqueEvents);
            
            console.log(`🎉 Successfully scraped ${liveEvents.length} unique events from ${this.source}`);
            return liveEvents;
            
        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
    
    /**
     * Scrape special events from the special events page
     * @param {Array} events - Array to push events to
     */
    async scrapeSpecialEvents(events) {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            
            // Look for event links in the special events page
            $('a').each((i, element) => {
                const $link = $(element);
                const href = $link.attr('href');
                const linkText = this.cleanText($link.text());
                
                // Check if this looks like an event link
                if (href && href.includes('/special-event/') && linkText && linkText.length > 3) {
                    // Extract date from the link context
                    const dateMatch = linkText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\.]?\s*(\d{1,2})[\s,]*(\d{4})/i);
                    const eventDate = dateMatch ? this.parseDate(dateMatch[0]) : null;
                    
                    // Extract title (remove date from title)
                    const title = linkText.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\.]?\s*(\d{1,2})[\s,]*(\d{4})/i, '').trim();
                    
                    if (title && title.length > 3) {
                        events.push({
                            id: uuidv4(),
                            title: title,
                            date: eventDate,
                            description: `Special event at ${this.source}`,
                            category: 'Science',
                            venue: this.extractVenueInfo(),
                            price: 'Check website for pricing',
                            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
                            image: null,
                            scrapedAt: new Date()
                        });
                    }
                }
            });
            
        } catch (error) {
            console.error('Error scraping special events:', error.message);
        }
    }
    
    /**
     * Scrape IMAX theater shows
     * @param {Array} events - Array to push events to
     */
    async scrapeImaxShows(events) {
        try {
            const imaxUrl = `${this.baseUrl}/imax-telus-theater`;
            const response = await axios.get(imaxUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            
            // Look for IMAX movie titles
            $('h1, h2, h3, h4').each((i, element) => {
                const $heading = $(element);
                const title = this.cleanText($heading.text());
                
                // Check if this looks like an IMAX movie title
                if (title && title.length > 3 && !title.toLowerCase().includes('theatre') && !title.toLowerCase().includes('screen')) {
                    // Skip navigation and general headings
                    if (title.toLowerCase().includes('imax') || 
                        title.toLowerCase().includes('3d') || 
                        title.toLowerCase().includes('rex') ||
                        title.toLowerCase().includes('movie') ||
                        title.toLowerCase().includes('film')) {
                        
                        events.push({
                            id: uuidv4(),
                            title: title,
                            date: null, // IMAX shows typically have multiple showtimes
                            description: `IMAX Theater show at ${this.source}`,
                            category: 'Science',
                            venue: this.extractVenueInfo(),
                            price: 'Check website for pricing',
                            url: imaxUrl,
                            image: null,
                            scrapedAt: new Date()
                        });
                    }
                }
            });
            
        } catch (error) {
            console.error('Error scraping IMAX shows:', error.message);
        }
    }
    
    /**
     * Filter events for live events only (today or future)
     * @param {Array} events - Array of events to filter
     * @returns {Array} Filtered events
     */
    filterLiveEvents(events) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return events.filter(event => {
            if (!event.date) return true; // Include events without dates
            const eventDate = new Date(event.date);
            return eventDate >= today;
        });
    }
    
    /**
     * Remove duplicate events based on title and date
     * @param {Array} events - Array of events
     * @returns {Array} Unique events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title.toLowerCase()}-${event.date ? event.date.toDateString() : 'no-date'}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    
    /**
     * Legacy scrape method for compatibility - kept for reference
     */
    async legacyScrapeEvents() {
        try {
            console.log('⚠️  Using legacy scraping method...');
            
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
                '.exhibit',
                '.exhibit-item',
                '.activity',
                '.activity-item',
                '.program',
                '.program-item',
                '.workshop',
                '.card',
                '.listing'
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
                
                // Try finding events by looking for elements with dates or exhibit names
                eventElements = $('[class*="event"], [class*="exhibit"], [class*="activity"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('2024') || text.includes('2025') || 
                           text.includes('exhibition') || text.includes('workshop') ||
                           text.includes('janvier') || text.includes('février');
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

module.exports = MontrealScienceCentreEvents;

// Test the scraper if run directly
if (require.main === module) {
    const scraper = new MontrealScienceCentreEvents();
    scraper.scrapeEvents().then(events => {
        console.log(`\n📊 Total events found: ${events.length}`);
        events.slice(0, 3).forEach(event => {
            console.log(`\n🔬 ${event.name}`);
            console.log(`📅 Date: ${event.date}`);
            console.log(`📍 Venue: ${event.venue.name}`);
            console.log(`💰 Price: ${event.price}`);
            console.log(`🔗 URL: ${event.url}`);
        });
    });
}
