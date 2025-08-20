const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class CabaretLionDOrEvents {
    constructor() {
        this.source = 'Cabaret Lion d Or';
        this.city = 'Montreal';
        this.province = 'QC';
        this.baseUrl = 'https://cabaretliondor.com';
        this.eventsUrl = 'https://cabaretliondor.com/programmation';
    }

    async scrape() {
        let browser;
        try {
            console.log(`🎭 Scraping events from ${this.source}...`);
            
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            await page.goto(this.eventsUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll('.event, .event-item, .show, .listing, .card, [class*="event"]');
                const eventsList = [];

                eventElements.forEach((element, index) => {
                    try {
                        const titleElement = element.querySelector('h1, h2, h3, h4, .title, .event-title, .name, a[href*="event"]');
                        const title = titleElement ? titleElement.textContent.trim() : null;

                        if (!title || title.length < 3) return;

                        const dateElement = element.querySelector('.date, .event-date, .when, time, [class*="date"]');
                        const dateText = dateElement ? dateElement.textContent.trim() : '';

                        const descElement = element.querySelector('.description, .summary, .excerpt, p');
                        const description = descElement ? descElement.textContent.trim().substring(0, 200) : '';

                        const priceElement = element.querySelector('.price, .cost, .ticket-price, [class*="price"]');
                        const price = priceElement ? priceElement.textContent.trim() : 'Check website for pricing';

                        const linkElement = element.querySelector('a[href]');
                        const eventUrl = linkElement ? linkElement.href : null;

                        eventsList.push({
                            title,
                            description: description || `${title} at Cabaret Lion d Or`,
                            dateText,
                            price,
                            url: eventUrl
                        });

                    } catch (error) {
                        console.log(`Error processing event element ${index}:, error`);
                    }
                });

                return eventsList;
            });

            await browser.close();
            browser = null;

            const processedEvents = events.map(event => ({
                id: uuidv4(),
                name: event.title,
                title: event.title,
                description: event.description,
                date: this.parseDate(event.dateText),
                venue: {
                    name: this.source,
                    city: this.city,
                    province: this.province
                },
                city: this.city,
                province: this.province,
                price: event.price,
                category: 'Entertainment',
                source: this.source,
                url: event.url,
                scrapedAt: new Date().toISOString()
            })).filter(event => event.name && event.name.length > 0);

            console.log(`✅ Found ${processedEvents.length} events from ${this.source}`);
            return processedEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source}:`, error.message);
            if (browser) {
                await browser.close();
            }
            return [];
        }
    }

    parseDate(dateText) {
        if (!dateText) return null;
        
        try {
            // Clean the date text
            const cleaned = dateText.replace(/[^\w\s,.-]/g, '').trim();
            
            // Try parsing various formats
            const parsed = new Date(cleaned);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2024) {
                return parsed.toISOString();
            }
            
            return null;
        } catch {
            return null;
        }
    }
}

module.exports = CabaretLionDOrEvents;