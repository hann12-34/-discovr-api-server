/**
 * LiveNation NYC Events Scraper
 *
 * Scrapes events from LiveNation NYC venues and concerts
 * URL: https://www.livenation.com/venue/KovZpZA7AAEA/madison-square-garden-events
 */

const axios = require('axios');
const cheerio = require('cheerio');

class LiveNationNYC {
    constructor() {
        this.venueName = 'LiveNation NYC';
        this.venueLocation = 'Various NYC Venues';
        this.baseUrl = 'https://www.livenation.com';
        this.eventsUrl = 'https://www.livenation.com/venue/KovZpZA7AAEA/madison-square-garden-events';
        this.category = 'Concerts & Live Music';
    }

    /**
     * Scrape events from LiveNation NYC
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🎵 Scraping events from ${this.venueName}...`);

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

            // Extract real LiveNation concert data based on discovered structure
            console.log('🎵 Extracting LiveNation concerts with artists and showtimes...');

            // Look for H2/H3 headings that contain artist names
            $('h2, h3').each((index, element) => {
                const $el = $(element);
                const text = $el.text().trim();

                // Target headings with artist/concert names (not navigation)
                if (text.length > 5 && text.length < 150 &&
                    !text.match(/^(Explore|New York|About|Company|Newsletter|Advertise)/i) &&
                    (text.match(/\b(tour|show|live|concert|all-american|road show)\b/i) ||
                     text.match(/^[A-Z][a-z]+ [A-Z]/))) { // Artist name pattern

                    // Look for associated date information in nearby elements
                    let dateText = '';
                    const parent = $el.parent();
                    const siblings = $el.siblings();
                    const nextElements = $el.nextAll().slice(0, 3);

                    // Check current element and nearby elements for dates
                    const searchElements = [parent, ...siblings.toArray(), ...nextElements.toArray()];
                    searchElements.forEach(searchEl => {
                        const $searchEl = $(searchEl);
                        const searchText = $searchEl.text();
                        const dateMatch = searchText.match(/(mon|tue|wed|thu|fri|sat|sun)\s+[a-z]{3}\s+\d+.*\d+:\d+\s*(am|pm)/i);
                        if (dateMatch && !dateText) {
                            dateText = dateMatch[0];
                        }
                    };

                    // Also check the page for any date patterns related to this event
                    if (!dateText) {
                        $('div, span, p').each((i, dateEl) => {
                            const dateElText = $(dateEl).text().trim();
                            if (dateElText.match(/(jul|aug|sep|oct|nov|dec)\s+\d+,\s+\d{4}.*\d+:\d+\s*(am|pm)/i)) {
                                if (!dateText && dateElText.length < 100) {
                                    dateText = dateElText;
                                    return false; // Break
                                }
                            }
                        };
                    }

                    if (this.isValidEvent(text)) {
                        const event = {
                            title: text,
                            venue: 'Madison Square Garden', // From LiveNation MSG page
                            location: 'Madison Square Garden, New York, NY',
                            date: dateText || 'Check LiveNation for dates',
                            category: this.category,
                            description: `Live concert at Madison Square Garden`,
                            link: this.eventsUrl,
                            source: 'LiveNationNYC'
                        };
                        events.push(event);
                    }
                }
            };

            // If no events found with headings, try broader concert-related content
            if (events.length === 0) {
                console.log('🔍 No artist headings found, trying broader concert content...');

                $('div, section, li, article').each((index, element) => {
                    if (index > 200 || events.length >= 15) return false; // Limit processing

                    const $el = $(element);
                    const text = $el.text().trim();

                    if (text.length > 15 && text.length < 300) {
                        // Look for concert-related keywords with dates
                        const hasConcert = text.match(/\b(concert|tour|live|show|tickets|artist|performer|musician|band)\b/i);
                        const hasDate = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}\b/i);

                        if (hasConcert && hasDate) {
                            const lines = text.split('\n').filter(line => line.trim().length > 0);
                            const title = lines[0]?.trim() || text.slice(0, 50).trim();

                            if (title && this.isValidEvent(title)) {
                                const event = {
                                    title: title,
                                    venue: this.venueName,
                                    location: this.venueLocation,
                                    date: hasDate[0] || 'Check website for dates',
                                    category: this.category,
                                    description: 'Live concert event',
                                    link: this.eventsUrl,
                                    source: 'LiveNationNYC'
                                };
                                events.push(event);
                            }
                        }
                    }
                };
            }

            // Also look for JSON-LD structured data
            $('script[type="application/ld+json"]').each((index, element) => {
                try {
                    const jsonData = JSON.parse($(element).html());
                    if (jsonData['@type'] === 'Event' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Event'))) {
                        const eventData = Array.isArray(jsonData) ? jsonData.filter(item => item['@type'] === 'Event') : [jsonData];

                        eventData.forEach(eventItem => {
                            if (eventItem.name && this.isValidEvent(eventItem.name)) {
                                const event = {
                                    title: eventItem.name,
                                    venue: eventItem.location?.name || this.venueName,
                                    location: eventItem.location?.address?.addressLocality || this.venueLocation,
                                    date: eventItem.startDate || 'Check website for dates',
                                    category: this.category,
                                    link: eventItem.url || this.eventsUrl,
                                    source: 'LiveNationNYC'
                                };

                                events.push(event);
                            }
                        };
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
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
        if (!title || title.length < 3 || title.length > 200) return false;

        const invalidKeywords = [
            'home', 'about', 'contact', 'privacy', 'terms', 'cookie',
            'newsletter', 'subscribe', 'follow', 'social', 'menu',
            'navigation', 'search', 'login', 'register', 'sign up',
            'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
            'more info', 'read more', 'learn more', 'view all',
            'click here', 'find out', 'discover', 'advertisement',
            'sponsored', 'livenation', 'ticketmaster'
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
  const scraper = new LiveNationNYC();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.LiveNationNYC = LiveNationNYC;