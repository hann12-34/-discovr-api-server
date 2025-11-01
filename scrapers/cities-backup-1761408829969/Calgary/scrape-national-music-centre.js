const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const NationalMusicCentreEvents = {
    async scrape(city) {
        console.log('🔍 Scraping events from National Music Centre...');
        try {
            const response = await axios.get('https://www.nmc.ca/events/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 30000
            });

            const $ = cheerio.load(response.data);
            const events = [];
            const seenUrls = new Set();

            // Look for event cards and links
            const eventSelectors = [
                '.event-card',
                '.event-item', 
                'a[href*="/event"]',
                'a[href*="/events/"]',
                '.card',
                '.listing'
            ];

            for (const selector of eventSelectors) {
                const eventElements = $(selector);
                if (eventElements.length > 0) {
                    console.log(`Found ${eventElements.length} events with selector: ${selector}`);

                    eventElements.each((i, element) => {
                        const $event = $(element);
                        
                        let title = $event.find('h1, h2, h3, h4, h5, .title, .event-title, .card-title').first().text().trim() ||
                                   $event.find('a').first().text().trim() ||
                                   $event.text().trim().split('\n')[0].trim();

                        let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
                        if (url && !url.startsWith('http')) {
                            url = 'https://www.nmc.ca' + url;
                        }

                        if (!title || title.length < 3 || seenUrls.has(url)) {
                            return;
                        }

                        // Filter out navigation links
                        const skipTerms = ['menu', 'contact', 'about', 'home', 'calendar', 'visit', 'tickets', 'membership'];
                        if (skipTerms.some(term => title.toLowerCase().includes(term))) {
                            return;
                        }

                        seenUrls.add(url);
                        console.log(`✓ Event: ${title}`);

                        events.push({
                            id: uuidv4(),
                            title: title,
                            date: null,
                            time: null,
                            url: url,
                            venue: { name: 'National Music Centre', address: '850 4 Street SE, Calgary, AB T2G 1R1', city: 'Calgary' },
                            location: 'Calgary, AB',
                            description: description && description.length > 20 ? description : `${title} in Calgary`,
                            image: null
                        });
                    });
                }
            }

            console.log(`Found ${events.length} total events from National Music Centre`);
            return filterEvents(events);
        } catch (error) {
            console.error('Error scraping National Music Centre events:', error.message);
            return [];
        }
    }
};

module.exports = NationalMusicCentreEvents.scrape;
