const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Madison Square Garden Events Scraper
 * Scrapes events from Madison Square Garden's official website
 */
class MadisonSquareGardenEvents {
    constructor() {
        this.venueName = 'Madison Square Garden';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.msg.com';
        this.eventsUrl = 'https://www.msg.com/madison-square-garden/events';
        this.category = 'Arena & Stadium Events';
    }

    /**
     * Main scraping method to fetch events from MSG
     */
    async scrape() {
        console.log(`🏟️ Scraping events from ${this.venueName}...`);

        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Approach 1: Look for structured event containers
            $('.event-card, .event-item, .show-item, .calendar-event').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .title, .event-title, .show-title').first().text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .summary, .details').first().text().trim();
                const dateText = $el.find('.date, .event-date, .time, .when').text().trim();

                if (title && title.length > 5 && this.isValidEvent(title)) {
                    events.push(this.createEvent(title, description, dateText, $el.find('a').first().attr('href')));
                }
            };

            // Approach 2: Look for any content with MSG event keywords
            $('div, section, article').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 30 && text.length < 200) {
                    const hasMSGKeywords = text.match(/\b(MSG|Madison Square Garden|concert|show|game|event|performance|tickets|live)\b/i);
                    const hasEventKeywords = text.match(/\b(event|concert|show|game|performance|live|tour|championship)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|tonight|tomorrow|weekend|upcoming|schedule|date)\b/i);

                    if (hasMSGKeywords && hasEventKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 10);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 8).join(' ');

                        if (eventTitle && eventTitle.length > 10 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 150), '', ''));
                        }
                    }
                }
            };

            console.log(`✅ ${this.venueName}: Found ${events.length} events`);
            return events;

        } catch (error) {
            console.log(`❌ Error scraping ${this.venueName}: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if the event title is valid and not navigation/generic content
     */
    isValidEvent(title) {
        const invalidPatterns = [
            /^(home|about|contact|tickets|schedule|calendar|events|shows|news|more|login|sign|search|menu|nav)$/i,
            /^(buy|get|find|see|view|click|learn|discover|explore|visit)$/i,
            /^(page|site|website|link|button|form|field|input|select|option)$/i,
            /^(the|and|or|but|for|with|from|this|that|these|those)$/i,
            /^\s*$/,
            /^.{1,5}$/,
            /^.{200,}$/
        ];

        return !invalidPatterns.some(pattern => pattern.test(title.trim()));
    }

    /**
     * Create a standardized event object
     */
    createEvent(title, description, date, link) {
        return {
            title: title.trim(),
            venue: this.venueName,
            location: this.venueLocation,
            date: date || 'Check website for dates',
            category: this.category,
            description: description || '',
            link: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
            source: 'MSG'
        };
    }

    /**
     * Alternative method name for backward compatibility
     */
    async fetchEvents() {
        return await this.scrape();
    }
}


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new MadisonSquareGardenEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.MadisonSquareGardenEvents = MadisonSquareGardenEvents;