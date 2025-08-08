const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Joyce Theater Events Scraper
 * Scrapes events from Joyce Theater's official website
 */
class JoyceBeatEvents {
    constructor() {
        this.venueName = 'Joyce Theater';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.joyce.org';
        this.eventsUrl = 'https://www.joyce.org/performances';
        this.category = 'Dance & Performance Art';
    }

    /**
     * Main scraping method to fetch events from Joyce Theater
     */
    async scrape() {
        console.log(`💃 Scraping events from ${this.venueName}...`);

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

            // Approach 1: Look for Joyce Theater dance/performance containers
            $('.event-card, .event-item, .show-card, .performance-card, .calendar-event').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .title, .event-title, .show-title, .performance-title').first().text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .summary, .event-description').first().text().trim();
                const dateText = $el.find('.date, .event-date, .time, .when, .show-date, .performance-date').text().trim();
                const company = $el.find('.company, .troupe, .artist, .performer, .dance-company').text().trim();

                if (title && title.length > 8 && this.isValidEvent(title)) {
                    events.push(this.createEvent(title, description, dateText, $el.find('a').first().attr('href'), company));
                }
            };

            // Approach 2: Look for dance/performance content with Joyce Theater keywords
            $('div, section, article').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 50 && text.length < 280) {
                    const hasJoyceKeywords = text.match(/\b(Joyce Theater|dance|performance|ballet|modern|contemporary|live|venue)\b/i);
                    const hasEventKeywords = text.match(/\b(dance|performance|ballet|contemporary|modern|troupe|company|choreography)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|tonight|tomorrow|weekend|upcoming|schedule|evening|matinee|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasJoyceKeywords && hasEventKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 15);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 10).join(' ');

                        if (eventTitle && eventTitle.length > 12 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 200), '', '', ''));
                        }
                    }
                }
            };

            // Approach 3: Look for dance company and choreographer names
            $('h1, h2, h3, h4, .headline, .company-name, .choreographer-name, .troupe-name').each((index, element) => {
                if (index > 80) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const parentText = $el.parent().text().trim();

                if (title && title.length > 6 && title.length < 100 && this.isValidEvent(title)) {
                    if (parentText.match(/\b(Joyce|theater|dance|performance|ballet|tickets|contemporary|live|venue)\b/i)) {
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
            /^(joyce|theater|theatre|dance|event|performance|ballet|modern)$/i,
            /^\s*$/,
            /^.{1,4}$/,
            /^.{200,}$/
        ];

        return !invalidPatterns.some(pattern => pattern.test(title.trim()));
    }

    /**
     * Create a standardized event object
     */
    createEvent(title, description, date, link, company) {
        return {
            title: title.trim(),
            venue: this.venueName,
            location: this.venueLocation,
            date: date || 'Check website for performance times',
            category: this.category,
            description: description || '',
            company: company || '',
            link: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
            source: 'JoyceTheater'
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
  const scraper = new JoyceBeatEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.JoyceBeatEvents = JoyceBeatEvents;