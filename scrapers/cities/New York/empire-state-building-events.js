/**
 * Empire State Building Events Scraper
 *
 * Scrapes events from Empire State Building official calendar
 * URL: https://www.esbnyc.com/visit
 */

const axios = require('axios');
const cheerio = require('cheerio');

class EmpireStateBuildingEvents {
    constructor() {
        this.venueName = 'Empire State Building';
        this.venueLocation = '20 W 34th St, New York, NY 10001';
        this.baseUrl = 'https://www.esbnyc.com';
        this.eventsUrl = 'https://www.esbnyc.com/visit';
        this.lightingUrl = 'https://www.esbnyc.com/about/tower-lights/calendar';
        this.category = 'Iconic Landmarks & Special Events';
    }

    /**
     * Scrape events from Empire State Building
     * @returns {Promise<Array>} Array of event objects
     */
    async scrape() {
        console.log(`🏢 Scraping events from ${this.venueName}...`);

        const events = [];

        try {
            // Scrape main visit page
            await this.scrapeMainPage(events);

            // Scrape tower lighting calendar
            await this.scrapeLightingCalendar(events);

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
     * Scrape main visit page for events
     * @param {Array} events - Events array to populate
     */
    async scrapeMainPage(events) {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: this.getHeaders(),
                timeout: 15000
            };

            const $ = cheerio.load(response.data);

            // Look for event containers
            const eventSelectors = [
                '.event-item', '.event-card', '.event', '.calendar-event',
                '[class*="event"]', '.listing', '.activity', '.special',
                '.card', '.content-card', '.visit-event'
            ];

            eventSelectors.forEach(selector => {
                $(selector).each((index, element) => {
                    const $el = $(element);
                    let title = $el.find('h1, h2, h3, h4, .title, .event-title, .name, .headline').first().text().trim();

                    if (!title) {
                        const textContent = $el.text().trim();
                        const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                        title = lines[0]?.trim() || '';
                    }

                    if (title && this.isValidEvent(title)) {
                        this.extractAndAddEvent($el, title, events);
                    }
                };
            };

        } catch (error) {
            console.error(`❌ Error scraping main page:`, error.message);
        }
    }

    /**
     * Scrape tower lighting calendar for special events
     * @param {Array} events - Events array to populate
     */
    async scrapeLightingCalendar(events) {
        try {
            const response = await axios.get(this.lightingUrl, {
                headers: this.getHeaders(),
                timeout: 15000
            };

            const $ = cheerio.load(response.data);

            // Look for lighting events/celebrations
            $('.lighting-event, .calendar-item, .light-schedule, [class*="light"], [class*="calendar"]').each((index, element) => {
                const $el = $(element);
                let title = $el.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();

                if (!title) {
                    const textContent = $el.text().trim();
                    if (textContent.length > 10 && textContent.length < 200) {
                        title = textContent.split('\n')[0].trim();
                    }
                }

                if (title && this.isValidLightingEvent(title)) {
                    // Add "Tower Lighting: " prefix to distinguish lighting events
                    title = `Tower Lighting: ${title}`;
                    this.extractAndAddEvent($el, title, events, 'Tower Lighting Events');
                }
            };

            // Also check for calendar table rows
            $('table tr, .table-row').each((index, element) => {
                const $row = $(element);
                const cells = $row.find('td, th, .cell').map((i, cell) => $(cell).text().trim()).get();

                if (cells.length >= 2) {
                    const dateCell = cells.find(cell => cell && cell.match(/\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i));
                    const eventCell = cells.find(cell => cell && cell.length > 5 && cell.length < 100 && cell !== dateCell);

                    if (eventCell && this.isValidLightingEvent(eventCell)) {
                        const event = {
                            title: `Tower Lighting: ${eventCell}`,
                            venue: this.venueName,
                            location: this.venueLocation,
                            date: dateCell || 'Check website for dates',
                            category: 'Tower Lighting Events',
                            link: this.lightingUrl,
                            source: 'EmpireStateBuildingEvents'
                        };

                        events.push(event);
                    }
                }
            };

        } catch (error) {
            console.error(`❌ Error scraping lighting calendar:`, error.message);
        }
    }

    /**
     * Extract event details and add to events array
     * @param {Object} $el - Cheerio element
     * @param {string} title - Event title
     * @param {Array} events - Events array
     * @param {string} customCategory - Custom category override
     */
    extractAndAddEvent($el, title, events, customCategory = null) {
        // Look for date information
        let dateText = '';
        const dateSelectors = [
            '.date', '.event-date', '[class*="date"]',
            'time', '.datetime', '.when', '.schedule', '.time-info'
        ];

        for (const dateSelector of dateSelectors) {
            const dateElement = $el.find(dateSelector).first();
            if (dateElement.length > 0) {
                dateText = dateElement.text().trim();
                if (dateText && dateText.length < 100) break;
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
            location: this.venueLocation,
            date: dateText || 'Check website for dates',
            category: customCategory || this.category,
            description: description,
            link: eventLink || this.eventsUrl,
            source: 'EmpireStateBuildingEvents'
        };

        events.push(event);
    }

    /**
     * Get standard headers for requests
     * @returns {Object} Headers object
     */
    getHeaders() {
        return {
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
        };
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
            'click here', 'find out', 'discover', 'buy tickets',
            'admission', 'directions', 'parking', 'hours'
        ];

        const titleLower = title.toLowerCase();
        return !invalidKeywords.some(keyword => titleLower.includes(keyword));
    }

    /**
     * Check if the extracted text represents a valid lighting event
     * @param {string} title - Event title to validate
     * @returns {boolean} Whether the title appears to be a valid lighting event
     */
    isValidLightingEvent(title) {
        if (!title || title.length < 3 || title.length > 200) return false;

        const validLightingKeywords = [
            'holiday', 'celebration', 'anniversary', 'memorial', 'tribute',
            'awareness', 'pride', 'national', 'international', 'day',
            'week', 'month', 'foundation', 'charity', 'honor'
        ];

        const titleLower = title.toLowerCase();
        return validLightingKeywords.some(keyword => titleLower.includes(keyword)) ||
               this.isValidEvent(title);
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
  const scraper = new EmpireStateBuildingEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.EmpireStateBuildingEvents = EmpireStateBuildingEvents;