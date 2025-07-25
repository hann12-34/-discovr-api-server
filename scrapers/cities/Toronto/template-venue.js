/**
 * Scraper for [VENUE_NAME] in Toronto
 * 
 * This scraper extracts event data from [VENUE_WEBSITE]
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class TorontoVenueEvents {
    constructor() {
        this.venueName = '[VENUE_NAME]';
        this.venueId = '[VENUE_ID]'; // e.g., 'massey-hall'
        this.baseUrl = 'https://www.example.com';
        this.eventsUrl = 'https://www.example.com/events';
        this.city = 'Toronto';
        this.province = 'ON';
        this.country = 'Canada';
    }

    /**
     * Fetch and parse events
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName}...`);
            
            // Make HTTP request to the events page
            const response = await axios.get(this.eventsUrl);
            
            // Check if response is valid
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            // Parse HTML content
            const $ = cheerio.load(response.data);
            
            // Array to store all events
            const events = [];
            
            // Select event elements from the page
            // CUSTOMIZE THIS SELECTOR based on the venue's HTML structure
            $('.event-item').each((index, element) => {
                try {
                    // Extract data from the element
                    const name = $(element).find('.event-title').text().trim();
                    const dateString = $(element).find('.event-date').text().trim();
                    const startDate = this.parseDate(dateString);
                    const url = $(element).find('.event-link').attr('href');
                    const fullUrl = this.normalizeUrl(url);
                    const imageUrl = $(element).find('.event-image').attr('src');
                    const fullImageUrl = this.normalizeUrl(imageUrl);
                    
                    // Skip events without required data
                    if (!name || !startDate) {
                        console.log(`⚠️ Skipping event with missing data: ${name || 'Unnamed event'}`);
                        return;
                    }
                    
                    // Create event object
                    const event = {
                        id: uuidv4(),
                        name: name,
                        startDate: startDate,
                        endDate: startDate, // Set end date same as start date if not available
                        venue: {
                            name: this.venueName,
                            id: this.venueId,
                            url: this.baseUrl,
                            address: {
                                street: '', // Add venue address details
                                city: this.city,
                                province: this.province,
                                country: this.country
                            }
                        },
                        url: fullUrl,
                        imageUrl: fullImageUrl,
                        price: this.extractPrice($(element).find('.event-price').text().trim()),
                        source: this.venueName,
                        scrapeDate: new Date().toISOString(),
                        // Add city data for categorization in the app
                        city: this.city,
                        province: this.province,
                        country: this.country,
                        // Add category for Toronto
                        categories: ['Toronto']
                    };
                    
                    events.push(event);
                    
                } catch (err) {
                    console.error(`❌ Error parsing event ${index} from ${this.venueName}:`, err.message);
                }
            });
            
            console.log(`✅ Successfully scraped ${events.length} events from ${this.venueName}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            return [];
        }
    }
    
    /**
     * Parse date string into ISO format
     * @param {string} dateString - Date string from venue website
     * @returns {string} ISO date string or null if parsing failed
     */
    parseDate(dateString) {
        try {
            // CUSTOMIZE THIS FUNCTION based on the venue's date format
            // Example: "July 15, 2025 at 8:00 PM"
            const date = new Date(dateString);
            return date.toISOString();
        } catch (error) {
            console.error(`❌ Error parsing date "${dateString}":`, error.message);
            return null;
        }
    }
    
    /**
     * Normalize URL (convert relative to absolute)
     * @param {string} url - URL from venue website
     * @returns {string} Normalized URL
     */
    normalizeUrl(url) {
        if (!url) return '';
        
        // If URL is already absolute, return as is
        if (url.startsWith('http')) {
            return url;
        }
        
        // If URL is relative, append base URL
        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    
    /**
     * Extract price from price string
     * @param {string} priceString - Price string from venue website
     * @returns {object} Price object with min and max values
     */
    extractPrice(priceString) {
        // CUSTOMIZE THIS FUNCTION based on the venue's price format
        // Example: "$25 - $50"
        if (!priceString || priceString.toLowerCase().includes('free')) {
            return {
                min: 0,
                max: 0,
                currency: 'CAD'
            };
        }
        
        try {
            const prices = priceString
                .replace(/[^0-9.-]/g, ' ')
                .trim()
                .split(/\s+/)
                .map(p => parseFloat(p))
                .filter(p => !isNaN(p))
                .sort((a, b) => a - b);
            
            return {
                min: prices[0] || 0,
                max: prices[prices.length - 1] || 0,
                currency: 'CAD'
            };
        } catch (error) {
            console.error(`❌ Error parsing price "${priceString}":`, error.message);
            return {
                min: 0,
                max: 0,
                currency: 'CAD'
            };
        }
    }
}

module.exports = TorontoVenueEvents;
