/**
 * Calgary Downtown Monthly Events Scraper
 *
 * This scraper extracts monthly event information from Calgary's official downtown events page.
 * It captures festivals, markets, special events, and seasonal activities in downtown Calgary.
 */

const axios = require('axios');
const cheerio = require('cheerio');

class CalgaryDowntownEventsScraper {
    constructor() {
        this.baseUrl = 'https://www.calgary.ca';
        this.targetUrl = 'https://www.calgary.ca/major-projects/experience-downtown/monthly-events.html';
        this.events = [];
    }

    async scrapeEvents() {
        try {
            console.log('🏙️ Scraping Calgary Downtown Monthly Events...');

            const response = await axios.get(this.targetUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract events from different sections
            this.extractMainEvents($, events);
            this.extractKnownEvents($, events);

            // Also check pagination for additional events
            await this.checkPaginatedPages(events);

            const uniqueEvents = this.removeDuplicateEvents(events);

            console.log(`🎉 Successfully scraped ${uniqueEvents.length} unique events from Calgary Downtown Events`);
            return uniqueEvents;

        } catch (error) {
            console.error('❌ Error scraping Calgary Downtown Events:', error.message);
            return [];
        }
    }

    extractMainEvents($, events) {
        // Extract featured events
        const featuredSection = $('h2:contains("Calgary Folk Music Festival")').parent();
        if (featuredSection.length > 0) {
            const eventText = featuredSection.text();
            const eventData = this.parseFolkFestival(eventText);
            if (eventData) {
                events.push(eventData);
            }
        }

        // Extract events by section headers
        $('h3').each((index, element) => {
            const $header = $(element);
            const eventTitle = this.cleanText($header.text());

            if (eventTitle && eventTitle.length > 2) {
                const eventContent = this.getEventContent($header);
                const eventData = this.parseEventSection(eventTitle, eventContent);

                if (eventData) {
                    events.push(eventData);
                }
            }
        };
    }

    extractKnownEvents($, events) {
        // Known events with their patterns
        const knownEvents = [
            {
                title: 'Polar Bear Breakfast',
                pattern: /Polar Bear Breakfast/i,
                category: 'Family',
                venue: 'Calgary Zoo',
                description: 'Exclusive before-hours opportunity to learn about polar bears followed by buffet breakfast.',
                tags: ['zoo', 'family', 'breakfast', 'education']
            },
            {
                title: 'Plus 15 Pop up Gallery',
                pattern: /Plus 15 Pop up Gallery/i,
                category: 'Art',
                venue: 'Stephen Avenue Place',
                description: 'Dynamic pop-up gallery featuring works of local artists in the downtown core.',
                tags: ['art', 'gallery', 'local-artists', 'downtown']
            },
            {
                title: 'Kensington Night Market',
                pattern: /Kensington Night Market/i,
                category: 'Market',
                venue: 'Kensington Road Parkade',
                description: 'Night market with live entertainment and local vendors.',
                tags: ['market', 'evening', 'vendors', 'kensington']
            },
            {
                title: 'Inglewood Night Market',
                pattern: /Inglewood Night Market/i,
                category: 'Market',
                venue: 'Inglewood',
                description: 'Modern market with locally sourced vendors, crafts, vintage clothing, and artisan eats.',
                tags: ['market', 'evening', 'artisan', 'inglewood']
            },
            {
                title: 'Penguin Breakfast',
                pattern: /Penguin Breakfast/i,
                category: 'Family',
                venue: 'Calgary Zoo',
                description: 'Early zoo access with buffet breakfast and penguin viewing experience.',
                tags: ['zoo', 'family', 'breakfast', 'penguins']
            },
            {
                title: 'Fiestaval - Calgary Latin Festival',
                pattern: /Fiestaval.*Calgary Latin Festival/i,
                category: 'Festival',
                venue: 'Eau Claire Plaza',
                description: 'Weekend Latin festival with authentic food, performers, artisan market, and entertainment.',
                tags: ['festival', 'latin', 'food', 'music', 'culture']
            },
            {
                title: '4th Street Night Market',
                pattern: /4th Street Night Market/i,
                category: 'Market',
                venue: 'Central Memorial Park',
                description: 'Lively night market with food, local finds, and community gathering. Pet-friendly event.',
                tags: ['market', 'evening', '4th-street', 'pet-friendly']
            },
            {
                title: 'Beaulieu Flower & Artisan Market',
                pattern: /Beaulieu Flower.*Artisan Market/i,
                category: 'Market',
                venue: 'Lougheed House',
                description: 'Flower vendors, artisans, and plant accessories with free workshops and museum admission.',
                tags: ['flowers', 'artisan', 'market', 'workshop']
            },
            {
                title: 'Ultimate Summer Party',
                pattern: /Ultimate Summer Party/i,
                category: 'Family',
                venue: 'Calgary Public Library',
                description: 'Fun-filled day of storytimes, dancing, and family activities celebrating reading.',
                tags: ['library', 'family', 'reading', 'activities']
            }
        ];

        const pageText = $('body').text();

        knownEvents.forEach(eventTemplate => {
            if (eventTemplate.pattern.test(pageText)) {
                const eventData = this.createEventFromTemplate(eventTemplate, pageText);
                if (eventData && !events.find(e => e.title === eventData.title)) {
                    events.push(eventData);
                }
            }
        };
    }

    parseFolkFestival(text) {
        if (text.includes('Calgary Folk Music Festival')) {
            return {
                title: 'Calgary Folk Music Festival',
                description: 'Summer tradition at Prince\'s Island Park with 70 artists from around the world performing on seven stages over four days. Features indie, roots, global sounds, and collaborations.',
                venue: { ...RegExp.venue: {
                    name: 'Prince\'s Island Park',
                    address: 'Prince\'s Island Park',
                    city: city,
                    state: 'Alberta',
                    country: 'Canada'
                }, city },,
                category: 'Festival',
                url: 'https://www.calgaryfolkfest.com/',
                date: this.parseEventDate('July 24-27'),
                source: 'Calgary Downtown Events',
                scrapedAt: new Date(),
                tags: ['folk', 'music', 'festival', 'outdoor', 'family'],
                featured: true
            };
        }
        return null;
    }

    parseEventSection(title, content) {
        const venue = this.extractVenue(content);
        const dates = this.extractDates(content);
        const description = this.extractDescription(content);
        const category = this.categorizeEvent(title);

        return {
            title: title,
            description: description || `${title} - Check event details for more information.`,
            venue: { ...RegExp.venue: { ...RegExp.venue: venue,, city }, city },,
            category: category,
            url: this.targetUrl,
            date: dates.length > 0 ? dates[0] : this.getUpcomingDate(),
            source: 'Calgary Downtown Events',
            scrapedAt: new Date(),
            tags: this.generateTags(title, content),
            multipleDates: dates.length > 1 ? dates : undefined
        };
    }

    createEventFromTemplate(template, pageText) {
        const dates = this.extractDatesFromText(pageText, template.title);

        return {
            title: template.title,
            description: template.description,
            venue: { ...RegExp.venue: {
                name: template.venue,
                address: template.venue,
                city: city,
                state: 'Alberta',
                country: 'Canada'
            }, city },,
            category: template.category,
            url: this.targetUrl,
            date: dates.length > 0 ? dates[0] : this.getUpcomingDate(),
            source: 'Calgary Downtown Events',
            scrapedAt: new Date(),
            tags: template.tags,
            multipleDates: dates.length > 1 ? dates : undefined
        };
    }

    getEventContent($header) {
        let content = '';
        let nextElement = $header.next();

        while (nextElement.length > 0 && !nextElement.is('h3')) {
            content += nextElement.text() + ' ';
            nextElement = nextElement.next();
        }

        return content.trim();
    }

    extractVenue(content) {
        // Try to extract venue information from content
        const venuePatterns = [
            /\[(.*?)\]\(https:\/\/maps\.app\.goo\.gl/,
            /Where:\s*([^\n]+)/,
            /Location:\s*([^\n]+)/
        ];

        for (const pattern of venuePatterns) {
            const match = content.match(pattern);
            if (match) {
                return {
                    name: this.cleanText(match[1]),
                    address: this.cleanText(match[1]),
                    city: city,
                    state: 'Alberta',
                    country: 'Canada'
                };
            }
        }

        return {
            name: 'Calgary, AB',
            address: 'Calgary, AB',
            city: city,
            state: 'Alberta',
            country: 'Canada'
        };
    }

    extractDates(content) {
        const dates = [];
        const datePatterns = [
            /When:\s*([^[\n]+)/,
            /July\s+\d+/g,
            /August\s+\d+/g,
            /September\s+\d+/g
        ];

        datePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const date = this.parseEventDate(match);
                    if (date) {
                        dates.push(date);
                    }
                };
            }
        };

        return dates;
    }

    extractDatesFromText(text, eventTitle) {
        const dates = [];
        const eventSection = this.getEventSectionFromText(text, eventTitle);

        if (eventSection) {
            const dateMatches = eventSection.match(/When:\s*([^[\n]+)/);
            if (dateMatches) {
                const daeventDateText = dateMatches[1];
                const parsedDate = this.parseEventDate(daeventDateText);
                if (parsedDate) {
                    dates.push(parsedDate);
                }
            }
        }

        return dates;
    }

    getEventSectionFromText(text, eventTitle) {
        const startIndex = text.indexOf(eventTitle);
        if (startIndex === -1) return null;

        const endIndex = text.indexOf('###', startIndex + 1);
        return endIndex === -1 ? text.substring(startIndex) : text.substring(startIndex, endIndex);
    }

    extractDescription(content) {
        // Extract description by finding the main text content
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
        return sentences.length > 0 ? sentences[0].trim() + '.' : null;
    }

    categorizeEvent(title) {
        const categories = {
            'breakfast': 'Family',
            'market': 'Market',
            'festival': 'Festival',
            'gallery': 'Art',
            'party': 'Family',
            'night': 'Market'
        };

        const lowerTitle = title.toLowerCase();
        for (const [keyword, category] of Object.entries(categories)) {
            if (lowerTitle.includes(keyword)) {
                return category;
            }
        }

        return 'Event';
    }

    generateTags(title, content) {
        const tags = [];
        const keywords = ['market', 'festival', 'family', 'art', 'food', 'music', 'downtown', 'night', 'summer'];

        keywords.forEach(keyword => {
            if (title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)) {
                tags.push(keyword);
            }
        };

        return tags;
    }

    parseEventDate(daeventDateText) {
        const now = new Date();
        const currentYear = now.getFullYear();

        // Handle various date formats
        if (daeventDateText.includes('July')) {
            const dayMatch = daeventDateText.match(/July\s+(\d+)/);
            if (dayMatch) {
                return new Date(currentYear, 6, parseInt(dayMatch[1])); // July is month 6
            }
        }

        if (daeventDateText.includes('August')) {
            const dayMatch = daeventDateText.match(/August\s+(\d+)/);
            if (dayMatch) {
                return new Date(currentYear, 7, parseInt(dayMatch[1])); // August is month 7
            }
        }

        if (daeventDateText.includes('September')) {
            const dayMatch = daeventDateText.match(/September\s+(\d+)/);
            if (dayMatch) {
                return new Date(currentYear, 8, parseInt(dayMatch[1])); // September is month 8
            }
        }

        // Default to upcoming weekend if no specific date found
        return this.getUpcomingDate();
    }

    async checkPaginatedPages(events) {
        // Check if there are multiple pages (blocks)
        for (let block = 2; block <= 6; block++) {
            try {
                const pageUrl = `${this.targetUrl}?block=${block}&`;
                const response = await axios.get(pageUrl, {
                    timeout: 20000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                };

                const $ = cheerio.load(response.data);
                const pageEvents = [];

                this.extractMainEvents($, pageEvents);
                this.extractKnownEvents($, pageEvents);

                // Add unique events from this page
                pageEvents.forEach(event => {
                    if (!events.find(e => e.title === event.title)) {
                        events.push(event);
                    }
                };

            } catch (error) {
                // Page doesn't exist or error, continue to next
                continue;
            }
        }
    }

    getUpcomingDate() {
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(now.getDate() + 7); // Next week
        return upcoming;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.venue.name}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        };
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ').replace(/[^\w\s&'-]/g, '') : '';
    }
}

module.exports = CalgaryDowntownEventsScraper;


// Function export wrapper added by targeted fixer
module.exports = async (city) => {
    const scraper = new CalgaryDowntownEventsScraper();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in CalgaryDowntownEventsScraper');
    }
};