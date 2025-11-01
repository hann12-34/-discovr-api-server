const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class CalgaryStampedeScraper {
    constructor() {
        this.source = 'Calgary Stampede';
        this.baseUrl = 'https://calgary-stampede.com';
        this.eventsUrl = 'https://calgary-stampede.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://venues.calgarystampede.com/event-calendar/');
            const $ = cheerio.load(response.data);
            const events = [];

            $('.event-card, .event-item, .event-listing').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h3, h4, .event-title, .title').first().text().trim();
                const date = $element.find('.date, .event-date, time').first().text().trim();
                const description = $element.find('.description, .event-description, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title) {
                    // Extract date

                    const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();


                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Calgary Stampede event`,
                        date: date || 'TBA',
                        venue: { name: this.source, address: '1410 Olympic Way SE, Calgary, AB T2G 2W1', city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : this.baseUrl + link) : this.eventsUrl,
                        slug: slugify(title, { lower: true })
                    });
                }
            });

            console.log(`📅 Found ${events.length} events from ${this.source}`);
            return filterEvents(events);
        } catch (error) {
            console.log(`❌ Error scraping ${this.source}:`, error.message);
            return [];
        }
    }
}


// Wrapper function for class-based scraper
async function scrapeEvents() {
  const scraper = new CalgaryStampedeScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

