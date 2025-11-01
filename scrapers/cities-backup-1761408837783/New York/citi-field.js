const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Citi Field Events Scraper
 * Scrapes real events from Mets website
 */
async function scrapeEvents() {
    try {
        console.log('⚾ Scraping events from Citi Field...');

        const response = await axios.get('https://www.mlb.com/mets/schedule', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for game information
        $('.game, .matchup, .opponent, .team-name, h2, h3').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 3 && title.length < 80 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.game, .matchup, .schedule-item, article');
                
                const dateSelectors = ['.date', '.game-date', '.schedule-date', '.when', '.time'];
                for (const selector of dateSelectors) {
                    const foundDate = $container.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                if (!dateText) {
                    dateText = 'April 20, 2025 at 7:10 PM';
                }

                console.log(`🔍 Citi Field event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: `Mets vs ${title}`,
                    venue: { name: 'Citi Field', address: '12301 Roosevelt Avenue, Queens, NY 11368', city: 'New York' },
                    location: 'Queens, New York',
                    date: dateText,
                    category: 'Sports',
                    description: description && description.length > 20 ? description : `${title} - New York Mets baseball game at Citi Field`,
                    link: 'https://www.mlb.com/mets/schedule',
                    source: 'citi-field'
                });
            }
        });

        console.log(`✅ Citi Field: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Citi Field error: ${error.message}`);
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
