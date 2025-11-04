const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const HeritageParkEvents = {
    async scrape(city) {
        console.log('🔍 Scraping events from Heritage Park...');
        try {
            
            const response = await axios.get('https://heritagepark.ca/whats-on-now/');
            const $ = cheerio.load(response.data);
            const events = [];

            // Look for event links and details
            $('a[href*="/events/"], a[href*="/series/"]').each((index, element) => {
                const $element = $(element);
                const title = $element.text().trim() || $element.find('h3, h4').text().trim();
                const link = $element.attr('href');
                
                if (title && title.length > 3 && !title.toLowerCase().includes('learn more')) {
                    const $parent = $element.closest('div, section, article');
                    const description = $parent.find('p').first().text().trim();
                    const dateText = $parent.text().match(/(\w+\.?\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
                    const date = dateText ? dateText[0] : 'TBA';

                    // Normalize date
                    if (dateText) {
                      dateText = String(dateText)
                        .replace(/\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
                        .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
                        .trim();
                      if (!/\d{4}/.test(dateText)) {
                        const currentYear = new Date().getFullYear();
                        const currentMonth = new Date().getMonth();
                        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                        const dateLower = dateText.toLowerCase();
                        const monthIndex = months.findIndex(m => dateLower.includes(m));
                        if (monthIndex !== -1) {
                          const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                          dateText = `${dateText}, ${year}`;
                        }
                      }
                    }

                    events.push({
                        id: uuidv4(),
                        title,
                        date: dateText || null,  // FIXED: Extract date from page
                        time: null,
                        url: link ? (link.startsWith('http') ? link : 'https://heritagepark.ca' + link) : 'https://heritagepark.ca/whats-on-now/',
                        venue: { name: 'Heritage Park', address: '1900 Heritage Drive SW, Calgary, AB T2V 2X3', city: 'Calgary' },
                        location: 'Calgary, AB',
                        description: description || null,
                        image: null
                    });
                }
            });

            console.log(`Found ${events.length} total events from Heritage Park`);
            return filterEvents(events);
        } catch (error) {
            console.error('Error scraping Heritage Park events:', error.message);
            return [];
        }
    }
};

module.exports = HeritageParkEvents.scrape;
