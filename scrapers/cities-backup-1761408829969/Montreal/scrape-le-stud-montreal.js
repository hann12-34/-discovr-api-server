const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class LeStudMontrealEvents {
    constructor() {
        this.name = 'Le Stud Montreal';
        this.eventsUrl = 'https://www.lestudmontreal.com/evenements';
        this.source = 'le-stud-montreal';
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

            $('.event, .event-item, .evenement, article, .card, .post, .upcoming').each((index, element) => {
                try {
                    const title = $(element).find('h1, h2, h3, h4, .title, .event-title').first().text().trim();
                    if (!title) return;

                    const description = $(element).find('p, .description, .details, .excerpt').first().text().trim();
                    const dateText = $(element).find('.date, .dates, time, .event-date').first().text().trim();
                    
                    const eventData = {
                        id: uuidv4(),
                        name: title,
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - ${title} at Le Stud Montreal`,
                        date: this.parseDate(dateText) || new Date(),
                        venue: {
                            name: 'Le Stud Montreal',
                            address: '2015 Rue Sainte-Catherine E, Montreal, QC',
                            city: this.city,
                            province: this.province,
                            latitude: 45.5268,
                            longitude: -73.5656
                        },
                        city: this.city,
                        province: this.province,
                        category: 'LGBTQ+',
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
  const scraper = new LeStudMontrealEvents();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
