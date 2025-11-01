const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class StudioBellScraper {
    constructor() {
        this.source = 'Studio Bell';
        this.baseUrl = 'https://studio-bell.com';
        this.eventsUrl = 'https://studio-bell.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://www.studiobell.ca/whats-on');
            const $ = cheerio.load(response.data);
            const events = [];

            $('.event-item, .event-card, [data-event], .mb-4').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h1, h2, h3, h4, .event-title, .title').first().text().trim();
                const date = $element.find('.date, .event-date, time').first().text().trim();
                const description = $element.find('.description, .summary, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title && title.length > 3) {
                    // Extract date

                    const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();


                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Event at Studio Bell - National Music Centre`,
                        date: date || 'TBA',
                        venue: { name: this.source, address: '850 4 Street SE, Calgary, AB T2G 1R1', city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : 'https://www.studiobell.ca' + link) : 'https://www.studiobell.ca/whats-on',
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
  const scraper = new StudioBellScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

