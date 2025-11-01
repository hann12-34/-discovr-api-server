const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class OsheagaFestivalEvents {
    constructor() {
        this.name = 'Osheaga Music & Arts Festival';
        this.eventsUrl = 'https://osheaga.com/en';
        this.source = 'osheaga-festival';
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

            // Look for real events only - no hardcoded fallback events

            // Look for events with comprehensive selectors
            $('.event, .artist, .lineup-item, article, .card, .festival-event, .concert, .show, .performance, .artist-event, .festival-show, .calendar-event, .upcoming-event, [data-event], [data-artist], .wp-block-group, .entry, .lineup-artist, h1, h2, h3, h4, .wp-block-heading, .artist-name, .performer').each((index, element) => {
                try {
                    const $element = $(element);
                    const title = $element.find('h1, h2, h3, h4, .title, .event-title, .name, .artist-name').first().text().trim() ||
                                  $element.text().trim();
                    
                    if (!title || title.length < 5 || title.length > 150) return;
                    
                    // Filter out non-event content
                    const lowercaseTitle = title.toLowerCase();
                    if (lowercaseTitle.includes('cookie') || 
                        lowercaseTitle.includes('newsletter') ||
                        lowercaseTitle.includes('menu') ||
                        lowercaseTitle.includes('contact') ||
                        lowercaseTitle.includes('about') ||
                        lowercaseTitle.includes('subscribe')) return;

                    const description = $(element).find('.description, .summary, .excerpt, p').first().text().trim();
                    const dateText = $(element).find('.date, .event-date, .when, time').first().text().trim();
                    
                    // Create events based on any content that might be related to the festival
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} - Osheaga Music & Arts Festival`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Parc Jean-Drapeau',
                            address: '1 Circuit Gilles Villeneuve, Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5050,
                            longitude: -73.5344
                        },
                        city: this.city,
                        province: this.province,
                        category: 'Music Festival',
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

            return filterEvents(events);
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
  const scraper = new OsheagaFestivalEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
