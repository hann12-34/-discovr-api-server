/**
 * Scraper for City of Toronto Events Calendar
 * 
 * This scraper extracts event data from the Toronto.ca events API
 * API endpoint: https://secure.toronto.ca/c3api_data/v2/DataAccess.svc/festivals_events/events
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class TorontoCaEvents {
    constructor() {
        this.venueName = 'City of Toronto Events';
        this.venueId = 'toronto-ca-events';
        this.baseUrl = 'https://www.toronto.ca';
        this.apiUrl = 'https://secure.toronto.ca/c3api_data/v2/DataAccess.svc/festivals_events/events';
        this.eventsUrl = 'https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/';
        this.city = 'Toronto';
        this.province = 'ON';
        this.country = 'Canada';
    }

    /**
     * Parse date from timestamp or date string
     * @param {number|string} dateValue - Date timestamp or string
     * @returns {Date|null} Parsed date or null
     */
    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            // Handle timestamp (milliseconds)
            if (typeof dateValue === 'number') {
                const date = new Date(dateValue);
                return isNaN(date.getTime()) ? null : date;
            }
            
            // Handle date string
            if (typeof dateValue === 'string') {
                const date = new Date(dateValue);
                return isNaN(date.getTime()) ? null : date;
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', dateValue, error.message);
            return null;
        }
    }

    /**
     * Extract location information from event
     * @param {Object} event - Event object from API
     * @returns {Object} Location information
     */
    extractLocation(event) {
        let locationName = 'Toronto Venue';
        let address = 'Toronto, ON';
        let coordinates = { latitude: 43.6532, longitude: -79.3832 }; // Default Toronto coordinates
        
        // Try to get location from event_locations array
        if (event.event_locations && Array.isArray(event.event_locations) && event.event_locations.length > 0) {
            const location = event.event_locations[0];
            if (location.location_name) {
                locationName = location.location_name;
            }
            if (location.location_address) {
                address = location.location_address;
            }
            
            // Try to get GPS coordinates
            if (location.location_gps) {
                try {
                    const gpsData = JSON.parse(location.location_gps);
                    if (Array.isArray(gpsData) && gpsData.length > 0) {
                        const gps = gpsData[0];
                        if (gps.gps_lat && gps.gps_lng) {
                            coordinates = {
                                latitude: parseFloat(gps.gps_lat),
                                longitude: parseFloat(gps.gps_lng)
                            };
                        }
                    }
                } catch (parseError) {
                    // Keep default coordinates if GPS parsing fails
                }
            }
        }
        
        // Fallback to locations array if available
        if (!locationName || locationName === 'Toronto Venue') {
            if (event.locations && Array.isArray(event.locations) && event.locations.length > 0) {
                const locationStr = event.locations[0];
                if (locationStr && typeof locationStr === 'string') {
                    address = locationStr;
                    // Extract venue name from address (first part before comma)
                    const parts = locationStr.split(',');
                    if (parts.length > 0) {
                        locationName = parts[0].trim();
                    }
                }
            }
        }
        
        return {
            name: locationName,
            address: address,
            coordinates: coordinates
        };
    }

    /**
     * Extract price information from event
     * @param {Object} event - Event object from API
     * @returns {string} Price information
     */
    extractPrice(event) {
        // Check if it's a free event
        if (event.free_event === 'Yes') {
            return 'Free';
        }
        
        // Try to get price range
        if (event.event_price_low && event.event_price_high) {
            return `$${event.event_price_low} - $${event.event_price_high}`;
        }
        
        // Try individual price fields
        if (event.event_price_adult) {
            return `$${event.event_price_adult}`;
        }
        
        if (event.event_price) {
            return `$${event.event_price}`;
        }
        
        return 'Varies';
    }

    /**
     * Fetch and parse events from Toronto.ca API
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        try {
            console.log(`🔍 Fetching events from ${this.venueName} API...`);
            
            // Make HTTP request to the API endpoint
            const response = await axios.get(this.apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/',
                    'DNT': '1',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });
            
            // Check if response is valid
            if (response.status !== 200) {
                throw new Error(`Failed to fetch events from ${this.venueName}. Status code: ${response.status}`);
            }
            
            // Parse API response
            let apiData = response.data;
            
            // Handle OData format response
            if (apiData && typeof apiData === 'object' && apiData.value && Array.isArray(apiData.value)) {
                apiData = apiData.value;
            }
            
            // Ensure we have an array of events
            if (!Array.isArray(apiData)) {
                console.log('⚠️ API response is not an array format');
                console.log('🎉 No real events found, returning empty array (no fallback data)');
                return [];
            }
            
            // Filter only approved events
            const approvedEvents = apiData.filter(event => 
                event && 
                event.event_status === 'Approved' && 
                event.event_name && 
                event.event_name.trim() !== ''
            );
            
            if (approvedEvents.length === 0) {
                console.log('⚠️ No approved events found in API response');
                console.log('🎉 No real events found, returning empty array (no fallback data)');
                return [];
            }
            
            console.log(`📊 Processing ${approvedEvents.length} approved events from API...`);
            
            // Array to store processed events
            const events = [];
            
            // Process each approved event from API
            for (let i = 0; i < approvedEvents.length; i++) {
                const apiEvent = approvedEvents[i];
                
                try {
                    // Extract basic event information
                    const name = apiEvent.event_name || apiEvent.short_name || 'Untitled Event';
                    const description = apiEvent.event_description || apiEvent.short_description || null;
                    
                    // Parse dates
                    const startDate = this.parseDate(apiEvent.event_startdate);
                    const endDate = this.parseDate(apiEvent.event_enddate);
                    
                    // Extract location information
                    const locationInfo = this.extractLocation(apiEvent);
                    
                    // Extract price information
                    const price = this.extractPrice(apiEvent);
                    
                    // Get event website
                    const eventWebsite = apiEvent.event_website || apiEvent.ticket_website || null;
                    
                    // Get event image
                    let imageUrl = null;
                    if (apiEvent.event_image && Array.isArray(apiEvent.event_image) && apiEvent.event_image.length > 0) {
                        const image = apiEvent.event_image[0];
                        if (image.bin_id) {
                            // Construct image URL from bin_id (Toronto.ca specific)
                            imageUrl = `https://secure.toronto.ca/cc_sr_v1/data/swm_waste_wizard_APR/${image.bin_id}`;
                        }
                    }
                    
                    // Create standardized event object
                    const event = {
                        id: uuidv4(),
                        name: name,
                        title: name,
                        description: description,
                        startDate: startDate,
                        endDate: endDate,
                        location: locationInfo.address,
                        streetAddress: locationInfo.address,
                        venue: {
                            name: locationInfo.name,
                            address: locationInfo.address,
                            city: this.city,
                            province: this.province,
                            country: this.country,
                            coordinates: locationInfo.coordinates
                        },
                        price: price,
                        priceRange: price,
                        type: 'festival',
                        status: 'active',
                        imageURL: imageUrl,
                        sourceURL: eventWebsite || this.eventsUrl,
                        officialWebsite: eventWebsite,
                        scrapedAt: new Date().toISOString(),
                        source: this.venueName,
                        // Additional Toronto.ca specific fields
                        eventId: apiEvent.id,
                        submissionId: apiEvent.submission_id,
                        reservationsRequired: apiEvent.reservations_required === 'Yes',
                        freeEvent: apiEvent.free_event === 'Yes',
                        featuredEvent: apiEvent.featured_event === 'Yes',
                        contactEmail: apiEvent.event_email || apiEvent.ticket_email,
                        contactPhone: apiEvent.event_telephone,
                        features: apiEvent.event_features || [],
                        partnerships: apiEvent.partnerships || [],
                        socialMedia: {
                            facebook: apiEvent.facebook_url,
                            instagram: apiEvent.instagram_url,
                            twitter: apiEvent.twitter_url
                        }
                    };
                    
                    events.push(event);
                    console.log(`✅ Processed event: ${name}`);
                    
                } catch (error) {
                    console.error(`❌ Error processing event at index ${i}:`, error.message);
                    // Continue processing other events - no fallback data
                }
            }
            
            console.log(`🎉 Successfully scraped ${events.length} events from ${this.venueName}`);
            return events;
            
        } catch (error) {
            console.error(`❌ Error fetching events from ${this.venueName}:`, error.message);
            return [];
        }
    }

    /**
     * Get venue information
     * @returns {object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            id: this.venueId,
            address: 'Various Locations',
            city: this.city,
            province: this.province,
            country: this.country,
            coordinates: {
                latitude: 43.6532,
                longitude: -79.3832
            },
            website: this.baseUrl,
            type: 'municipal'
        };
    }
}

module.exports = TorontoCaEvents;
