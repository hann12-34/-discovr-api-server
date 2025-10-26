const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Moynihan Train Hall Events Scraper
 * Scrapes real events from Moynihan Train Hall and Penn Station events
 */
async function scrapeEvents() {
    try {
        console.log('🚂 Scraping events from Moynihan Train Hall...');

        const response = await axios.get('https://www.amtrak.com/stations/nyp', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for events and exhibitions
        $('.event-title, .exhibition-title, .show-title, h1, h2, h3').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 2 && title.length < 100 && !isNavigationElement(title)) {
                console.log(`🔍 Moynihan Train Hall event: "${title}" - Date: "April 20, 2025 at 6:30 PM"`);
                
                // Extract date

                
                const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();


                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Moynihan Train Hall', address: '421 8th Avenue, New York, NY 10001', city: 'New York' },
                    location: 'Midtown West, New York',
                    date: null // Real dates only,
                    category: 'Transportation Hub Event',
                    description: description && description.length > 20 ? description : `${title} in New York`,
                    link: 'https://www.amtrak.com/stations/nyp',
                    source: 'moynihan-train-hall'
                });
            }
        });

        // NO FALLBACK EVENTS - return empty array if no real events found

        console.log(`✅ Moynihan Train Hall: Found ${events.length} events`);
        return filterEvents(events);

    } catch (error) {
        console.error(`❌ Moynihan Train Hall error: ${error.message}`);
        return [];
    }
}

function isNavigationElement(title) {
    const skipKeywords = [
        'menu', 'navigation', 'search', 'login', 'tickets', 'buy',
        'follow', 'subscribe', 'newsletter', 'social', 'about',
        'contact', 'privacy', 'terms', 'support', 'shop', 'home'
    ];
    
    return skipKeywords.some(keyword => title.toLowerCase().includes(keyword));
}

module.exports = scrapeEvents;
