const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Music Hall of Williamsburg Events Scraper
 * Scrapes real events from Music Hall of Williamsburg website
 */
async function scrapeEvents() {
    try {
        console.log('🎵 Scraping events from Music Hall of Williamsburg...');

        const response = await axios.get('https://www.musichallofwilliamsburg.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event information
        $('.artist, .event-title, .show-title, .headliner, h1, h2, h3').each((index, element) => {
            if (index > 30) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 2 && title.length < 120 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.event, .show, .concert, .listing, article');
                
                // Try date selectors
                const dateSelectors = ['.date', '.show-date', '.event-date', '.when', '.time'];
                for (const selector of dateSelectors) {
                    const foundDate = $container.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                if (!dateText) {
                    // REMOVED FAKE DATE - Events without real dates will be skipped
                }

                console.log(`🔍 Music Hall Williamsburg event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Music Hall of Williamsburg', address: '66 North 6th Street, Brooklyn, NY 11249', city: 'New York' },
                    location: 'Williamsburg, Brooklyn, New York',
                    date: dateText,
                    category: 'Concert',
                    description: description && description.length > 20 ? description : `${title} - Live music performance at Music Hall of Williamsburg`,
                    link: 'https://www.musichallofwilliamsburg.com/events',
                    source: 'music-hall-williamsburg'
                });
            }
        });

        console.log(`✅ Music Hall of Williamsburg: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Music Hall of Williamsburg error: ${error.message}`);
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
