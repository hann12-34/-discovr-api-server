const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class FacebookEventsCalgaryScraper {
    constructor() {
        this.source = 'Facebook Events Calgary';
        this.baseUrl = 'https://facebook-events-calgary.com';
        this.eventsUrl = 'https://facebook-events-calgary.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://www.facebook.com/events/search/?q=calgary', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const events = [];

            $('[data-testid="event-card"], .event-card, ._1xnd').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h3, h4, [data-testid="event-title"], .event-title').first().text().trim();
                const date = $element.find('.event-date, time, [data-testid="event-time"]').first().text().trim();
                const location = $element.find('.event-location, [data-testid="event-location"]').first().text().trim();
                const description = $element.find('.event-description, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title && title.length > 3) {
                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Facebook event in Calgary: ${title}`,
                        date: date || 'TBA',
                        venue: { name: location || this.source, city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : 'https://www.facebook.com' + link) : 'https://www.facebook.com/events',
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
  const scraper = new FacebookEventsCalgaryScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

