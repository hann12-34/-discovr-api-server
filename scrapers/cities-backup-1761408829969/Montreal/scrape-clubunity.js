const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

class ClubUnityEvents {
    constructor() {
        this.name = 'Club Unity';
        this.eventsUrl = 'https://clubunity.com/events';
        this.source = 'clubunity';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        try {
            const response = await axios.get(this.eventsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Club/nightlife selectors + aggressive text parsing
            let eventElements = $('.event, .show, .concert, .party, article, .card, .listing, .evenement, .soiree, .programme, [data-event], [class*="event"], [class*="party"], [class*="club"], .wp-block-group');
            
            if (eventElements.length === 0) {
                eventElements = $('*').filter(function() {
                    const text = $(this).text();
                    return text.length > 20 && text.length < 350 && 
                           (text.includes('2024') || text.includes('2025') || text.includes('Dec') || text.includes('Jan')) &&
                           (text.includes('DJ') || text.includes('party') || text.includes('night') || text.includes('club') || text.includes('event'));
                });
            }
            
            eventElements.each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title, .name').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Club Unity`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Club Unity',
                            address: 'Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5088,
                            longitude: -73.5878
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
                    console.log(`Error extracting event ${index + 1}:`, error.message);
                }
            });

            // Filter out junk/UI elements
            const filteredEvents = filterEvents(events);
            return filteredEvents;
        } catch (error) {
            console.error(`Error scraping ${this.source}:`, error.message);
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
  const scraper = new ClubUnityEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
