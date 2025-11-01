const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Club Electric Avenue Events Scraper
 * Scrapes events from Club Electric Avenue in Montreal
 */
class ClubElectricAvenueEvents {
    constructor() {
        this.name = 'Club Electric Avenue';
        this.eventsUrl = 'https://clubelectricavenue.ca/events/';
        this.source = 'club-electric-avenue';
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

            // Look for event elements with nightclub-specific selectors
            // Enhanced selectors for club website + fallback parsing
            let eventElements = $('.event, .show, .concert, .party, article, .card, .listing, .programme, .evenement, .soiree, [data-event], [class*="event"], [class*="party"], [class*="night"]');
            
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return text.length > 15 && text.length < 400 && 
                           (text.includes('202') || text.includes('Dec') || text.includes('Jan') || text.includes('Feb')) &&
                           (text.includes('DJ') || text.includes('party') || text.includes('night') || text.includes('event'));
                });
            }
            
            eventElements.each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details, .excerpt').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .event-date').first().text().trim();
                    
                    // Create event object
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Club Electric Avenue`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Club Electric Avenue',
                            address: '1449 Rue Crescent, Montreal, QC H3G 2B4',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5017,
                            longitude: -73.5673
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
  const scraper = new ClubElectricAvenueEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
