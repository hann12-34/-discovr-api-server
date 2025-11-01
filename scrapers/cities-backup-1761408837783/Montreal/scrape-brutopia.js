const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Brutopia Events Scraper
 * Scrapes events from Brutopia in Montreal
 */
class BrutopiaEvents {
    constructor() {
        this.name = 'Brutopia';
        this.eventsUrl = 'https://brutopia.ca/programmation';
        this.source = 'brutopia';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            console.log(`🎵 Scraping events from ${this.source}...`);

            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event elements with expanded selectors
            $('.event, .event-item, .event-card, .show, .party, .listing, .card, .wp-block-group, .entry, .post, article, h1, h2, h3, h4, .wp-block-heading, .spectacle, .concert').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 150) return;
                    
                    // Filter out non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('newsletter')) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Brutopia`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Brutopia',
                            address: '1219 Rue Crescent, Montreal, QC H3G 2B1',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5023,
                            longitude: -73.5709
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Food & Drinks',
                        source: this.source,
                        scrapedAt: new Date()
                    };

                    if (this.isEventLive(eventData.date)) {
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

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new BrutopiaEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
