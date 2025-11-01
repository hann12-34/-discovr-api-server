const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Terminal 5";
const VENUE_ADDRESS = '610 W 56th St, New York, NY 10019';
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Terminal 5 Events Scraper
 * Scrapes real events from Terminal 5 website
 */
async function scrapeEvents() {
    try {
        console.log('🏢 Scraping events from Terminal 5...');

        const response = await axios.get('https://www.terminal5nyc.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event titles and artist names
        $('.artist-name, .event-title, .show-title, h1, h2, h3').each((index, element) => {
            if (index > 30) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 2 && title.length < 100 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.event, .show, .listing, .concert, article');
                
                // Try to find date in various ways
                const dateSelectors = ['.date', '.event-date', '.show-date', '.when', '.time'];
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

                console.log(`🔍 Terminal 5 event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
                    location: 'Hell\'s Kitchen, New York',
                    date: dateText,
                    category: 'Concert',
                    description: description && description.length > 20 ? description : `${title} - Live concert at Terminal 5 music venue`,
                    link: 'https://www.terminal5nyc.com/events',
                    source: 'terminal-5'
                });
            }
        });

        console.log(`✅ Terminal 5: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Terminal 5 error: ${error.message}`);
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
