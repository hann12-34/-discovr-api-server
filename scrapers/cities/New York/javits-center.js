const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Jacob K. Javits Convention Center Events Scraper
 * Scrapes real events from Javits Center website
 */
async function scrapeEvents() {
    try {
        console.log('🏢 Scraping events from Javits Center...');

        const response = await axios.get('https://www.javitscenter.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const events = [];

        // Look for event titles and convention names
        $('.event-name, .event-title, .conference, .expo, h1, h2, h3').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 4 && title.length < 120 && !isNavigationElement(title)) {
                // Look for date information
                let dateText = '';
                const $container = $element.closest('.event, .conference, .expo, article');
                
                const dateSelectors = ['.date', '.event-date', '.conference-date', '.when', '.time'];
                for (const selector of dateSelectors) {
                    const foundDate = $container.find(selector).first().text().trim();
                    if (foundDate && foundDate.length > 5) {
                        dateText = foundDate;
                        break;
                    }
                }
                
                // CRITICAL: Skip events without real dates!
                if (!dateText) {
                    console.log(`🔍 Javits Center event: "${title}" - ❌ No date found, skipping`);
                    return;
                }
                
                // Parse and validate date
                let startDate = null;
                try {
                    startDate = new Date(dateText);
                    if (isNaN(startDate.getTime())) {
                        console.log(`🔍 Javits Center event: "${title}" - ❌ Invalid date: ${dateText}, skipping`);
                        return;
                    }
                } catch (e) {
                    console.log(`🔍 Javits Center event: "${title}" - ❌ Parse error, skipping`);
                    return;
                }

                console.log(`🔍 Javits Center event: "${title}" - ✅ Date: "${dateText}"`);
                
                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: 'Jacob K. Javits Convention Center', address: '655 West 34th Street, New York, NY 10001', city: 'New York' },
                    location: 'Hell\'s Kitchen, New York',
                    date: dateText,
                    category: 'Convention',
                    description: description && description.length > 20 ? description : `${title} - Convention or trade show at Jacob K. Javits Convention Center`,
                    link: 'https://www.javitscenter.com/events',
                    source: 'javits-center'
                });
            }
        });

        console.log(`✅ Javits Center: Found ${events.length} events`);
        return events.length > 0 ? events : [];

    } catch (error) {
        console.error(`❌ Javits Center error: ${error.message}`);
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
