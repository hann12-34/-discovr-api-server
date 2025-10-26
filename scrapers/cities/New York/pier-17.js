const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Pier 17 Events Scraper
 * Scrapes real events from Pier 17 Rooftop website
 */
async function scrapeEvents() {
    try {
        console.log('🌊 Scraping events from Pier 17...');

        const response = await axios.get('https://www.pier17ny.com/events', {
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
                
                // CRITICAL: Skip events without real dates!
                if (!dateText || dateText.trim() === '') {
                    console.log(`🔍 Pier 17 event: "${title}" - ❌ No date found, skipping`);
                    return;
                }

                console.log(`🔍 Pier 17 event: "${title}" - ✅ Date: "${dateText}"`);
                
                // Parse and validate date
                let startDate = null;
                try {
                    startDate = new Date(dateText);
                    if (isNaN(startDate.getTime())) {
                        console.log(`   ❌ Invalid date: ${dateText}, skipping`);
                        return;
                    }
                } catch (e) {
                    console.log(`   ❌ Parse error, skipping`);
                    return;
                }
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Pier 17', address: '89 South Street, New York, NY 10038', city: 'New York' },
                    location: 'South Street Seaport, New York',
                    startDate: startDate,
                    date: startDate.toISOString(),
                    category: 'Concert',
                    description: description && description.length > 20 ? description : `${title} in New York`,
                    link: 'https://www.pier17ny.com/events',
                    source: 'pier-17'
                });
            }
        });

        console.log(`✅ Pier 17: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Pier 17 error: ${error.message}`);
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
