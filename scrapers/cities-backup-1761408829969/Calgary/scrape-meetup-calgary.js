const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

class MeetupCalgaryScraper {
    constructor() {
        this.source = 'Meetup Calgary';
        this.baseUrl = 'https://meetup-calgary.com';
        this.eventsUrl = 'https://meetup-calgary.com/events';
        this.city = 'Calgary';
        this.province = 'Alberta';
    }

    async scrapeEvents() {
        try {
            console.log(`🎪 Scraping events from ${this.source}...`);
            
            const response = await axios.get('https://www.meetup.com/find/?location=ca--ab--calgary&source=EVENTS');
            const $ = cheerio.load(response.data);
            const events = [];

            $('.event-card, .eventCard, [data-testid="event-card"]').each((index, element) => {
                const $element = $(element);
                const title = $element.find('h3, h4, .event-title, [data-testid="event-title"]').first().text().trim();
                const date = $element.find('.date, .event-date, time, [data-testid="event-time"]').first().text().trim();
                const description = $element.find('.description, .event-description, p').first().text().trim();
                const link = $element.find('a').first().attr('href');

                if (title) {
                    events.push({
                        id: uuidv4(),
                        title: title,
                        description: description && description.length > 20 ? description : `${title} - Calgary Meetup event`,
                        date: date || 'TBA',
                        venue: { name: this.source, city: 'Calgary' },
                        city: this.city,
                        province: this.province,
                        url: link ? (link.startsWith('http') ? link : 'https://www.meetup.com' + link) : this.eventsUrl,
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
  const scraper = new MeetupCalgaryScraper();
  return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;

