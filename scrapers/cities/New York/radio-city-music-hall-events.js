const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Radio City Music Hall Events Scraper
 * Scrapes events from Radio City Music Hall's official website
 */
class RadioCityMusicHallEvents {
    constructor() {
        this.venueName = 'Radio City Music Hall';
        this.venueLocation = 'New York, NY';
        this.baseUrl = 'https://www.radiocity.com';
        this.eventsUrl = 'https://www.radiocity.com/events-and-shows';
        this.category = 'Entertainment & Shows';
    }

    /**
     * Main scraping method to fetch events from Radio City Music Hall
     */
    async scrape() {
        console.log(`🎪 Scraping events from ${this.venueName}...`);

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

            // Approach 1: Look for Radio City event containers
            $('.event-card, .event-item, .show-card, .show-item, .calendar-event').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .title, .event-title, .show-title, .event-name').first().text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .summary, .event-description').first().text().trim();
                const dateText = $el.find('.date, .event-date, .time, .when, .show-date').text().trim();

                if (title && title.length > 8 && this.isValidEvent(title)) {
                    events.push(this.createEvent(title, description, dateText, $el.find('a').first().attr('href')));
                }
            };

            // Approach 2: Look for entertainment content with Radio City keywords
            $('div, section, article').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 50 && text.length < 280) {
                    const hasRadioCityKeywords = text.match(/\b(Radio City|Music Hall|Rockettes|Christmas Spectacular|show|concert|performance|tickets|entertainment)\b/i);
                    const hasEventKeywords = text.match(/\b(show|concert|performance|event|entertainment|tour|musical|comedy|dance|spectacular)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|tonight|tomorrow|weekend|upcoming|schedule|season|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasRadioCityKeywords && hasEventKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 15);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 10).join(' ');

                        if (eventTitle && eventTitle.length > 12 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 200), '', ''));
                        }
                    }
                }
            };

            // Approach 3: Look for show and performance titles
            $('h1, h2, h3, h4, .headline, .show-name, .performance-title').each((index, element) => {
                if (index > 60) return false;
                const $el = $(element);
                const title = $el.text().trim();
                const parentText = $el.parent().text().trim();

                if (title && title.length > 8 && title.length < 120 && this.isValidEvent(title)) {
                    if (parentText.match(/\b(Radio City|show|concert|performance|tickets|schedule|entertainment)\b/i)) {
                        events.push(this.createEvent(title, parentText.substring(0, 150), '', ''));
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
            /^(radio|city|music|hall|show|event|performance|concert)$/i,
            /^\s*$/,
            /^.{1,6}$/,
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
            source: 'RadioCityMusicHall'
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
  const scraper = new RadioCityMusicHallEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.RadioCityMusicHallEvents = RadioCityMusicHallEvents;