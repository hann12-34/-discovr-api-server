const axios = require('axios');
const cheerio = require('cheerio');

/**
 * TimeOut NYC Events Scraper
 * Scrapes events from TimeOut NYC's events section
 */
class TimeOutNYCEvents {
    constructor() {
        this.venueName = 'TimeOut NYC';
        this.venueLocation = 'New York City, NY';
        this.baseUrl = 'https://www.timeout.com';
        this.eventsUrl = 'https://www.timeout.com/newyork/things-to-do';
        this.category = 'NYC Events & Activities';
    }

    /**
     * Main scraping method to fetch events from TimeOut NYC
     */
    async scrape() {
        console.log(`🎭 Scraping events from ${this.venueName}...`);

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

            // Approach 1: Look for TimeOut event cards and listings
            $('.event-card, .event-item, .listing-item, .card, .article-card').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .title, .event-title, .card-title, .headline').first().text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .summary, .excerpt, .card-content').first().text().trim();
                const dateText = $el.find('.date, .event-date, .time, .when, .published').text().trim();

                if (title && title.length > 10 && this.isValidEvent(title)) {
                    events.push(this.createEvent(title, description, dateText, $el.find('a').first().attr('href')));
                }
            };

            // Approach 2: Look for article content with NYC event keywords
            $('article, .article, .content-item').each((index, element) => {
                if (index > 80) return false;
                const $el = $(element);
                const title = $el.find('h1, h2, h3, .headline, .title').first().text().trim();
                const text = $el.text().trim();

                if (title && title.length > 15 && text.length > 50 && text.length < 300) {
                    const hasNYCKeywords = text.match(/\b(NYC|New York|Manhattan|Brooklyn|Queens|Bronx|Staten Island|event|show|exhibition|tour|festival)\b/i);
                    const hasEventKeywords = text.match(/\b(event|show|exhibition|festival|tour|workshop|class|performance|concert|theater|museum|gallery)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|today|tomorrow|weekend|this week|upcoming|now|currently|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasNYCKeywords && hasEventKeywords && hasTimeKeywords && this.isValidEvent(title)) {
                        events.push(this.createEvent(title, text.substring(0, 200), '', $el.find('a').first().attr('href')));
                    }
                }
            };

            // Approach 3: Look for general content with NYC activity keywords
            $('div, section').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 60 && text.length < 250) {
                    const hasNYCKeywords = text.match(/\b(NYC|New York|Manhattan|Brooklyn|things to do|activities|events)\b/i);
                    const hasActivityKeywords = text.match(/\b(museum|gallery|theater|restaurant|bar|park|tour|show|exhibition|festival|concert|shopping|dining)\b/i);

                    if (hasNYCKeywords && hasActivityKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 20);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 12).join(' ');

                        if (eventTitle && eventTitle.length > 15 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 180), '', ''));
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
            /^(timeout|time|out|magazine|guide|list|best|top|new|york)$/i,
            /^\s*$/,
            /^.{1,8}$/,
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
            source: 'TimeOutNYC'
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
  const scraper = new TimeOutNYCEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TimeOutNYCEvents = TimeOutNYCEvents;