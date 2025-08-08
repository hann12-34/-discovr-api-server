/**
 * NYC Tourism & Conventions Bureau Events Scraper
 *
 * Scrapes events from NYC Tourism & Conventions Bureau
 * URL: https://www.nycgo.com
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCTourismEvents {
    constructor() {
        this.venueName = 'NYC Tourism & Conventions Bureau';
        this.venueLocation = 'New York City, NY';
        this.baseUrl = 'https://www.nycgo.com';
        this.eventsUrl = 'https://www.nycgo.com/events';
        this.category = 'Tourism & City Events';
    }

    /**
     * Scrape events from NYC Tourism
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🗽 Scraping events from ${this.venueName}...`);

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

            // Look for tourism-specific event containers
            const eventSelectors = [
                '.event-item', '.event-card', '.event', '.tourism-event',
                '[class*="event"]', '.listing', '.attraction', '.activity',
                '.card', '.content-card', '.experience', '.tour',
                '.festival-item', '.show-item', '.nyc-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .attraction-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for date information
                        let dateText = '';
                        const dateSelectors = [
                            '.date', '.event-date', '[class*="date"]',
                            'time', '.datetime', '.when', '.schedule', '.time-info',
                            '.calendar-date', '.show-date'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateText = dateElement.text().trim();
                                if (dateText && dateText.length < 100) break;
                            }
                        }

                        // Look for venue/location
                        let location = this.venueLocation;
                        const locationSelectors = ['.venue', '.location', '.where', '[class*="venue"]', '.address'];
                        for (const locSelector of locationSelectors) {
                            const locElement = $el.find(locSelector).first();
                            if (locElement.length > 0) {
                                const locText = locElement.text().trim();
                                if (locText && locText.length > 0) {
                                    location = locText.length > 60 ? locText.substring(0, 60) + '...' : locText;
                                    break;
                                }
                            }
                        }

                        // Look for category/type
                        let category = this.category;
                        const categorySelectors = ['.category', '.type', '.genre', '[class*="category"]', '.tag'];
                        for (const catSelector of categorySelectors) {
                            const catElement = $el.find(catSelector).first();
                            if (catElement.length > 0) {
                                const catText = catElement.text().trim();
                                if (catText && catText.length > 0 && catText.length < 50) {
                                    category = catText;
                                    break;
                                }
                            }
                        }

                        // Look for neighborhood/borough
                        let neighborhood = '';
                        const neighborhoodSelectors = ['.neighborhood', '.borough', '.area', '[class*="neighborhood"]'];
                        for (const neighSelector of neighborhoodSelectors) {
                            const neighElement = $el.find(neighSelector).first();
                            if (neighElement.length > 0) {
                                neighborhood = neighElement.text().trim();
                                if (neighborhood) break;
                            }
                        }

                        // Look for price information
                        let priceInfo = '';
                        const priceSelectors = ['.price', '.cost', '[class*="price"]', '.admission', '.ticket'];
                        for (const priceSelector of priceSelectors) {
                            const priceElement = $el.find(priceSelector).first();
                            if (priceElement.length > 0) {
                                priceInfo = priceElement.text().trim();
                                if (priceInfo) break;
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
                            venue: this.venueName,
                            location: location,
                            date: dateText || 'Check website for dates',
                            category: category,
                            neighborhood: neighborhood,
                            priceInfo: priceInfo,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCTourismEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for structured JSON-LD data
            $('script[type="application/ld+json"]').each((index, element) => {
                try {
                    const jsonData = JSON.parse($(element).html());
                    if (jsonData && jsonData['@type'] === 'Event') {
                        const event = {
                            title: jsonData.name || 'NYC Tourism Event',
                            venue: jsonData.location?.name || this.venueName,
                            location: jsonData.location?.address?.streetAddress || this.venueLocation,
                            date: jsonData.startDate || 'Check website for dates',
                            category: this.category,
                            description: jsonData.description || '',
                            link: jsonData.url || this.eventsUrl,
                            source: 'NYCTourismEvents'
                        };

                        if (this.isValidEvent(event.title)) {
                            events.push(event);
                        }
                    }
                } catch (error) {
                    // Skip invalid JSON
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
     * Remove duplicate events based on title and date
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.date}`.toLowerCase();
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
        if (!title || title.length < 5 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'advertisement',
            'sponsored', 'see more', 'show more'
        ];

        const titleLower = title.toLowerCase();
        return !invalidKeywords.some(keyword => titleLower.includes(keyword));
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
  const scraper = new NYCTourismEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCTourismEvents = NYCTourismEvents;