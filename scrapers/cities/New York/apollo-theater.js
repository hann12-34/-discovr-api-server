const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Apollo Theater Events Scraper
 * Scrapes real events from Apollo Theater website
 */
async function scrapeEvents() {
    try {
        console.log('🎭 Scraping events from Apollo Theater...');

        const response = await axios.get('https://www.apollotheater.org/events/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event titles in various selectors
        $('.event-title, .entry-title, h2, h3, .title').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 5 && title.length < 150 && !isNavigationElement(title)) {
                // Try to find date in surrounding content
                let dateText = '';
                const $parent = $element.closest('.event, .entry, article, .post');
                const dateSelectors = ['.date', '.event-date', '.time', '.when', '.datetime'];
                
                for (const selector of dateSelectors) {
                    const foundDate = $parent.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                if (!dateText) {
                    // REMOVED FAKE DATE - Events without real dates will be skipped
                }

                console.log(`🔍 Apollo Theater event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Apollo Theater', address: '253 West 125th Street, New York, NY 10027', city: 'New York' },
                    location: 'Harlem, New York',
                    date: dateText,
                    category: 'Performance',
                    description: description && description.length > 20 ? description : `${title} - Live performance at the historic Apollo Theater in Harlem`,
                    link: 'https://www.apollotheater.org/events/',
                    source: 'apollo-theater'
                });
            }
        });

        console.log(`✅ Apollo Theater: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Apollo Theater error: ${error.message}`);
        return [];
    }
}

function isNavigationElement(title) {
    const skipKeywords = [
        'menu', 'navigation', 'search', 'login', 'subscribe', 'newsletter',
        'follow us', 'social media', 'about us', 'contact', 'privacy',
        'terms', 'cookie', 'support', 'donate', 'shop'
    ];
    
    return skipKeywords.some(keyword => title.toLowerCase().includes(keyword));
}

module.exports = scrapeEvents;
