const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class GlenbowMuseumScraper {
    constructor() {
        this.source = 'Glenbow Museum';
        this.baseUrl = 'https://glenbow-museum.com';
        this.eventsUrl = 'https://glenbow-museum.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://www.glenbow.org/blog/');
            const $ = cheerio.load(response.data);
            const events = [];

            // Look for events in blog posts since museum is under renovation
            $('.post-item, .blog-post, article').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h1, h2, h3, .post-title').first().text().trim();
                const date = $element.find('.date, .post-date, time').first().text().trim();
                const description = $element.find('.excerpt, .summary, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title && (title.toLowerCase().includes('event') || title.toLowerCase().includes('exhibition') || title.toLowerCase().includes('day'))) {
                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Glenbow Museum event or exhibition`,
                        date: date || 'TBA',
                        venue: { name: this.source, address: '130 9 Avenue SE, Calgary, AB T2G 0P3', city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : 'https://www.glenbow.org' + link) : 'https://www.glenbow.org',
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
  const scraper = new GlenbowMuseumScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

