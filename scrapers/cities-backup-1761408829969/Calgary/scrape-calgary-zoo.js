const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const CalgaryZooEvents = {
    async scrape(city) {
        console.log('🔍 Scraping events from Calgary Zoo...');
        try {
            
            const response = await axios.get('https://www.calgaryzoo.com/events/');
            const $ = cheerio.load(response.data);
            const events = [];

            $('h2').each((index, element) => {
                const $element = $(element);
                const title = $element.text().trim();
                const $parent = $element.parent();
                const link = $parent.find('a[href*="/events/"]').attr('href');

                
                // Extract description
                const description = $element.text().trim() || $element.closest('div').text().trim() || '';

                if (title && title.length > 5 && !title.toLowerCase().includes('special experiences') && !title.toLowerCase().includes('host')) {
                    events.push({
                        id: uuidv4(),
                        title,
                        date: null,
                        time: null,
                        url: link ? (link.startsWith('http') ? link : 'https://www.calgaryzoo.com' + link) : 'https://www.calgaryzoo.com/events/',
                        venue: { name: 'Calgary Zoo', address: '210 St. George's Drive NE, Calgary, AB T2E 7V6', city: 'Calgary' },
                        location: 'Calgary, AB',
                        description: description && description.length > 20 ? description : `${title} in Calgary`,
                        image: null
                    });
                }
            });

            console.log(`Found ${events.length} total events from Calgary Zoo`);
            return filterEvents(events);
        } catch (error) {
            console.error('Error scraping Calgary Zoo events:', error.message);
            return [];
        }
    }
};

module.exports = CalgaryZooEvents.scrape;
