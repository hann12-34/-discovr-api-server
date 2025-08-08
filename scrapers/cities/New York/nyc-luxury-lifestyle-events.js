/**
 * NYC Luxury & Lifestyle Events Scraper
 *
 * Scrapes luxury and lifestyle events from NYC high-end venues, galleries, and exclusive locations
 * URL: https://www.eventbrite.com/d/ny--new-york/lifestyle/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCLuxuryLifestyleEvents {
    constructor() {
        this.venueName = 'NYC Luxury & Lifestyle Events';
        this.venueLocation = 'Various NYC Luxury Venues, Galleries & Exclusive Locations';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/lifestyle/';
        this.category = 'Luxury & Lifestyle';
    }

    /**
     * Scrape events from NYC Luxury & Lifestyle Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`💎 Scraping events from ${this.venueName}...`);

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

            // Look for luxury/lifestyle-specific event containers
            const eventSelectors = [
                '.luxury-event', '.lifestyle-event', '.exclusive-event',
                '.event-item', '.event-card', '.event', '.vip-event',
                '[class*="luxury"]', '[class*="lifestyle"]', '[class*="event"]',
                '.card', '.content-card', '.premium-event', '.elite-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .luxury-title, .name, .headline').first().text().trim();

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
                            'time', '.when', '.schedule', '.event-time', '.exclusive-time'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateTime = dateElement.text().trim();
                                if (dateTime && dateTime.length < 150) break;
                            }
                        }

                        // Look for venue/gallery/luxury location
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.gallery', '.location', '[class*="venue"]', '.luxury-venue', '.exclusive-venue'];
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

                        // Look for luxury category/type
                        let luxuryType = this.category;
                        const typeSelectors = ['.luxury-type', '.category', '.lifestyle-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                const typeText = typeElement.text().trim();
                                if (typeText && typeText.length > 0) {
                                    luxuryType = typeText;
                                    break;
                                }
                            }
                        }

                        // Look for brand/designer/host
                        let brand = '';
                        const brandSelectors = ['.brand', '.designer', '.host', '[class*="brand"]'];
                        for (const brandSelector of brandSelectors) {
                            const brandElement = $el.find(brandSelector).first();
                            if (brandElement.length > 0) {
                                brand = brandElement.text().trim();
                                if (brand) break;
                            }
                        }

                        // Look for price/cost
                        let cost = '';
                        const costSelectors = ['.cost', '.price', '.fee', '[class*="cost"]'];
                        for (const costSelector of costSelectors) {
                            const costElement = $el.find(costSelector).first();
                            if (costElement.length > 0) {
                                const costText = costElement.text().trim();
                                if (costText && (costText.includes('$') || costText.toLowerCase().includes('free'))) {
                                    cost = costText;
                                    break;
                                }
                            }
                        }

                        // Look for dress code
                        let dressCode = '';
                        const dressSelectors = ['.dress-code', '.attire', '.dress', '[class*="dress"]'];
                        for (const dressSelector of dressSelectors) {
                            const dressElement = $el.find(dressSelector).first();
                            if (dressElement.length > 0) {
                                const dressText = dressElement.text().trim();
                                if (dressText && dressText.match(/\b(formal|black tie|cocktail|casual|smart casual)\b/i)) {
                                    dressCode = dressText;
                                    break;
                                }
                            }
                        }

                        // Look for exclusivity/VIP info
                        let exclusivity = '';
                        const exclusiveSelectors = ['.exclusive', '.vip', '.members-only', '[class*="exclusive"]'];
                        for (const exclusiveSelector of exclusiveSelectors) {
                            const exclusiveElement = $el.find(exclusiveSelector).first();
                            if (exclusiveElement.length > 0) {
                                exclusivity = exclusiveElement.text().trim();
                                if (exclusivity) break;
                            }
                        }

                        // Look for amenities/perks
                        let amenities = '';
                        const amenitySelectors = ['.amenities', '.perks', '.inclusions', '[class*="amenities"]'];
                        for (const amenitySelector of amenitySelectors) {
                            const amenityElement = $el.find(amenitySelector).first();
                            if (amenityElement.length > 0) {
                                amenities = amenityElement.text().trim();
                                if (amenities) break;
                            }
                        }

                        // Look for networking/socializing info
                        let networking = '';
                        const networkSelectors = ['.networking', '.social', '.meet', '[class*="networking"]'];
                        for (const networkSelector of networkSelectors) {
                            const networkElement = $el.find(networkSelector).first();
                            if (networkElement.length > 0) {
                                networking = networkElement.text().trim();
                                if (networking) break;
                            }
                        }

                        // Look for age restriction
                        let ageRestriction = '';
                        const ageSelectors = ['.age-restriction', '.age-limit', '.21+', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                const ageText = ageElement.text().trim();
                                if (ageText && ageText.match(/\b(\d+\+|adults only|21\+|18\+)\b/i)) {
                                    ageRestriction = ageText;
                                    break;
                                }
                            }
                        }

                        // Look for RSVP/invitation requirement
                        let rsvp = '';
                        const rsvpSelectors = ['.rsvp', '.invitation', '.guest-list', '[class*="rsvp"]'];
                        for (const rsvpSelector of rsvpSelectors) {
                            const rsvpElement = $el.find(rsvpSelector).first();
                            if (rsvpElement.length > 0) {
                                rsvp = rsvpElement.text().trim();
                                if (rsvp) break;
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
                            date: dateTime || 'Check website for luxury event schedule',
                            category: luxuryType,
                            brand: brand,
                            cost: cost,
                            dressCode: dressCode,
                            exclusivity: exclusivity,
                            amenities: amenities,
                            networking: networking,
                            ageRestriction: ageRestriction,
                            rsvp: rsvp,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCLuxuryLifestyleEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general luxury/lifestyle information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasLuxuryKeywords = text.match(/\b(luxury|lifestyle|exclusive|premium|elite|VIP|high-end|upscale|sophisticated)\b/i);
                    const hasEventPattern = text.match(/\b(event|gala|soirée|reception|launch|exhibition|showcase|experience|gathering)\b/i);

                    if (hasLuxuryKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for luxury event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCLuxuryLifestyleEvents'
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

        // Check for valid luxury/lifestyle keywords
        const validKeywords = [
            'luxury', 'lifestyle', 'exclusive', 'premium', 'elite', 'VIP',
            'high-end', 'upscale', 'sophisticated', 'event', 'gala', 'soirée',
            'reception', 'launch', 'exhibition', 'showcase', 'experience'
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
  const scraper = new NYCLuxuryLifestyleEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCLuxuryLifestyleEvents = NYCLuxuryLifestyleEvents;