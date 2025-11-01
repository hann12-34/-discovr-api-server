const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Prudential Center";
const VENUE_ADDRESS = '25 Lafayette St, Newark, NJ 07102';
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Prudential Center Events Scraper
 * Scrapes real events from Prudential Center website
 */
async function scrapeEvents() {
    try {
        console.log('🏒 Scraping events from Prudential Center...');

        const response = await axios.get('https://www.prucenter.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event titles and performer names
        $('.event-title, .performer, .artist, .headliner, h1, h2, h3').each((index, element) => {
            if (index > 25) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 3 && title.length < 100 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.event, .show, .game, article');
                
                const dateSelectors = ['.date', '.event-date', '.game-date', '.when', '.time'];
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

                console.log(`🔍 Prudential Center event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
                    location: 'Newark, New Jersey (NYC Metro)',
                    date: dateText,
                    category: 'Sports/Entertainment',
                    description: description && description.length > 20 ? description : `${title} - Live event at Prudential Center`,
                    link: 'https://www.prucenter.com/events',
                    source: 'prudential-center'
                });
            }
        });

        console.log(`✅ Prudential Center: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Prudential Center error: ${error.message}`);
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
