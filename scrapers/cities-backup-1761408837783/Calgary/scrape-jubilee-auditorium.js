const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const JubileeAuditoriumEvents = {
    async scrape(city) {
        console.log('🔍 Scraping events from Jubilee Auditorium...');
        try {
            
            const response = await axios.get('https://www.jubileeauditorium.com/calgary/whats-on');
            const $ = cheerio.load(response.data);
            const events = [];

            $('a[href*="/calgary/"]').each((index, element) => {
                const $element = $(element);
                const title = $element.text().trim();
                const link = $element.attr('href');

                
                // Extract description
                const description = $element.text().trim() || $element.closest('div').text().trim() || '';

                if (title && title.length > 5 && !title.toLowerCase().includes('details') && !title.toLowerCase().includes('tickets') && !title.toLowerCase().includes('menu')) {
                    events.push({
                        id: uuidv4(),
                        title,
                        date: dateText || 'Date TBA',  // FIXED: Extract date from page
                        time: null,
                        url: link ? (link.startsWith('http') ? link : 'https://www.jubileeauditorium.com' + link) : 'https://www.jubileeauditorium.com/calgary/whats-on',
                        venue: { name: 'Jubilee Auditorium', address: '1415 14 Avenue NW, Calgary, AB T2N 1M5', city: 'Calgary' },
                        location: 'Calgary, AB',
                        description: description && description.length > 20 ? description : `${title} in Calgary`,
                        image: null
                    });
                }
            });

            console.log(`Found ${events.length} total events from Jubilee Auditorium`);
            return filterEvents(events);
        } catch (error) {
            console.error('Error scraping Jubilee Auditorium events:', error.message);
            return [];
        }
    }
};

module.exports = JubileeAuditoriumEvents.scrape;
