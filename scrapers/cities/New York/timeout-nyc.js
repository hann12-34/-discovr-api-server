/**
 * TimeOut NYC Events Scraper
 *
 * Scrapes events from TimeOut New York events calendar
 * URL: https://www.timeout.com/newyork
 */

const axios = require('axios');
const cheerio = require('cheerio');

class TimeoutNYC {
    constructor() {
        this.venueName = 'TimeOut New York';
        this.venueLocation = 'New York City, NY';
        this.baseUrl = 'https://www.timeout.com';
        this.eventsUrl = 'https://www.timeout.com/newyork';
        this.category = 'Entertainment & Culture';
    }

    /**
     * Scrape events from TimeOut NYC
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`📰 Scraping events from ${this.venueName}...`);

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

            // Look for article containers (TimeOut uses article tags for events)
            $('article, .card, .listing, .event-item, [class*="event"]').each((index, element) => {
                const $el = $(element);

                // Extract title from various heading selectors
                let title = $el.find('h1, h2, h3, h4, .headline, .title, .name').first().text().trim();

                if (!title) {
                    // Try link text if no heading found
                    title = $el.find('a').first().text().trim();
                }

                if (title && this.isValidEvent(title)) {
                    // Look for date information
                    let dateText = '';
                    const dateSelectors = [
                        '.date', '.event-date', '[class*="date"]',
                        'time', '.datetime', '.when', '.schedule',
                        '.meta', '.info', '[class*="time"]'
                    ];

                    for (const dateSelector of dateSelectors) {
                        const dateElement = $el.find(dateSelector).first();
                        if (dateElement.length > 0) {
                            dateText = dateElement.text().trim();
                            if (dateText && dateText.length < 100) break;
                        }
                    }

                    // Look for category/tag information
                    let category = this.category;
                    const categorySelectors = ['.tag', '.category', '.genre', '[class*="tag"]'];
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

                    // Look for venue/location
                    let location = this.venueLocation;
                    const locationSelectors = ['.venue', '.location', '.where', '[class*="venue"]'];
                    for (const locSelector of locationSelectors) {
                        const locElement = $el.find(locSelector).first();
                        if (locElement.length > 0) {
                            const locText = locElement.text().trim();
                            if (locText && locText.length > 0) {
                                location = locText;
                                break;
                            }
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
                        link: eventLink || this.eventsUrl,
                        source: 'TimeoutNYC'
                    };

                    events.push(event);
                }
            };

            // Also try to find events in link texts that might be event listings
            $('a').each((index, element) => {
                if (index > 200) return false; // Limit processing

                const $link = $(element);
                const linkText = $link.text().trim();
                const href = $link.attr('href') || '';

                // Check if link looks like an event
                if (linkText &&
                    linkText.length > 10 &&
                    linkText.length < 150 &&
                    this.isValidEvent(linkText) &&
                    (href.includes('event') || href.includes('show') || href.includes('concert') || href.includes('festival'))) {

                    let eventLink = href;
                    if (eventLink && !eventLink.startsWith('http')) {
                        eventLink = this.baseUrl + eventLink;
                    }

                    const event = {
                        title: linkText,
                        venue: this.venueName,
                        location: this.venueLocation,
                        date: 'Check website for dates',
                        category: this.category,
                        link: eventLink,
                        source: 'TimeoutNYC'
                    };

                    events.push(event);
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
        if (!title || title.length < 5 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'share',
            'timeout', 'advertisement', 'sponsored'
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
  const scraper = new TimeoutNYC();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TimeoutNYC = TimeoutNYC;