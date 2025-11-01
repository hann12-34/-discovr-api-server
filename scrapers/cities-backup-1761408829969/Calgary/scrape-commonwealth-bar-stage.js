const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Commonwealth Bar & Stage Event Scraper
 * Popular live music venue in Calgary
 * Website: https://www.thecommonwealth.ca/events
 */
class CommonwealthBarStageEvents {
    constructor() {
        this.name = 'Commonwealth Bar & Stage';
        this.eventsUrl = 'https://www.thecommonwealth.ca/events';
        this.source = 'commonwealth-bar-stage';
        this.city = 'Calgary';
        this.province = 'Alberta';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎸 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for Commonwealth event patterns
            $('.event-card, .event-item, .show-listing, article, .listing').each((index, element) => {
                try {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    if (!text || text.length < 10) return;
                    
                    // Extract event information
                    const title = $element.find('h1, h2, h3, .title, .event-title, .show-title').first().text().trim() ||
                                  $element.text().split('\n')[0].trim();
                    
                    const dateText = $element.find('.date, .event-date, time, .when').first().text().trim();
                    const description = $element.find('.description, .event-description, p').first().text().trim();
                    
                    if (this.looksLikeEventTitle(title)) {
                        const eventData = {
                            id: uuidv4(),
                            name: this.cleanEventTitle(title),
                            title: this.cleanEventTitle(title),
                            description: description && description.length > 20 ? description : `${title} at Commonwealth Bar & Stage`,
                            date: this.parseDate(dateText),  // No fallback - skip if no date
                            venue: { name: this.extractVenueInfo().name, city: 'Calgary' },
                            city: this.city,
                            province: this.province,
                            price: 'Check website for pricing',
                            category: this.determineCategory(title),
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        if (this.isEventLive(eventData.date)) {
                            events.push(eventData);
                        }
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            // No fallback events - return only real scraped events

            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} events from ${this.source}`);
            return uniqueEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    // REMOVED: generateCuratedEvents() - no fake events allowed

    looksLikeEventTitle(text) {
        const lowerText = text.toLowerCase();
        return text.length > 5 && text.length < 100 &&
               !lowerText.includes('commonwealth') &&
               !lowerText.includes('bar & stage') &&
               !lowerText.includes('newsletter') &&
               !lowerText.includes('contact');
    }

    cleanEventTitle(title) {
        return title.trim().replace(/^Event:\s*/i, '');
    }

    parseDate(dateString) {
        if (!dateString) return null;
        try {
            const parsedDate = new Date(dateString);
            return !isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now() ? parsedDate : null;
        } catch (error) {
            return null;
        }
    }

    // REMOVED: generateFutureDate() - was only used for fake events

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('rock') || lowerTitle.includes('metal')) {
            return 'Rock';
        } else if (lowerTitle.includes('folk') || lowerTitle.includes('acoustic')) {
            return 'Folk';
        } else if (lowerTitle.includes('jazz') || lowerTitle.includes('blues')) {
            return 'Jazz';
        } else if (lowerTitle.includes('electronic') || lowerTitle.includes('dj')) {
            return 'Electronic';
        } else if (lowerTitle.includes('country')) {
            return 'Country';
        }
        return 'Live Music';
    }

    extractVenueInfo() {
        return {
            name: 'Commonwealth Bar & Stage',
            address: '731 10 Ave SW, Calgary, AB T2R 0B3',
            city: this.city,
            province: this.province,
            latitude: 51.0447,
            longitude: -114.0759
        };
    }

    isEventLive(eventDate) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        return eventDate >= now && eventDate <= oneYearFromNow;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.name.toLowerCase()}-${event.date.toDateString()}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export the scraper function
module.exports = async function scrapeCommonwealthBarStageEvents() {
    const scraper = new CommonwealthBarStageEvents();
    return await scraper.scrapeEvents();
};
