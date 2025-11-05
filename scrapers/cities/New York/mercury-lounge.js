const { filterEvents } = require('../../utils/eventFilter');

const VENUE_NAME = "Mercury Lounge";
const VENUE_ADDRESS = '217 E Houston St, New York, NY 10002';
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * Mercury Lounge Events Scraper
 * Scrapes real events from Mercury Lounge website
 */
async function scrapeEvents() {
    try {
        console.log('🎸 Scraping events from Mercury Lounge...');

        const response = await axios.get('https://www.mercuryloungenyc.com/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let events = [];

        // Look for artist and event information
        $('.artist, .performer, .event-title, .show-title, .headliner, h1, h2, h3').each((index, element) => {
            if (index > 30) return false;
            
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
                    // REMOVED FAKE DATE - Events without real dates will be skipped
                }

                console.log(`🔍 Mercury Lounge event: "${title}" - Date: "${dateText}"`);
                
                // Normalize date
                if (dateText) {
                  dateText = String(dateText)
                    .replace(/\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
                    .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
                    .trim();
                  if (!/\d{4}/.test(dateText)) {
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth();
                    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                    const dateLower = dateText.toLowerCase();
                    const monthIndex = months.findIndex(m => dateLower.includes(m));
                    if (monthIndex !== -1) {
                      const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                      dateText = `${dateText}, ${year}`;
                    }
                  }
                }

                events.push({
                    id: uuidv4(),
                    title: title,
                    venue: { name: VENUE_NAME, address: VENUE_ADDRESS, city: 'New York' },
                    location: 'Lower East Side, New York',
                    date: dateText,
                    category: 'Concert',
                    description: description && description.length > 20 ? description : `${title} in New York`,
                    link: 'https://www.mercuryloungenyc.com/events',
                    source: 'mercury-lounge'
                });
            }
        });

        console.log(`✅ Mercury Lounge: Found ${events.length} events`);
        return filterEvents(events);

    } catch (error) {
        console.error(`❌ Mercury Lounge error: ${error.message}`);
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
