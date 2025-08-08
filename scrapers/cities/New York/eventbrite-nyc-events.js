const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Eventbrite NYC Events Scraper
 * Scrapes events from Eventbrite's New York City events section
 */
class EventbriteNYCEvents {
    constructor() {
        this.venueName = 'Eventbrite NYC';
        this.venueLocation = 'New York City, NY';
        this.baseUrl = 'https://www.eventbrite.com';
        this.eventsUrl = 'https://www.eventbrite.com/d/ny--new-york/events/';
        this.category = 'NYC Events & Activities';
    }

    /**
     * Main scraping method to fetch events from Eventbrite NYC
     */
    async scrape() {
        console.log(`🎫 Scraping events from ${this.venueName}...`);

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

            // Approach 1: Look for Eventbrite event cards and listings
            $('.event-card, .event-item, .search-event-card, .card, .listing-card').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .event-title, .card-title, .listing-title, .event-name').first().text().trim() ||
                            $el.find('a').first().attr('title') ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .summary, .event-description, .card-text').first().text().trim();
                const dateText = $el.find('.date, .event-date, .time, .when, .event-time').text().trim();
                const location = $el.find('.location, .venue, .event-location').text().trim();

                if (title && title.length > 8 && this.isValidEvent(title)) {
                    events.push(this.createEvent(title, description, dateText, $el.find('a').first().attr('href'), location));
                }
            };

            // Approach 2: Look for structured content with NYC event keywords
            $('div[data-// realEvent removed by Universal 100% Engine
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 50 && text.length < 300) {
                    const hasNYCKeywords = text.match(/\b(NYC|New York|Manhattan|Brooklyn|Queens|Bronx|Staten Island)\b/i);
                    const hasEventKeywords = text.match(/\b(event|workshop|meetup|conference|seminar|class|tour|show|exhibition|festival|networking|training)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|today|tomorrow|weekend|this week|upcoming|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasNYCKeywords && hasEventKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 15);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 10).join(' ');

                        if (eventTitle && eventTitle.length > 10 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 200), '', '', ''));
                        }
                    }
                }
            };

            // Approach 3: Look for any content with event-related attributes
            $('[href*="event"], [data-event], [class*="event"]').each((index, element) => {
                if (index > 80) return false;
                const $el = $(element);
                const title = $el.text().trim() || $el.attr('title') || $el.attr('alt');

                if (title && title.length > 12 && title.length < 150 && this.isValidEvent(title)) {
                    const parentText = $el.parent().text().trim();
                    if (parentText.match(/\b(NYC|New York|event|workshop|meetup|conference)\b/i)) {
                        events.push(this.createEvent(title, parentText.substring(0, 150), '', $el.attr('href'), ''));
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
            /^(buy|get|find|see|view|click|learn|discover|explore|visit|register|signup)$/i,
            /^(page|site|website|link|button|form|field|input|select|option)$/i,
            /^(the|and|or|but|for|with|from|this|that|these|those|all|any|some)$/i,
            /^(eventbrite|event|events|new|york|nyc|city)$/i,
            /^\s*$/,
            /^.{1,6}$/,
            /^.{200,}$/
        ];

        return !invalidPatterns.some(pattern => pattern.test(title.trim()));
    }

    /**
     * Create a standardized event object
     */
    createEvent(title, description, date, link, location) {
        return {
            title: title.trim(),
            venue: this.venueName,
            location: location || this.venueLocation,
            date: date || 'Check website for dates',
            category: this.category,
            description: description || '',
            link: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
            source: 'EventbriteNYC'
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
  const scraper = new EventbriteNYCEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.EventbriteNYCEvents = EventbriteNYCEvents;