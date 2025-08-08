const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Citi Field Events Scraper
 * Scrapes events from Citi Field's official website (New York Mets)
 */
class CitiFieldEvents {
    constructor() {
        this.venueName = 'Citi Field';
        this.venueLocation = 'Queens, NY';
        this.baseUrl = 'https://www.mlb.com';
        this.eventsUrl = 'https://www.mlb.com/mets/schedule';
        this.category = 'Sports & Stadium Events';
    }

    /**
     * Main scraping method to fetch events from Citi Field
     */
    async scrape() {
        console.log(`⚾ Scraping events from ${this.venueName}...`);

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

            // Approach 1: Look for Citi Field/Mets game containers
            $('.game-card, .game-item, .schedule-item, .event-card, .matchup').each((index, element) => {
                const $el = $(element);
                const title = $el.find('h1, h2, h3, h4, .title, .game-title, .matchup-title').first().text().trim() ||
                            $el.find('.opponent, .visiting-team, .home-team').text().trim() ||
                            $el.find('a').first().text().trim();
                const description = $el.find('p, .description, .game-info, .details').first().text().trim();
                const dateText = $el.find('.date, .game-date, .time, .when, .schedule-date').text().trim();
                const opponent = $el.find('.opponent, .visiting-team, .away-team').text().trim();

                if (title && title.length > 5 && this.isValidEvent(title)) {
                    const gameTitle = opponent ? `Mets vs ${opponent}` : title;
                    events.push(this.createEvent(gameTitle, description, dateText, $el.find('a').first().attr('href')));
                }
            };

            // Approach 2: Look for baseball/sports content with Mets keywords
            $('div, section, article').each((index, element) => {
                if (index > 100) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.length > 40 && text.length < 250) {
                    const hasMetsKeywords = text.match(/\b(Mets|Citi Field|Queens|baseball|MLB|game|home|vs|against)\b/i);
                    const hasSportsKeywords = text.match(/\b(game|baseball|sport|match|playoff|season|inning|stadium|field|ballpark)\b/i);
                    const hasTimeKeywords = text.match(/\b(2024|2025|tonight|tomorrow|weekend|upcoming|schedule|season|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);

                    if (hasMetsKeywords && hasSportsKeywords && hasTimeKeywords) {
                        const lines = text.split('\n').filter(line => line.trim().length > 15);
                        const eventTitle = lines[0]?.trim() || text.split(' ').slice(0, 10).join(' ');

                        if (eventTitle && eventTitle.length > 10 && this.isValidEvent(eventTitle)) {
                            events.push(this.createEvent(eventTitle, text.substring(0, 180), '', ''));
                        }
                    }
                }
            };

            // Approach 3: Look for schedule and game information
            $('tr, .schedule-row, .game-row').each((index, element) => {
                if (index > 50) return false;
                const $el = $(element);
                const text = $el.text().trim();

                if (text.match(/\b(vs|@|Mets|game|time|date)\b/i) && text.length > 20 && text.length < 150) {
                    const gameInfo = text.replace(/\s+/g, ' ').trim();
                    if (this.isValidEvent(gameInfo)) {
                        events.push(this.createEvent(gameInfo, '', '', ''));
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
            /^(mets|citi|field|baseball|mlb|game|sport)$/i,
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
            date: date || 'Check schedule for game times',
            category: this.category,
            description: description || '',
            link: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
            source: 'CitiField'
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
  const scraper = new CitiFieldEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.CitiFieldEvents = CitiFieldEvents;