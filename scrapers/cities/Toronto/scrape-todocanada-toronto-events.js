/**
 * TodoCanada Toronto Events Scraper
 * Scrapes events from https://www.todocanada.ca/city/toronto/events
 * Uses JSON-LD structured data extraction
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class TodoCanadaTorontoEvents {
    constructor() {
        this.venueName = 'TodoCanada Toronto Events';
        this.eventsUrl = 'https://www.todocanada.ca/city/toronto/events';
        this.city = 'Toronto';
        this.province = 'ON';
        this.country = 'Canada';
    }

    /**
     * Get default Toronto coordinates
     * @returns {Object} Default coordinates for Toronto
     */
    getDefaultCoordinates() {
        return {
            latitude: 43.6532,
            longitude: -79.3832
        };
    }

    /**
     * Decode HTML entities in text
     * @param {string} text - Text with HTML entities
     * @returns {string} Decoded text
     */
    decodeHtmlEntities(text) {
        if (!text) return text;
        
        const entities = {
            '&#039;': "'",
            '&quot;': '"',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&nbsp;': ' '
        };
        
        return text.replace(/&#?\w+;/g, match => entities[match] || match);
    }

    /**
     * Standardize street name abbreviations
     * @param {string} streetName - Raw street name
     * @returns {string} Standardized street name
     */
    standardizeStreetName(streetName) {
        if (!streetName) return streetName;
        
        const abbreviations = {
            ' St ': ' Street ',
            ' St$': ' Street',
            ' Ave ': ' Avenue ',
            ' Ave$': ' Avenue',
            ' Rd ': ' Road ',
            ' Rd$': ' Road',
            ' Blvd ': ' Boulevard ',
            ' Blvd$': ' Boulevard',
            ' Dr ': ' Drive ',
            ' Dr$': ' Drive',
            ' Ln ': ' Lane ',
            ' Ln$': ' Lane',
            ' Pl ': ' Place ',
            ' Pl$': ' Place',
            ' Ct ': ' Court ',
            ' Ct$': ' Court',
            ' Cir ': ' Circle ',
            ' Cir$': ' Circle'
        };
        
        let standardized = streetName;
        for (const [abbrev, full] of Object.entries(abbreviations)) {
            standardized = standardized.replace(new RegExp(abbrev, 'gi'), full);
        }
        
        return standardized.trim();
    }

    /**
     * Smart venue detection - separate venue names from addresses
     * @param {string} fullAddress - Full address string that may contain venue name
     * @returns {Object} Separated venue name and address
     */
    separateVenueFromAddress(fullAddress) {
        if (!fullAddress) return { venueName: null, address: fullAddress };
        
        // Common venue type indicators
        const venuePatterns = [
            'theatre', 'theater', 'hall', 'centre', 'center', 'gallery', 'museum',
            'arena', 'stadium', 'complex', 'pavilion', 'auditorium', 'conservatory',
            'club', 'lounge', 'bar', 'restaurant', 'cafe', 'library', 'school',
            'university', 'college', 'institute', 'academy', 'studio', 'workshop',
            'church', 'cathedral', 'temple', 'synagogue', 'mosque', 'chapel',
            'park', 'garden', 'square', 'plaza', 'market', 'mall', 'tower',
            'building', 'house', 'manor', 'castle', 'palace', 'hotel', 'resort',
            'conference', 'convention', 'exhibition', 'expo', 'fair', 'festival'
        ];
        
        // Split by comma to separate potential venue from address
        const parts = fullAddress.split(',').map(part => part.trim());
        
        if (parts.length >= 2) {
            const firstPart = parts[0].toLowerCase();
            const secondPart = parts[1];
            
            // Check if first part contains venue indicators
            const hasVenuePattern = venuePatterns.some(pattern => 
                firstPart.includes(pattern.toLowerCase())
            );
            
            // Check if second part looks like a street address (starts with number)
            const hasStreetNumber = /^\d+\s/.test(secondPart.trim());
            
            // Check if second part contains street keywords
            const streetKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'drive', 'dr', 'lane', 'ln'];
            const hasStreetKeyword = streetKeywords.some(keyword => 
                secondPart.toLowerCase().includes(keyword)
            );
            
            if (hasVenuePattern && (hasStreetNumber || hasStreetKeyword)) {
                // First part is likely venue name, rest is address
                const venueName = parts[0].trim();
                const address = parts.slice(1).join(', ').trim();
                return { venueName, address };
            }
            
            // Check for pattern: "Venue Name at Address" or "Venue Name - Address"
            const combinedAddress = fullAddress;
            const atPattern = /^(.+?)\s+(?:at|@)\s+(.+)$/i;
            const dashPattern = /^(.+?)\s+-\s+(.+)$/;
            
            let match = combinedAddress.match(atPattern) || combinedAddress.match(dashPattern);
            if (match) {
                const potentialVenue = match[1].trim();
                const potentialAddress = match[2].trim();
                
                // Verify this looks like a venue name
                const lowerVenue = potentialVenue.toLowerCase();
                if (venuePatterns.some(pattern => lowerVenue.includes(pattern))) {
                    return { venueName: potentialVenue, address: potentialAddress };
                }
            }
        }
        
        // If no clear separation found, check if the entire first part is a venue name
        if (parts.length > 0) {
            const firstPart = parts[0];
            const firstPartLower = firstPart.toLowerCase();
            
            // If first part is clearly a venue name and doesn't look like an address
            const hasVenuePattern = venuePatterns.some(pattern => 
                firstPartLower.includes(pattern)
            );
            
            const looksLikeAddress = /^\d+\s/.test(firstPart) || 
                                   ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd'].some(keyword => 
                                       firstPartLower.includes(keyword)
                                   );
            
            if (hasVenuePattern && !looksLikeAddress && parts.length > 1) {
                return { 
                    venueName: firstPart, 
                    address: parts.slice(1).join(', ').trim() 
                };
            }
        }
        
        // Default: no clear venue separation
        return { venueName: null, address: fullAddress };
    }

    /**
     * Parse and clean address information with street numbers
     * @param {string} address - Raw address string
     * @returns {Object} Parsed address components with street details
     */
    parseAddress(address) {
        if (!address) return { 
            city: 'Toronto', 
            province: 'ON', 
            cleanAddress: 'Toronto, ON',
            streetNumber: null,
            streetName: null,
            fullStreetAddress: null,
            postalCode: null
        };
        
        // Decode HTML entities
        let cleanAddress = this.decodeHtmlEntities(address);
        
        // Remove duplicate "Toronto, ON" patterns
        cleanAddress = cleanAddress.replace(/,\s*Toronto, ON$/, '');
        cleanAddress = cleanAddress.replace(/(Toronto, ON[^,]*),\s*Toronto, ON/gi, '$1');
        
        // Extract postal code (Canadian format: A1A 1A1)
        const postalCodeMatch = cleanAddress.match(/\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i);
        const postalCode = postalCodeMatch ? postalCodeMatch[0].toUpperCase() : null;
        
        // Remove postal code from address for cleaner parsing
        if (postalCode) {
            cleanAddress = cleanAddress.replace(postalCodeMatch[0], '').trim();
        }
        
        // Split into parts
        const parts = cleanAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
        
        let city = 'Toronto';
        let province = 'ON';
        let streetNumber = null;
        let streetName = null;
        let fullStreetAddress = null;
        
        // Extract street information from the first part (most likely to contain street address)
        if (parts.length > 0) {
            const firstPart = parts[0];
            
            // Look for street number and name pattern (e.g., "123 Main St", "45 Queen Street West")
            const streetPattern = /^(\d+)\s+(.+)$/;
            const streetMatch = firstPart.match(streetPattern);
            
            if (streetMatch) {
                streetNumber = streetMatch[1];
                let rawStreetName = streetMatch[2];
                
                // Clean up street name - remove trailing city names
                rawStreetName = rawStreetName.replace(/\s+(Toronto|Mississauga|Vaughan|Markham|Richmond Hill|Etobicoke|Hamilton)$/i, '');
                
                // Standardize street name
                streetName = this.standardizeStreetName(rawStreetName);
                fullStreetAddress = `${streetNumber} ${streetName}`;
            } else {
                // Check if this looks like a street name without number
                const streetKeywords = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'drive', 'dr', 'lane', 'ln', 'way', 'place', 'pl', 'court', 'ct', 'circle', 'cir'];
                const hasStreetKeyword = streetKeywords.some(keyword => 
                    firstPart.toLowerCase().includes(keyword)
                );
                
                if (hasStreetKeyword) {
                    // Clean up street name
                    let rawStreetName = firstPart.replace(/\s+(Toronto|Mississauga|Vaughan|Markham|Richmond Hill|Etobicoke|Hamilton)$/i, '');
                    streetName = this.standardizeStreetName(rawStreetName);
                    fullStreetAddress = streetName;
                }
            }
        }
        
        // Look for known cities in the address
        for (const part of parts) {
            const partLower = part.toLowerCase();
            if (partLower === 'toronto' || partLower.includes('toronto')) {
                city = 'Toronto';
                break;
            } else if (partLower === 'mississauga' || partLower.includes('mississauga')) {
                city = 'Mississauga';
                break;
            } else if (partLower === 'vaughan' || partLower.includes('vaughan')) {
                city = 'Vaughan';
                break;
            } else if (partLower === 'markham' || partLower.includes('markham')) {
                city = 'Markham';
                break;
            } else if (partLower === 'richmond hill' || partLower.includes('richmond hill')) {
                city = 'Richmond Hill';
                break;
            } else if (partLower === 'etobicoke' || partLower.includes('etobicoke')) {
                city = 'Etobicoke';
                break;
            } else if (partLower === 'hamilton' || partLower.includes('hamilton')) {
                city = 'Hamilton';
                break;
            } else if (partLower === 'erin' || partLower.includes('erin')) {
                city = 'Erin';
                break;
            } else if (partLower === 'alton' || partLower.includes('alton')) {
                city = 'Alton';
                break;
            } else if (partLower === 'penetanguishene' || partLower.includes('penetanguishene')) {
                city = 'Penetanguishene';
                break;
            } else if (partLower === 'campbellville' || partLower.includes('campbellville')) {
                city = 'Campbellville';
                break;
            }
        }
        
        // Look for province
        for (const part of parts) {
            if (part.match(/^[A-Z]{2}$/)) {
                province = part;
                break;
            }
        }
        
        // Create enhanced clean address with street details
        let enhancedAddress = cleanAddress;
        if (fullStreetAddress && city !== 'Toronto') {
            enhancedAddress = `${fullStreetAddress}, ${city}, ${province}`;
        } else if (fullStreetAddress) {
            enhancedAddress = `${fullStreetAddress}, ${city}, ${province}`;
        }
        
        return {
            city,
            province,
            cleanAddress: enhancedAddress,
            streetNumber,
            streetName,
            fullStreetAddress,
            postalCode
        };
    }

    /**
     * Parse date from date string
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} Parsed date or null
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return date;
        } catch (error) {
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
                name: 'Unknown Venue',
                address: 'Toronto, ON',
                coordinates: this.getDefaultCoordinates(),
                streetNumber: null,
                streetName: null,
                fullStreetAddress: null,
                postalCode: null
            };
        }
        
        // Extract venue name
        let venueName = location.name || 'Unknown Venue';
        
        // Extract address
        let address = '';
        if (location.address) {
            if (typeof location.address === 'string') {
                address = location.address;
            } else if (location.address.streetAddress) {
                address = location.address.streetAddress;
                if (location.address.addressLocality) {
                    address += ', ' + location.address.addressLocality;
                }
                if (location.address.addressRegion) {
                    address += ', ' + location.address.addressRegion;
                }
            }
        }
        
        // If no address found, try to extract from venue name
        if (!address && venueName.includes(',')) {
            const parts = venueName.split(',');
            if (parts.length > 1) {
                venueName = parts[0].trim();
                address = parts.slice(1).join(',').trim();
            }
        }
        
        // Smart venue detection - separate venue name from address if mixed
        const venueInfo = this.separateVenueFromAddress(address || venueName);
        
        // Use detected venue name if available, otherwise keep original
        if (venueInfo.venueName) {
            venueName = venueInfo.venueName;
            address = venueInfo.address || address;
        }
        
        // Parse the address for detailed information
        const addressInfo = this.parseAddress(address);
        
        // Extract coordinates
        let coordinates = this.getDefaultCoordinates();
        if (location.geo) {
            coordinates = {
                latitude: parseFloat(location.geo.latitude) || coordinates.latitude,
                longitude: parseFloat(location.geo.longitude) || coordinates.longitude
            };
        }
        
        // Create final address with city and province
        const finalAddress = addressInfo.cleanAddress;
        
        return {
            name: venueName,
            address: finalAddress,
            coordinates: coordinates,
            streetNumber: addressInfo.streetNumber,
            streetName: addressInfo.streetName,
            fullStreetAddress: addressInfo.fullStreetAddress,
            postalCode: addressInfo.postalCode
        };
    }

    /**
     * Fetch events from TodoCanada Toronto using JSON-LD data
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

            console.log(`✅ Successfully loaded TodoCanada Toronto page`);
            
            // Extract JSON-LD structured data
            const jsonLdScripts = $('script[type="application/ld+json"]');
            console.log(`🔍 Found ${jsonLdScripts.length} JSON-LD scripts`);

            jsonLdScripts.each((index, element) => {
                try {
                    const jsonData = JSON.parse($(element).html());
                    
                    if (jsonData['@type'] === 'Event') {
                        const venueInfo = this.extractVenueInfo(jsonData.location);
                        
                        // Parse the address to extract city and province properly
                        const addressInfo = this.parseAddress(venueInfo.address);
                        const venueCity = addressInfo.city;
                        const venueProvince = addressInfo.province;
                        const cleanAddress = addressInfo.cleanAddress;
                        
                        const event = {
                            id: uuidv4(),
                            name: jsonData.name || 'Untitled Event',
                            title: jsonData.name || 'Untitled Event',
                            description: jsonData.description || '',
                            startDate: this.parseDate(jsonData.startDate),
                            endDate: this.parseDate(jsonData.endDate),
                            location: cleanAddress,
                            streetAddress: cleanAddress,
                            venue: {
                                name: venueInfo.name,
                                address: cleanAddress,
                                city: venueCity,
                                province: venueProvince,
                                country: this.country,
                                coordinates: venueInfo.coordinates,
                                streetNumber: venueInfo.streetNumber,
                                streetName: venueInfo.streetName,
                                fullStreetAddress: venueInfo.fullStreetAddress,
                                postalCode: venueInfo.postalCode
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

    /**
     * Get venue information
     * @returns {object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            address: 'Various Venues',
            city: this.city,
            province: this.province,
            country: this.country,
            coordinates: this.getDefaultCoordinates(),
            website: this.baseUrl,
            type: 'events-directory'
        };
    }
}

module.exports = TodoCanadaTorontoEvents;
