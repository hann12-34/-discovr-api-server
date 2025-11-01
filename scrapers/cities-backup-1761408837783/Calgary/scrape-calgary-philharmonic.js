const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class CalgaryPhilharmonicScraper {
    constructor() {
        this.source = 'Calgary Philharmonic';
        this.baseUrl = 'https://calgary-philharmonic.com';
        this.eventsUrl = 'https://calgary-philharmonic.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://calgaryphil.com/events');
            const $ = cheerio.load(response.data);
            const events = [];

            $('.event-item, .concert-item, [data-event]').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h1, h2, h3, h4, .event-title, .concert-title').first().text().trim();
                const dateElement = $element.find('.date, .event-date, time');
                const date = dateElement.text().trim() || dateElement.attr('datetime') || 'TBA';
                const venue = $element.find('.venue, .location').text().trim();
                const description = $element.find('.description, .summary, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title && title.length > 3) {
                    // Extract date

                    const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();


                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Calgary Philharmonic concert: ${title}`,
                        date: date,
                        venue: { name: venue || this.source, city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : 'https://calgaryphil.com' + link) : 'https://calgaryphil.com/events',
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
  const scraper = new CalgaryPhilharmonicScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

