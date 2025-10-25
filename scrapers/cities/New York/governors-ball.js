const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Governors Ball Music Festival Events Scraper
 * Scrapes real events from Governors Ball website
 */
async function scrapeEvents() {
    try {
        console.log('🎪 Scraping events from Governors Ball...');

        const response = await axios.get('https://www.governorsballmusicfestival.com', {
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
        $('.artist, .performer, .headliner, .lineup, h1, h2, h3').each((index, element) => {
            if (index > 20) return false;
            
            const $element = $(element);
            const title = $element.text().trim();
                
                // Extract description from element
                const description = $element.text().trim() || $element.find('p, .description, .summary').first().text().trim() || '';

            
            if (title && title.length > 2 && title.length < 100 && !isNavigationElement(title)) {
                console.log(`🔍 Governors Ball event: "${title}" - Date: "June 6-8, 2025"`);
                
                // Extract date

                
                // Extract real date from website
                const dateText = $element.find('.date, time, [class*="date"]').first().text().trim();
                const datetimeAttr = $element.find('[datetime]').attr('datetime');
                
                const realDate = datetimeAttr || dateText;
                
                // CRITICAL: Only add event if it has a real date
                if (realDate && realDate.length > 0 && realDate !== 'June 6-8, 2025') {
                    console.log(`   ✅ Found real date: ${realDate}`);
                    
                    let startDate = null;
                    try {
                        startDate = new Date(realDate);
                        if (isNaN(startDate.getTime())) {
                            console.log(`   ❌ Invalid date, skipping`);
                            return;
                        }
                    } catch (e) {
                        console.log(`   ❌ Parse error, skipping`);
                        return;
                    }
                    
                    events.push({
                        id: uuidv4(),
                        title: title + ' at Governors Ball',
                        venue: { name: 'Governors Ball Music Festival', address: 'Flushing Meadows Corona Park, Queens, NY', city: 'New York' },
                        location: 'Flushing Meadows Corona Park, Queens',
                        startDate: startDate,
                        date: startDate.toISOString(),
                        category: 'Music Festival',
                        description: description && description.length > 20 ? description : `${title} performing at Governors Ball Music Festival`,
                        url: 'https://www.governorsballmusicfestival.com',
                        source: 'governors-ball'
                    });
                } else {
                    console.log(`   ❌ No real date found, skipping (was hardcoded fake date)`);
                }
            }
        });

        // NO FALLBACK EVENTS - return empty array if no real events found

        console.log(`✅ Governors Ball: Found ${events.length} events`);
        return filterEvents(events);

    } catch (error) {
        console.error(`❌ Governors Ball error: ${error.message}`);
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
