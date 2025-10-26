const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Brooklyn Academy of Music (BAM) Events Scraper
 * Scrapes real events from BAM website
 */
async function scrapeEvents() {
    try {
        console.log('🏛️ Scraping events from Brooklyn Academy of Music...');

        const response = await axios.get('https://www.bam.org/whats-on', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event titles and performance names
        $('.event-title, .performance-title, .show-title, h1, h2, h3, .title').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 4 && title.length < 150 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.event, .performance, .show, article');
                
                // Try date selectors
                const dateSelectors = ['.date', '.event-date', '.performance-date', '.when', '.time'];
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

                console.log(`🔍 BAM event: "${title}" - Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Brooklyn Academy of Music', address: '30 Lafayette Avenue, Brooklyn, NY 11217', city: 'New York' },
                    location: 'Fort Greene, Brooklyn, New York',
                    date: dateText,
                    category: 'Performing Arts',
                    description: description && description.length > 20 ? description : `${title} - Live performance at Brooklyn Academy of Music`,
                    link: 'https://www.bam.org/whats-on',
                    source: 'brooklyn-academy-music'
                });
            }
        });

        console.log(`✅ Brooklyn Academy of Music: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Brooklyn Academy of Music error: ${error.message}`);
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
