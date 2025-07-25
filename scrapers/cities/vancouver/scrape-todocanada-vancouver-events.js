/**
 * TodoCanada Vancouver Events Scraper
 * Scrapes events from https://www.todocanada.ca/city/vancouver/events
 * Uses JSON-LD structured data extraction
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class TodoCanadaVancouverEvents {
    constructor() {
        this.venueName = 'TodoCanada Vancouver Events';
        this.eventsUrl = 'https://www.todocanada.ca/city/vancouver/events';
        this.city = 'Vancouver';
        this.province = 'BC';
        this.country = 'Canada';
    }

    /**
     * Get default Vancouver coordinates
     * @returns {Object} Default coordinates for Vancouver
     */
    getDefaultCoordinates() {
        return {
            latitude: 49.2827,
            longitude: -123.1207
        };
    }

    /**
     * Parse date string into Date object
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} Parsed date or null
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date;
            }
            return null;
        } catch (error) {
            console.error('Error parsing date:', dateString, error.message);
            return null;
        }
    }

    /**
     * Parse price information from offers
     * @param {Array|Object} offers - Offers array or object
     * @returns {string} Cleaned price
     */
    parsePrice(offers) {
        if (!offers) return 'Free';
        
        try {
            let priceInfo = 'Free';
            
            if (Array.isArray(offers)) {
                if (offers.length > 0 && offers[0].price) {
                    priceInfo = `$${offers[0].price}`;
                }
            } else if (offers.price) {
                priceInfo = `$${offers.price}`;
            }
            
            return priceInfo;
        } catch (error) {
            return 'Varies';
        }
    }

    /**
     * Extract venue information from location data
     * @param {Object} location - Location object from JSON-LD
     * @returns {Object} Venue information
     */
    extractVenueInfo(location) {
        if (!location) {
            return {
                name: 'Vancouver Venue',
                address: 'Vancouver, BC',
                coordinates: this.getDefaultCoordinates()
            };
        }

        let venueName = 'Vancouver Venue';
        let address = 'Vancouver, BC';
        let coordinates = this.getDefaultCoordinates();

        if (typeof location === 'string') {
            address = location;
            venueName = location.split(',')[0].trim();
        } else if (location.name) {
            venueName = location.name;
            if (location.address) {
                if (typeof location.address === 'string') {
                    address = location.address;
                } else if (location.address.streetAddress) {
                    address = location.address.streetAddress;
                    if (location.address.addressLocality) {
                        address += `, ${location.address.addressLocality}`;
                    }
                    if (location.address.addressRegion) {
                        address += `, ${location.address.addressRegion}`;
                    }
                }
            }
        }

        // Ensure Vancouver is in the address if not present
        if (!address.toLowerCase().includes('vancouver')) {
            address += ', Vancouver, BC';
        }
        
        return {
            name: venueName,
            address: address,
            coordinates: coordinates
        };
    }

    /**
     * Fetch events from TodoCanada Vancouver using JSON-LD data
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        console.log(`🔍 Fetching events from ${this.venueName}...`);
        
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            console.log(`✅ Successfully loaded TodoCanada Vancouver page`);
            
            // Extract JSON-LD structured data
            const jsonLdScripts = $('script[type="application/ld+json"]');
            console.log(`🔍 Found ${jsonLdScripts.length} JSON-LD scripts`);

            jsonLdScripts.each((index, element) => {
                try {
                    const jsonData = JSON.parse($(element).html());
                    
                    if (jsonData['@type'] === 'Event') {
                        const venueInfo = this.extractVenueInfo(jsonData.location);
                        
                        const event = {
                            id: uuidv4(),
                            name: jsonData.name || 'Untitled Event',
                            title: jsonData.name || 'Untitled Event',
                            description: jsonData.description || '',
                            startDate: this.parseDate(jsonData.startDate),
                            endDate: this.parseDate(jsonData.endDate),
                            location: venueInfo.address,
                            streetAddress: venueInfo.address,
                            venue: {
                                name: venueInfo.name,
                                address: venueInfo.address,
                                city: this.city,
                                province: this.province,
                                country: this.country,
                                coordinates: venueInfo.coordinates
                            },
                            price: this.parsePrice(jsonData.offers),
                            priceRange: this.parsePrice(jsonData.offers),
                            type: 'event',
                            status: 'active',
                            imageURL: jsonData.image || null,
                            sourceURL: jsonData.url || this.eventsUrl,
                            officialWebsite: jsonData.url || this.eventsUrl,
                            scrapedAt: new Date().toISOString(),
                            source: this.venueName
                        };
                        
                        events.push(event);
                        console.log(`✅ Extracted event: ${jsonData.name}`);
                    }
                } catch (parseError) {
                    console.log(`⚠️ Could not parse JSON-LD script ${index + 1}:`, parseError.message);
                }
            });

            console.log(`🎉 Successfully scraped ${events.length} events from ${this.venueName}`);
            return events;

        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
            }
            return [];
        }
    }
}

module.exports = new TodoCanadaVancouverEvents();
