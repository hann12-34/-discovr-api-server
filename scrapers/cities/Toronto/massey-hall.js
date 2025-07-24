/**
 * Scraper for Massey Hall in Toronto
 * 
 * This scraper extracts event data from Massey Hall's website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MasseyHallEvents {
    constructor() {
        this.venueName = 'Massey Hall';
        this.venueId = 'massey-hall';
        this.baseUrl = 'https://www.masseyhall.com';
        this.eventsUrl = 'https://www.masseyhall.com/events';
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
            
            const response = await axios.get(this.eventsUrl);
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Massey Hall specific selectors - adjust as needed after inspecting the actual website
            $('.event-card').each((index, element) => {
                try {
                    const name = $(element).find('.event-card__title').text().trim();
                    const dateString = $(element).find('.event-card__date').text().trim();
                    const startDate = this.parseDate(dateString);
                    const urlPath = $(element).find('a.event-card__link').attr('href');
                    const fullUrl = this.normalizeUrl(urlPath);
                    const imageUrl = $(element).find('.event-card__image img').attr('src');
                    const fullImageUrl = this.normalizeUrl(imageUrl);
                    
                    if (!name || !startDate) {
                        console.log(`⚠️ Skipping event with missing data: ${name || 'Unnamed event'}`);
                        return;
                    }
                    
                    const event = {
                        id: uuidv4(),
                        name: name,
                        startDate: startDate,
                        endDate: startDate,
                        venue: {
                            name: this.venueName,
                            id: this.venueId,
                            url: this.baseUrl,
                            address: {
                                street: '178 Victoria St',
                                city: this.city,
                                province: this.province,
                                country: this.country
                            }
                        },
                        url: fullUrl,
                        imageUrl: fullImageUrl,
                        price: this.extractPrice($(element).find('.event-card__price').text().trim()),
                        source: this.venueName,
                        scrapeDate: new Date().toISOString(),
                        // Add city data for categorization in the app
                        city: this.city,
                        province: this.province,
                        country: this.country,
                        // Add category for Toronto
                        categories: ['Toronto', 'Live Music']
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
     * @param {string} dateString - Date string from Massey Hall website
     * @returns {string} ISO date string or null if parsing failed
     */
    parseDate(dateString) {
        try {
            // Example format: "July 15, 2025 • 8:00PM"
            const cleanDateString = dateString.replace('•', '').trim();
            const date = new Date(cleanDateString);
            
            if (isNaN(date.getTime())) {
                // Fallback parsing if the standard parsing fails
                const parts = cleanDateString.split(/\s+/);
                const timePart = parts.pop(); // Get time part
                const datePart = parts.join(' '); // Join date parts back
                
                const [hour, minute] = timePart.replace('PM', '').replace('AM', '')
                    .split(':').map(n => parseInt(n));
                    
                const isPM = timePart.includes('PM');
                const dateObj = new Date(datePart);
                
                dateObj.setHours(isPM && hour < 12 ? hour + 12 : hour);
                dateObj.setMinutes(minute || 0);
                
                return dateObj.toISOString();
            }
            
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
        
        if (url.startsWith('http')) {
            return url;
        }
        
        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    
    /**
     * Extract price from price string
     * @param {string} priceString - Price string from venue website
     * @returns {object} Price object with min and max values
     */
    extractPrice(priceString) {
        if (!priceString || priceString.toLowerCase().includes('free')) {
            return {
                min: 0,
                max: 0,
                currency: 'CAD'
            };
        }
        
        try {
            // Clean and extract numeric values
            const cleanPrice = priceString.replace(/[^0-9.$-]/g, ' ').trim();
            const priceMatches = cleanPrice.match(/\$(\d+\.?\d*)/g) || [];
            
            if (priceMatches.length === 0) {
                return { min: 0, max: 0, currency: 'CAD' };
            }
            
            const prices = priceMatches
                .map(p => parseFloat(p.replace('$', '')))
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

module.exports = MasseyHallEvents;
