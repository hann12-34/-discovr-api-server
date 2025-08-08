/**
 * NYC Beauty & Fashion Events Scraper
 *
 * Scrapes beauty and fashion events from NYC salons, boutiques, and fashion shows
 * URL: https://www.eventbrite.com/d/ny--new-york/fashion-beauty/
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCBeautyFashionEvents {
    constructor() {
        this.venueName = 'NYC Beauty & Fashion Events';
        this.venueLocation = 'Various NYC Salons, Boutiques & Fashion Venues';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/fashion-beauty/';
        this.category = 'Beauty & Fashion';
    }

    /**
     * Scrape events from NYC Beauty & Fashion Events
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`💄 Scraping events from ${this.venueName}...`);

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

            // Look for beauty/fashion-specific event containers
            const eventSelectors = [
                '.beauty-event', '.fashion-event', '.makeup-event',
                '.event-item', '.event-card', '.event', '.salon-event',
                '[class*="beauty"]', '[class*="fashion"]', '[class*="event"]',
                '.card', '.content-card', '.runway-event', '.styling-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .fashion-title, .name, .headline').first().text().trim();

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

                        // Look for venue/salon/boutique
                        let venue = this.venueLocation;
                        const venueSelectors = ['.venue', '.salon', '.boutique', '[class*="venue"]', '.studio', '.spa'];
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

                        // Look for service type
                        let serviceType = this.category;
                        const serviceSelectors = ['.service-type', '.category', '.treatment', '[class*="service"]'];
                        for (const serviceSelector of serviceSelectors) {
                            const serviceElement = $el.find(serviceSelector).first();
                            if (serviceElement.length > 0) {
                                const serviceText = serviceElement.text().trim();
                                if (serviceText && serviceText.length > 0) {
                                    serviceType = serviceText;
                                    break;
                                }
                            }
                        }

                        // Look for brand/designer
                        let brand = '';
                        const brandSelectors = ['.brand', '.designer', '.label', '[class*="brand"]'];
                        for (const brandSelector of brandSelectors) {
                            const brandElement = $el.find(brandSelector).first();
                            if (brandElement.length > 0) {
                                brand = brandElement.text().trim();
                                if (brand) break;
                            }
                        }

                        // Look for stylist/artist
                        let artist = '';
                        const artistSelectors = ['.stylist', '.artist', '.makeup-artist', '[class*="stylist"]'];
                        for (const artistSelector of artistSelectors) {
                            const artistElement = $el.find(artistSelector).first();
                            if (artistElement.length > 0) {
                                artist = artistElement.text().trim();
                                if (artist) break;
                            }
                        }

                        // Look for cost/price
                        let price = '';
                        const priceSelectors = ['.price', '.cost', '.fee', '[class*="price"]'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                const priceText = priceElement.text().trim();
                                if (priceText && (priceText.includes('$') || priceText.toLowerCase().includes('free'))) {
                                    price = priceText;
                                    break;
                                }
                            }
                        }

                        // Look for duration
                        let duration = '';
                        const durationSelectors = ['.duration', '.time', '.length', '[class*="duration"]'];
                        for (const durationSelector of durationSelectors) {
                            const durationElement = $el.find(durationSelector).first();
                            if (durationElement.length > 0) {
                                const durationText = durationElement.text().trim();
                                if (durationText && durationText.match(/\d+\s*(hour|hr|min|minute)/i)) {
                                    duration = durationText;
                                    break;
                                }
                            }
                        }

                        // Look for age restrictions
                        let ageRestriction = '';
                        const ageSelectors = ['.age-restriction', '.age-limit', '.minimum-age', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageRestriction = ageElement.text().trim();
                                if (ageRestriction) break;
                            }
                        }

                        // Look for booking requirement
                        let booking = '';
                        const bookingSelectors = ['.booking', '.appointment', '.reservation', '[class*="booking"]'];
                        for (const bookingSelector of bookingSelectors) {
                            const bookingElement = $el.find(bookingSelector).first();
                            if (bookingElement.length > 0) {
                                booking = bookingElement.text().trim();
                                if (booking) break;
                            }
                        }

                        // Look for special features/products
                        let features = '';
                        const featureSelectors = ['.features', '.products', '.special', '[class*="feature"]'];
                        for (const featureSelector of featureSelectors) {
                            const featureElement = $el.find(featureSelector).first();
                            if (featureElement.length > 0) {
                                features = featureElement.text().trim();
                                if (features) break;
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
                            date: dateTime || 'Check website for beauty & fashion event schedule',
                            category: serviceType,
                            brand: brand,
                            artist: artist,
                            price: price,
                            duration: duration,
                            ageRestriction: ageRestriction,
                            booking: booking,
                            features: features,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCBeautyFashionEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general beauty/fashion information
            $('div, section, article, p').each((index, element) => {
                if (index > 100) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 400) {
                    const hasBeautyFashionKeywords = text.match(/\b(beauty|fashion|makeup|hair|styling|salon|boutique|runway|designer|model)\b/i);
                    const hasEventPattern = text.match(/\b(event|show|class|workshop|makeover|styling|consultation|launch|preview)\b/i);

                    if (hasBeautyFashionKeywords && hasEventPattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: 'Check website for beauty & fashion event schedule',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCBeautyFashionEvents'
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

        // Check for valid beauty/fashion keywords
        const validKeywords = [
            'beauty', 'fashion', 'makeup', 'hair', 'styling', 'salon',
            'boutique', 'runway', 'designer', 'model', 'event', 'show',
            'class', 'workshop', 'makeover', 'consultation', 'launch'
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
  const scraper = new NYCBeautyFashionEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCBeautyFashionEvents = NYCBeautyFashionEvents;