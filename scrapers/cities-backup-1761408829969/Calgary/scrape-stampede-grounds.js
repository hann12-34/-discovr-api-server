const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Calgary Stampede Grounds Event Scraper
 * Major events venue including year-round activities
 * Website: https://calgarystampede.com
 */
class CalgaryStampedeGroundsEvents {
    constructor() {
        this.name = 'Calgary Stampede Grounds';
        this.eventsUrl = 'https://www.calgarystampede.com/events';
        this.source = 'calgary-stampede-grounds';
        this.city = 'Calgary';
        this.province = 'Alberta';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event elements on Calgary Stampede site
            $('.event-card, .event-item, .show-listing, article, .listing, .card').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, .title, .event-title').first().text().trim();
                    const dateText = $element.find('.date, .event-date, time, .when').first().text().trim();
                    const description = $element.find('.description, .event-description, p').first().text().trim();
                    
                    if (this.looksLikeEventTitle(title)) {
                        const eventData = {
                            id: uuidv4(),
                            name: title,
                            title: title,
                            description: description && description.length > 20 ? description : `${title} at Calgary Stampede Grounds`,
                            date: this.parseDate(dateText) || new Date(),
                            venue: { name: this.extractVenueInfo().name, city: 'Calgary' },
                            city: this.city,
                            province: this.province,
                            price: 'Check website for pricing',
                            category: this.determineCategory(title),
                            source: this.source,
                            url: this.eventsUrl,
                            scrapedAt: new Date()
                        };

                        events.push(eventData);
                    }
                } catch (error) {
                    console.log(`❌ Error extracting event ${index + 1}:`, error.message);
                }
            });

            console.log(`🎉 Successfully scraped ${events.length} events from ${this.source}`);
            return filterEvents(events);

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }

    looksLikeEventTitle(text) {
        const lowerText = text.toLowerCase();
        return text.length > 5 && text.length < 100 &&
               !lowerText.includes('stampede') &&
               !lowerText.includes('newsletter') &&
               !lowerText.includes('contact');
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

    determineCategory(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('rodeo') || lowerTitle.includes('bull')) {
            return 'Rodeo';
        } else if (lowerTitle.includes('concert') || lowerTitle.includes('music')) {
            return 'Concert';
        } else if (lowerTitle.includes('festival') || lowerTitle.includes('fair')) {
            return 'Festival';
        } else if (lowerTitle.includes('trade') || lowerTitle.includes('expo')) {
            return 'Trade Show';
        }
        return 'Event';
    }

    // REMOVED: generateStampedeEvents() - no fake events allowed
    // REMOVED: generateFutureDate() - was only used for fake events

    extractVenueInfo() {
        return {
            name: 'Calgary Stampede Grounds',
            address: '1410 Olympic Way SE, Calgary, AB T2G 2W1',
            city: this.city,
            province: this.province,
            latitude: 51.0386,
            longitude: -114.0462
        };
    }
}

// Export the scraper function
module.exports = async function scrapeCalgaryStampedeGroundsEvents() {
    const scraper = new CalgaryStampedeGroundsEvents();
    return await scraper.scrapeEvents();
};
