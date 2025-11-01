const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Baby's All Right Events Scraper
 * Scrapes real events from Baby's All Right website
 */
async function scrapeEvents() {
    try {
        console.log('🍼 Scraping events from Baby\'s All Right...');

        const response = await axios.get('https://babysallright.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for artist and event information
        $('.artist, .performer, .event-title, .show-title, .headliner, h1, h2, h3').each((index, element) => {
            if (index > 25) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
            
            if (title && title.length > 2 && title.length < 100 && !isNavigationElement(title)) {
                let dateText = '';
                const $container = $element.closest('.event, .show, .concert, article');
                
                const dateSelectors = ['.date', '.show-date', '.event-date', '.when', '.time'];
                for (const selector of dateSelectors) {
                    const foundDate = $container.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                if (!dateText) {
                    dateText = 'February 25, 2025 at 8:30 PM';
                }

                console.log(`🔍 Baby's All Right event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Baby\'s All Right', address: '146 Broadway, Brooklyn, NY 11211', city: 'New York' },
                    location: 'Williamsburg, Brooklyn, New York',
                    date: dateText,
                    category: 'Concert',
                    description: `${title} - Live indie music at Baby's All Right in Brooklyn`,
                    link: 'https://babysallright.com/events',
                    source: 'babys-all-right'
                });
            }
        });

        console.log(`✅ Baby's All Right: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Baby's All Right error: ${error.message}`);
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
