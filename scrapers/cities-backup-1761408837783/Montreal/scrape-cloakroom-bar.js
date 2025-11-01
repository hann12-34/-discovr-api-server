const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Cloakroom Bar Events Scraper
 * Scrapes events from Cloakroom Bar in Montreal
 */
class CloakroomBarEvents {
    constructor() {
        this.name = 'Cloakroom Bar';
        this.eventsUrl = 'https://cloakroombar.ca/events';
        this.source = 'cloakroom-bar';
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

            // Look for event elements
            // Bar/lounge selectors + aggressive fallback parsing
            let eventElements = $('.event, .show, .concert, .party, article, .card, .listing, .evenement, .soiree, .programme, [data-event], [class*="event"], [class*="show"], [class*="music"]');
            
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return text.length > 20 && text.length < 300 && 
                           (text.includes('202') || text.includes('Dec') || text.includes('Jan')) &&
                           (text.includes('music') || text.includes('DJ') || text.includes('live') || text.includes('show'));
                });
            }
            
            eventElements.each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Cloakroom Bar`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Cloakroom Bar',
                            address: '2175 Rue de la Montagne, Montreal, QC H3G 1Z8',
                            city: this.city,
                            province: this.province,
                            latitude: 45.4957,
                            longitude: -73.5783
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Nightlife',
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
            // Translate French months to English
            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };

            let englishDateStr = dateStr;
            for (const [french, english] of Object.entries(frenchMonths)) {
                englishDateStr = englishDateStr.replace(new RegExp(french, 'gi'), english);
            }

            return new Date(englishDateStr);
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
  const scraper = new CloakroomBarEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;



