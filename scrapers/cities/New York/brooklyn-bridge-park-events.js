/**
 * Brooklyn Bridge Park Events Scraper
 *
 * Scrapes events from Brooklyn Bridge Park
 * URL: https://www.brooklynbridgepark.org
 */

const axios = require('axios');
const cheerio = require('cheerio');

class BrooklynBridgeParkEvents {
    constructor() {
        this.venueName = 'Brooklyn Bridge Park';
        this.venueLocation = '334 Furman St, Brooklyn, NY 11201';
        this.baseUrl = 'https://www.brooklynbridgepark.org';
        this.eventsUrl = 'https://www.brooklynbridgepark.org';
        this.category = 'Waterfront Park Events';
    }

    /**
     * Scrape events from Brooklyn Bridge Park
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🌉 Scraping events from ${this.venueName}...`);

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

            // Look for park-specific event containers
            const eventSelectors = [
                '.park-event', '.outdoor-event', '.waterfront-event',
                '.event-item', '.event-card', '.event', '.activity',
                '[class*="event"]', '[class*="activity"]', '[class*="program"]',
                '.card', '.content-card', '.calendar-item', '.listing'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .activity-title, .name, .headline').first().text().trim();

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
                            '.calendar-date', '.activity-date'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateText = dateElement.text().trim();
                                if (dateText && dateText.length < 100) break;
                            }
                        }

                        // Look for location within park
                        let parkLocation = this.venueLocation;
                        const locationSelectors = ['.location', '.where', '.pier', '.area', '[class*="location"]'];
                        for (const locSelector of locationSelectors) {
                            const locElement = $el.find(locSelector).first();
                            if (locElement.length > 0) {
                                const locText = locElement.text().trim();
                                if (locText && locText.length > 0) {
                                    parkLocation = `${locText}, Brooklyn Bridge Park, Brooklyn, NY`;
                                    break;
                                }
                            }
                        }

                        // Look for age group
                        let ageGroup = '';
                        const ageSelectors = ['.age-group', '.ages', '.for-ages', '[class*="age"]'];
                        for (const ageSelector of ageSelectors) {
                            const ageElement = $el.find(ageSelector).first();
                            if (ageElement.length > 0) {
                                ageGroup = ageElement.text().trim();
                                if (ageGroup) break;
                            }
                        }

                        // Look for activity type
                        let activityType = '';
                        const typeSelectors = ['.type', '.category', '.activity-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                activityType = typeElement.text().trim();
                                if (activityType) break;
                            }
                        }

                        // Look for cost/registration
                        let cost = '';
                        const costSelectors = ['.cost', '.price', '.fee', '.registration', '[class*="cost"]'];
                        for (const costSelector of costSelectors) {
                            const costElement = $el.find(costSelector).first();
                            if (costElement.length > 0) {
                                cost = costElement.text().trim();
                                if (cost) break;
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
                            location: parkLocation,
                            date: dateText || 'Check website for dates',
                            category: this.category,
                            ageGroup: ageGroup,
                            activityType: activityType,
                            cost: cost,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'BrooklynBridgeParkEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for general park activities and events
            $('div, section, article, p').each((index, element) => {
                if (index > 120) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 25 && text.length < 400) {
                    const hasParkKeywords = text.match(/\b(park|waterfront|pier|bridge|outdoor|activities|family|kids|exercise|yoga|concert|festival)\b/i);
                    const hasDatePattern = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|weekend|saturday|sunday)\b/i);

                    if (hasParkKeywords && hasDatePattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 15);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 20) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: hasDatePattern[0] || 'Check website for dates',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'BrooklynBridgeParkEvents'
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
     * Remove duplicate events based on title
     * @param {Array} events - Array of event objects
     * @returns {Array} Deduplicated events
     */
    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = event.title.toLowerCase().trim();
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
        if (!title || title.length < 10 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'directions'
        ];

        // Check for valid park activity keywords
        const validKeywords = [
            'park', 'outdoor', 'waterfront', 'family', 'kids', 'exercise',
            'yoga', 'fitness', 'walk', 'tour', 'concert', 'festival',
            'activity', 'program', 'class', 'workshop'
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

    /**
     * Fetch events (standard interface method)
     * @returns {Promise<Array>} Array of event objects
     */
    async fetchEvents() {
        return await this.scrape();
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new BrooklynBridgeParkEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.BrooklynBridgeParkEvents = BrooklynBridgeParkEvents;