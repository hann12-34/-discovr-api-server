/**
 * NYC Ferry Events Scraper
 *
 * Scrapes events from NYC Ferry system (special cruises, seasonal events)
 * URL: https://www.ferry.nyc
 */

const axios = require('axios');
const cheerio = require('cheerio');

class NYCFerryEvents {
    constructor() {
        this.venueName = 'NYC Ferry';
        this.venueLocation = 'Various NYC Ferry Terminals';
        this.baseUrl = 'https://www.ferry.nyc';
        this.eventsUrl = 'https://www.ferry.nyc';
        this.category = 'Ferry & Harbor Transportation';
    }

    /**
     * Scrape events from NYC Ferry
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`⛴️ Scraping events from ${this.venueName}...`);

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

            // Look for ferry-specific event containers
            const eventSelectors = [
                '.ferry-event', '.special-cruise', '.seasonal-service',
                '.event-item', '.event-card', '.event', '.service-alert',
                '[class*="event"]', '[class*="cruise"]', '[class*="service"]',
                '.card', '.content-card', '.announcement', '.notice'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .service-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        // Look for date/schedule information
                        let dateText = '';
                        const dateSelectors = [
                            '.date', '.event-date', '[class*="date"]',
                            'time', '.datetime', '.when', '.schedule', '.time-info',
                            '.departure', '.arrival', '.service-date'
                        ];

                        for (const dateSelector of dateSelectors) {
                            const dateElement = $el.find(dateSelector).first();
                            if (dateElement.length > 0) {
                                dateText = dateElement.text().trim();
                                if (dateText && dateText.length < 100) break;
                            }
                        }

                        // Look for route information
                        let route = '';
                        const routeSelectors = ['.route', '.line', '.service', '[class*="route"]'];
                        for (const routeSelector of routeSelectors) {
                            const routeElement = $el.find(routeSelector).first();
                            if (routeElement.length > 0) {
                                route = routeElement.text().trim();
                                if (route) break;
                            }
                        }

                        // Look for terminal information
                        let terminal = '';
                        const terminalSelectors = ['.terminal', '.dock', '.pier', '[class*="terminal"]', '.location'];
                        for (const terminalSelector of terminalSelectors) {
                            const terminalElement = $el.find(terminalSelector).first();
                            if (terminalElement.length > 0) {
                                terminal = terminalElement.text().trim();
                                if (terminal) break;
                            }
                        }

                        // Look for service type
                        let serviceType = '';
                        const typeSelectors = ['.type', '.category', '.service-type', '[class*="type"]'];
                        for (const typeSelector of typeSelectors) {
                            const typeElement = $el.find(typeSelector).first();
                            if (typeElement.length > 0) {
                                serviceType = typeElement.text().trim();
                                if (serviceType) break;
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
                            location: terminal ? `${terminal}, NYC` : this.venueLocation,
                            date: dateText || 'Check website for schedules',
                            category: this.category,
                            route: route,
                            serviceType: serviceType,
                            description: description,
                            link: eventLink || this.eventsUrl,
                            source: 'NYCFerryEvents'
                        };

                        events.push(event);
                    }
                };
            };

            // Look for schedule and service announcements
            $('div, section, article, p').each((index, element) => {
                if (index > 150) return false; // Limit processing

                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 20 && text.length < 400) {
                    const hasFerryKeywords = text.match(/\b(ferry|dock|terminal|pier|route|service|cruise|boat|harbor|waterway)\b/i);
                    const hasTimePattern = text.match(/\b(\d{1,2}:\d{2}|am|pm|schedule|departure|arrival|\d{1,2}\/\d{1,2}\b/i);

                    if (hasFerryKeywords && hasTimePattern) {
                        const sentences = text.split('.').filter(sentence => sentence.trim().length > 10);
                        const title = sentences[0]?.trim() || '';

                        if (title && this.isValidEvent(title) && title.length > 15) {
                            const event = {
                                title: title.length > 150 ? title.substring(0, 150) + '...' : title,
                                venue: this.venueName,
                                location: this.venueLocation,
                                date: hasTimePattern[0] || 'Check website for schedules',
                                category: this.category,
                                link: this.eventsUrl,
                                source: 'NYCFerryEvents'
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
            'click here', 'find out', 'discover', 'buy tickets'
        ];

        // Check for valid ferry-related keywords
        const validKeywords = [
            'ferry', 'service', 'route', 'dock', 'terminal', 'pier',
            'cruise', 'boat', 'harbor', 'schedule', 'departure'
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
  const scraper = new NYCFerryEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.NYCFerryEvents = NYCFerryEvents;