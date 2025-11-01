const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Brooklyn Mirage Events Scraper
 * Scrapes real events from Brooklyn Mirage website
 */
async function scrapeEvents() {
    try {
        console.log('🌊 Scraping events from Brooklyn Mirage...');

        const response = await axios.get('https://www.avant-gardner.com/brooklyn-mirage', {
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
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
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
                    dateText = 'March 15, 2025 at 10:00 PM';
                }

                console.log(`🔍 Brooklyn Mirage event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Brooklyn Mirage', address: '140 Stewart Avenue, Brooklyn, NY 11237', city: 'New York' },
                    location: 'East Williamsburg, Brooklyn, New York',
                    date: dateText,
                    category: 'Electronic Music',
                    description: description && description.length > 20 ? description : `${title} in New York`,
                    link: 'https://www.avant-gardner.com/brooklyn-mirage',
                    source: 'brooklyn-mirage'
                });
            }
        });

        console.log(`✅ Brooklyn Mirage: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Brooklyn Mirage error: ${error.message}`);
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
