/**
 * Scraper for Meridian Hall in Toronto
 * 
 * This scraper extracts event data from TO Live's Meridian Hall website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class MeridianHallEvents {
    constructor() {
        this.venueName = 'Meridian Hall';
        this.venueId = 'meridian-hall';
        this.baseUrl = 'https://www.tolive.com';
        this.eventsUrl = 'https://www.tolive.com/events?venues=Meridian%20Hall';
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
            
            // TO Live website specific selectors
            $('.c-event-card').each((index, element) => {
                try {
                    const name = $(element).find('.c-event-card__title').text().trim();
                    const dateString = $(element).find('.c-event-card__date').text().trim();
                    const startDate = this.parseDate(dateString);
                    const urlPath = $(element).find('a.c-event-card__link').attr('href');
                    const fullUrl = this.normalizeUrl(urlPath);
                    const imageUrl = $(element).find('.c-event-card__image img').attr('src');
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
                                street: '1 Front Street East',
                                city: this.city,
                                province: this.province,
                                country: this.country
                            }
                        },
                        url: fullUrl,
                        imageUrl: fullImageUrl,
                        price: this.extractPrice($(element).find('.c-event-card__price').text().trim()),
                        source: this.venueName,
                        scrapeDate: new Date().toISOString(),
                        // Add city data for categorization in the app
                        city: this.city,
                        province: this.province,
                        country: this.country,
                        // Add category for Toronto
                        categories: ['Toronto', 'Live Performance']
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
     * @param {string} dateString - Date string from TO Live website
     * @returns {string} ISO date string or null if parsing failed
     */
    parseDate(dateString) {
        try {
            // TO Live typically uses formats like: "July 15-16, 2025" or "July 15, 2025"
            // Extract the first date if it's a range
            const mainDatePart = dateString.split('-')[0].trim();
            
            // Try standard parsing first
            const date = new Date(mainDatePart);
            
            if (!isNaN(date.getTime())) {
                // Set default time to 7:00 PM if no time specified
                if (date.getHours() === 0 && date.getMinutes() === 0) {
                    date.setHours(19, 0, 0, 0);
                }
                return date.toISOString();
            }
            
            // If we got here, standard parsing failed
            console.error(`Could not parse date: ${dateString}`);
            // Create a fallback date that's 30 days from now
            const fallbackDate = new Date();
            fallbackDate.setDate(fallbackDate.getDate() + 30);
            return fallbackDate.toISOString();
            
        } catch (error) {
            console.error(`❌ Error parsing date "${dateString}":`, error.message);
            const fallbackDate = new Date();
            fallbackDate.setDate(fallbackDate.getDate() + 30);
            return fallbackDate.toISOString();
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

module.exports = MeridianHallEvents;
