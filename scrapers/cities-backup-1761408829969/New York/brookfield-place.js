const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Brookfield Place Events Scraper
 * Scrapes real events from Brookfield Place NYC
 */
async function scrapeEvents() {
    try {
        console.log('🏢 Scraping events from Brookfield Place...');

        const response = await axios.get('https://brookfieldplaceny.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for events and performances
        $('.event-title, .performance-title, .show-title, h1, h2, h3').each((index, element) => {
            if (index > 25) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 2 && title.length < 100 && !isNavigationElement(title)) {
                let dateText = '';
                const $container = $element.closest('.event, .performance, .show, article');
                
                const dateSelectors = ['.date', '.show-date', '.event-date', '.when', '.time'];
                for (const selector of dateSelectors) {
                    const foundDate = $container.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                // Skip events without dates - no fallback dates allowed
                if (!dateText) return;

                console.log(`🔍 Brookfield Place event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Brookfield Place', address: '230 Vesey Street, New York, NY 10281', city: 'New York' },
                    location: 'Battery Park City, New York',
                    date: dateText,
                    category: 'Cultural Event',
                    description: description && description.length > 20 ? description : `${title} in New York`,
                    link: 'https://brookfieldplaceny.com/events',
                    source: 'brookfield-place'
                });
            }
        });

        // NO FALLBACK EVENTS - return empty array if no real events found

        console.log(`✅ Brookfield Place: Found ${events.length} events`);
        return filterEvents(events);

    } catch (error) {
        console.error(`❌ Brookfield Place error: ${error.message}`);
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
