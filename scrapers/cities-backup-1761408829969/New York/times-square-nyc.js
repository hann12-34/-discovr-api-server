const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTimesSquareNYC() {
    console.log('🎆 Scraping events from Times Square NYC...');
    
    try {
        const response = await axios.get('https://www.timessquarenyc.org/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Basic event extraction
        $('.event, .event-item, [class*="event"]').each((index, element) => {
            if (index > 20) return false;
            const $el = $(element);
            const title = $el.find('h1, h2, h3, .title').first().text().trim();
            
            if (title && title.length > 5 && title.length < 200) {
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Times Square NYC', address: 'Times Square, New York, NY 10036', city: 'New York' },
                    location: 'Times Square, New York, NY',
                    date: 'Check website for dates',
                    category: 'Street Events & Festivals',
                    link: 'https://www.timessquarenyc.org/events',
                    source: 'TimesSquareNYC'
                });
            }
        });

        console.log(`✅ Times Square NYC: Found ${events.length} events`);
        return filterEvents(events);

    } catch (error) {
        console.error(`❌ Error scraping Times Square NYC: ${error.message}`);
        return [];
    }
}

module.exports = scrapeTimesSquareNYC;
