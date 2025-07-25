/**
 * Scraper for Roy Thomson Hall in Toronto
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class RoyThomsonHallEvents {
    constructor() {
        this.venueName = 'Roy Thomson Hall';
        this.venueId = 'roy-thomson-hall';
        this.baseUrl = 'https://www.roythomsonhall.com';
        this.eventsUrl = 'https://www.roythomsonhall.com/calendar';
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
            
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            const $ = cheerio.load(response.data);
            const events = [];
            
            // Roy Thomson Hall specific selectors
            $('.event-listing-item').each((index, element) => {
                try {
                    const name = $(element).find('.event-title').text().trim();
                    const dateString = $(element).find('.event-date').text().trim();
                    const startDate = this.parseDate(dateString);
                    const urlPath = $(element).find('a.event-link').attr('href');
                    const fullUrl = this.normalizeUrl(urlPath);
                    const imageUrl = $(element).find('.event-image img').attr('src');
                    const fullImageUrl = this.normalizeUrl(imageUrl);
                    
                    // Skip if missing essential data
                    if (!name) {
                        console.log('⚠️ Skipping event with missing name');
                        return;
                    }
                    
                    // If date parsing failed, use a fallback date
                    const eventDate = startDate || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString();
                    
                    const event = {
                        id: uuidv4(),
                        name: name,
                        startDate: eventDate,
                        endDate: eventDate,
                        venue: {
                            name: this.venueName,
                            id: this.venueId,
                            url: this.baseUrl,
                            address: '60 Simcoe St, Toronto, ON, Canada'
                        },
                        url: fullUrl || this.eventsUrl,
                        imageUrl: fullImageUrl || '',
                        price: { min: 0, max: 0, currency: 'CAD' }, // Default price if not available
                        source: this.venueName,
                        scrapeDate: new Date().toISOString(),
                        city: this.city,
                        province: this.province,
                        country: this.country,
                        categories: ['Toronto', 'Concert Hall']
                    };
                    
                    events.push(event);
                    
                } catch (err) {
                    console.error(`❌ Error parsing event ${index} from ${this.venueName}:`, err.message);
                }
            });
            
            // If we couldn't parse any events with the primary selectors, try alternate selectors
            if (events.length === 0) {
                console.log('Trying alternate selectors...');
                
                $('.event-item, .performance-item').each((index, element) => {
                    try {
                        // Try various potential selectors for event info
                        const name = $(element).find('h3, .title, .event-name').text().trim();
                        
                        // Only proceed if we found a name
                        if (name) {
                            // Create an event with minimal information
                            const event = {
                                id: uuidv4(),
                                name: name,
                                startDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
                                endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
                                venue: {
                                    name: this.venueName,
                                    id: this.venueId,
                                    url: this.baseUrl,
                                    address: '60 Simcoe St, Toronto, ON, Canada'
                                },
                                url: this.eventsUrl,
                                imageUrl: '',
                                price: { min: 0, max: 0, currency: 'CAD' },
                                source: this.venueName,
                                scrapeDate: new Date().toISOString(),
                                city: this.city,
                                province: this.province,
                                country: this.country,
                                categories: ['Toronto', 'Concert Hall']
                            };
                            
                            events.push(event);
                        }
                    } catch (err) {
                        console.error(`❌ Error parsing event ${index} with alternate selectors:`, err.message);
                    }
                });
            }
            
            // If no events found, log message
            if (events.length === 0) {
                console.log('⚠️ No events found on Roy Thomson Hall website');
                console.log('🎉 No real events found, returning empty array (no fallback data)');
            }
            
            console.log(`✅ Found ${events.length} events from ${this.venueName}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            console.log('🎉 Error occurred, returning empty array (no fallback data)');
            return [];
        }
    }
    
    /**
     * Parse date string into ISO format
     * @param {string} dateString - Date string from venue website
     * @returns {string} ISO date string or null if parsing failed
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
            
            // If standard parsing fails, try different approaches
            // For example, "July 15" might need current year added
            const now = new Date();
            const withCurrentYear = `${dateString}, ${now.getFullYear()}`;
            const dateWithYear = new Date(withCurrentYear);
            
            if (!isNaN(dateWithYear.getTime())) {
                return dateWithYear.toISOString();
            }
            
            console.log(`Could not parse date: ${dateString}`);
            return null;
            
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
}

module.exports = RoyThomsonHallEvents;
