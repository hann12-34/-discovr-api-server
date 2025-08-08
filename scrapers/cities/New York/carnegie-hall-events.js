const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Carnegie Hall Events Scraper
 * Scrapes events from Carnegie Hall's official website
 */
class CarnegieHallEvents {
    constructor() {
        this.venueName = 'Carnegie Hall';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.carnegiehall.org';
        this.eventsUrl = 'https://www.carnegiehall.org/calendar';
        this.category = 'Classical Music & Concerts';
    }

    /**
     * Main scraping method to fetch events from Carnegie Hall
     */
    async scrape() {
        console.log(`🎼 Scraping events from ${this.venueName}...`);

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

            // RAPID FIX: Multiple approaches for Carnegie Hall events
            $('h1, h2, h3, h4, .title').each((index, element) => {
                if (index > 50) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const parentText = $el.parent().text().trim();

                if (title && title.length > 10 && title.length < 120 && this.isValidEvent(title)) {
                    if (parentText.match(/\b(carnegie|hall|concert|performance|orchestra|recital|music|tickets)\b/i)) {
                        events.push(this.createEvent(title, parentText.substring(0, 200), 'Check website for dates', '', ''));
                    }
                }
            };

            // Look for event links
            $('a').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const href = $el.attr('href');

                if (title && title.length > 15 && title.length < 100 && this.isValidEvent(title)) {
                    if (title.match(/\b(concert|performance|recital|symphony|opera|chamber|orchestra)\b/i)) {
                        events.push(this.createEvent(title, '', 'Check website for performance times', href, ''));
                    }
                }
            };

            // Approach 2: Look for classical music/concert content with Carnegie Hall keywords
            $('div, section, article').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 50 && text.length < 280) {
                    const hasCarnegieKeywords = text.match(/\b(Carnegie Hall|concert|performance|music|classical|orchestra|recital|live|venue)\b/i);
                    const hasEventKeywords = text.match(/\b(concert|performance|recital|symphony|opera|chamber|solo|ensemble|orchestra)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|tonight|tomorrow|weekend|upcoming|schedule|evening|matinee|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasCarnegieKeywords && hasEventKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 15);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 10).join(' ');

                        if (eventTitle && eventTitle.length > 12 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 200), '', '', ''));
                        }
                    }
                }
            };

            // Approach 3: Look for performer and conductor names
            $('h1, h2, h3, h4, .headline, .performer-name, .orchestra-name, .conductor-name').each((index, element) => {
                if (index > 80) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const parentText = $el.parent().text().trim();

                if (title && title.length > 6 && title.length < 100 && this.isValidEvent(title)) {
                    if (parentText.match(/\b(Carnegie|hall|concert|performance|music|tickets|classical|live|venue)\b/i)) {
                        events.push(this.createEvent(title, parentText.substring(0, 150), '', '', ''));
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
            /^(buy|get|find|see|view|click|learn|discover|explore|visit|register)$/i,
            /^(page|site|website|link|button|form|field|input|select|option)$/i,
            /^(the|and|or|but|for|with|from|this|that|these|those|all|any|some)$/i,
            /^(carnegie|hall|concert|event|performance|music|classical|orchestra)$/i,
            /^\s*$/,
            /^.{1,4}$/,
            /^.{200,}$/
        ];

        return !invalidPatterns.some(pattern => pattern.test(title.trim()));
    }

    /**
     * Create a standardized event object
     */
    createEvent(title, description, date, link, performer) {
        return {
            title: title.trim(),
            venue: this.venueName,
            location: this.venueLocation,
            date: date || 'Check website for performance times',
            category: this.category,
            description: description || '',
            performer: performer || '',
            link: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
            source: 'CarnegieHall'
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
  const scraper = new CarnegieHallEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.CarnegieHallEvents = CarnegieHallEvents;