const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Calgary Stampede Events Scraper
 * Scrapes events from Calgary Stampede
 * URL: https://www.calgarystampede.com
 */
class StampedeEvents {
    constructor() {
        this.venueName = 'Calgary Stampede';
        this.venueUrl = 'https://www.calgarystampede.com';
        this.category = 'Festivals & Events';
        this.city = 'Calgary';
        this.province = 'AB';
        this.venue = {
            name: this.venueName,
            address: 'Calgary, AB, Canada',
            city: this.city,
            province: this.province,
            coordinates: { lat: 51.0447, lon: -114.0719 }
        };
    }

    /**
     * Generate unique event ID using slugify
     */
    generateEventId(eventTitle, date) {
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'no-date';
        const titleSlug = slugify(eventTitle, { lower: true, strict: true });
        const venueSlug = slugify(this.venueName, { lower: true, strict: true });
        return `${venueSlug}-${titleSlug}-${dateStr}`;
    }

    /**
     * Main scraping method
     */
    async scrape() {
        console.log(`🎭 Scraping events from ${this.venueName}...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.goto(this.venueUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll([
                    '.event', '.event-item', '.event-card',
                    '[class*="event"]', '[class*="show"]', '[class*="performance"]',
                    'article', '.post', '.listing', '.item'
                ].join(', '));

                return Array.from(eventElements).slice(0, 50).map(element => {
                    const titleSelectors = [
                        'h1', 'h2', 'h3', 'h4', '.title', '.name', '.event-title',
                        '[class*="title"]', '[class*="name"]', '[class*="heading"]'
                    ];
                    
                    const dateSelectors = [
                        '.date', '.time', '.when', '[class*="date"]', 
                        '[class*="time"]', 'time', '[datetime]'
                    ];

                    let title = 'Event';
                    let date = null;
                    let description = '';

                    for (const selector of titleSelectors) {
                        const titleElement = element.querySelector(selector);
                        if (titleElement && titleElement.textContent.trim()) {
                            title = titleElement.textContent.trim();
                            break;
                        }
                    }

                    for (const selector of dateSelectors) {
                        const dateElement = element.querySelector(selector);
                        if (dateElement) {
                            const dateText = dateElement.textContent.trim() || 
                                           dateElement.getAttribute('datetime') || 
                                           dateElement.getAttribute('title');
                            if (dateText) {
                                date = dateText;
                                break;
                            }
                        }
                    }

                    const descElement = element.querySelector('p, .description, .summary, [class*="desc"]');
                    if (descElement) {
                        description = descElement.textContent.trim();
                    }

                    return { title, date, description };
                }).filter(event => event.title && event.title !== 'Event');
            });

            const formattedEvents = events.map(event => ({
                id: this.generateEventId(event.title, event.date),
                title: event.title,
                date: event.date,
                time: null,
                description: event.description || `Event at ${this.venueName}`,
                venue: this.venue,
                category: this.category,
                price: null,
                url: this.venueUrl,
                source: this.venueName,
                city: this.city,
                province: this.province
            }));

            console.log(`✅ Found ${formattedEvents.length} events from ${this.venueName}`);
            return formattedEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    }
}

module.exports = StampedeEvents;