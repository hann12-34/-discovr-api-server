/**
 * NYC Automotive & Transportation Events Scraper
 *
 * Scrapes automotive and transportation events from NYC car shows and transit events
 * URL: https://www.eventbrite.com/d/ny--new-york/auto-boat-air/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCAutomotiveTransportationEvents {
    constructor() {
        this.venueName = 'NYC Automotive & Transportation Events';
        this.venueLocation = 'Various NYC Auto Shows & Transit Centers';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/auto-boat-air/';
        this.category = 'Automotive & Transportation';
    }

    /**
     * Scrape events from NYC Automotive & Transportation Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🚗 Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'Referer': 'https://www.google.com/',
                    'DNT': '1',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for automotive-specific event containers
            const eventSelectors = [
                '.automotive-event', '.car-event', '.auto-show-event',
                '.event-item', '.event-card', '.event', '.transport-event',
                '[class*="automotive"]', '[class*="car"]', '[class*="event"]',
                '.card', '.content-card', '.vehicle-event', '.bike-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .auto-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for event date/time
                        let dateTime = '';
                        const dateSelectors = [
                            '.date', '.datetime', '[class*="date"]',
                            'time', '.when', '.schedule', '.event-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/location
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.location', '.where', '[class*="location"]', '.convention-center'];
                        for (const venueSelector of venueSelectors) {
                            const venueElement = $el.find(venueSelector).first();
                            if (venueElement.length > 0) {
                                const venueText = venueElement.text().trim();
                                if (venueText && venueText.length > 0) {
                                    venue = venueText.length > 70 ? venueText.substring(0, 70) + '...' : venueText;
                                    break;
                                }
                            }
                        }

                        // Look for vehicle type/category
                        let vehicleType = '';
                        const typeSelectors = ['.vehicle-type', '.category', '.auto-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                vehicleType = typeElement.text().trim();
                                if (vehicleType) break;
                            }
                        }

                        // Look for brand/manufacturer
                        let brand = '';
                        const brandSelectors = ['.brand', '.manufacturer', '.make', '[class*="brand"]'];
                        for (const brandSelector of brandSelectors) {
                            const brandElement = $el.find(brandSelector).first();
                            if (brandElement.length > 0) {
                                brand = brandElement.text().trim();
                                if (brand) break;
                            }
                        }

                        // Look for event type
                        let eventType = this.category;
                        const eventTypeSelectors = ['.event-type', '.show-type', '.activity-type', '[class*="event-type"]'];
                        for (const eventTypeSelector of eventTypeSelectors) {
                            const eventTypeElement = $el.find(eventTypeSelector).first();
                            if (eventTypeElement.length > 0) {
                                const eventTypeText = eventTypeElement.text().trim();
                                if (eventTypeText && eventTypeText.length > 0) {
                                    eventType = eventTypeText;
                                    break;
                                }
                            }
                        }

                        // Look for admission/ticket info
                        let admission = '';
                        const admissionSelectors = ['.admission', '.ticket', '.price', '[class*="admission"]'];
                        for (const admissionSelector of admissionSelectors) {
                            const admissionElement = $el.find(admissionSelector).first();
                            if (admissionElement.length > 0) {
                                const admissionText = admissionElement.text().trim();
                                if (admissionText && (admissionText.includes('$') || admissionText.toLowerCase().includes('free'))) {
                                    admission = admissionText;
                                    break;
                                }
                            }
                        }

                        // Look for special features
                        let features = '';
                        const featureSelectors = ['.features', '.highlights', '.special', '[class*="feature"]'];
                        for (const featureSelector of featureSelectors) {
                            const featureElement = $el.find(featureSelector).first();
                            if (featureElement.length > 0) {
                                features = featureElement.text().trim();
                                if (features) break;
                            }
                        }

                        // Look for age restrictions
                        let ageRestriction = '';
                        const ageSelectors = ['.age-restriction', '.age-limit', '.family-friendly', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageRestriction = ageElement.text().trim();
                                if (ageRestriction) break;
                            }
                        }

                        // Look for parking info
                        let parking = '';
                        const parkingSelectors = ['.parking', '.parking-info', '.transportation', '[class*="parking"]'];
                        for (const parkingSelector of parkingSelectors) {
                            const parkingElement = $el.find(parkingSelector).first();
                            if (parkingElement.length > 0) {
                                parking = parkingElement.text().trim();
                                if (parking) break;
                            }
                        }

                        // Look for description
                        let description = '';
                        const descSelectors = ['.description', '.excerpt', '.summary', '.details', '.content'];
                        for (const descSelector of descSelectors) {
                            const descElement = $el.find(descSelector).first();
                            if (descElement.length > 0) {
                                description = descElement.text().trim();
                                if (description && description.length > 20 && description.length < 300) break;
                            }
                        }

                        // Look for link
                        let eventLink = $el.find('a').first().attr('href') || '';
                        if (eventLink && !eventLink.startsWith('http')) {
                            eventLink = this.baseUrl + eventLink;
                        }

                        const event = {
                            title: title,
                            venue: venue,
                            location: this.venueLocation,
                            date: dateTime || 'Check website for automotive event schedule',
                            category: eventType,
                            vehicleType: vehicleType,
                            brand: brand,
                            admission: admission,
                            features: features,
                            ageRestriction: ageRestriction,
                            parking: parking,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCAutomotiveTransportationEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general automotive information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasAutoKeywords = text.match(/\b(automotive|car|auto|vehicle|transportation|motorcycle|bike|boat|plane|train)\b/i);
                    const hasEventPattern = text.match(/\b(show|event|expo|exhibition|fair|display|meet|gathering|rally)\b/i);

                    if (hasAutoKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for automotive event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCAutomotiveTransportationEvents'
                            };

                            events.push(event);
                        }
                    }
                }
            };

            // Remove duplicates
            const uniqueEvents = this.removeDuplicateEvents(events);

            console.log(`✅ ${this.venueName}: Found ${uniqueEvents.length} events`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }

    /**
     * Remove duplicate events based on title and venue
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.venue}`.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        };
    }

    /**
     * Check if the extracted text represents a valid event
     * @param {string} title - Event title to validate
     * @returns {boolean} Whether the title appears to be a valid event
     */
    isValidEvent(title) {
        if (!title || title.length < 8 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social media', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'directions'
        ];

        // Check for valid automotive keywords
        const validKeywords = [
            'automotive', 'car', 'auto', 'vehicle', 'transportation', 'motorcycle',
            'bike', 'boat', 'plane', 'train', 'show', 'event', 'expo',
            'exhibition', 'fair', 'display', 'meet', 'gathering', 'rally'
        ];

        const titleLower = title.toLowerCase();
        const hasValidKeyword = validKeywords.some(keyword => titleLower.includes(keyword));
        const hasInvalidKeyword = invalidKeywords.some(keyword => titleLower.includes(keyword));

        return hasValidKeyword && !hasInvalidKeyword;
    }

    /**
     * Get venue information
     * @returns {Object} Venue details
     */
    getVenueInfo() {
        return {
            name: this.venueName,
            location: this.venueLocation,
            category: this.category,
            website: this.baseUrl
        };
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new NYCAutomotiveTransportationEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCAutomotiveTransportationEvents = NYCAutomotiveTransportationEvents;