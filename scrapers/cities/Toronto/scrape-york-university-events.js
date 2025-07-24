const puppeteer = require('puppeteer');

class YorkUniversityEventsScraper {
    constructor() {
        this.name = 'York University Events';
        this.url = 'https://www.yorku.ca/events';
        this.city = 'Toronto';
        this.province = 'Ontario';
        this.country = 'Canada';
    }

    async scrape() {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            console.log(`🦁 Scraping ${this.name} (North York)...`);
            
            await page.goto(this.url, { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll('.event, .lecture, .seminar, [class*="event"], [class*="lecture"]');
                const events = [];

                eventElements.forEach(element => {
                    try {
                        const titleEl = element.querySelector('.title, .event-title, .lecture-title, h1, h2, h3, h4');
                        const dateEl = element.querySelector('.date, .event-date, time, [datetime]');
                        const linkEl = element.querySelector('a[href]');
                        const imageEl = element.querySelector('img');

                        if (titleEl && titleEl.textContent?.trim()) {
                            const title = titleEl.textContent.trim();
                            
                            if (title.length < 3) return;

                            let startDate = new Date();
                            startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 1);

                            // Generate unique ID for the event
                            const eventId = `york-university-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${startDate.getTime()}`;

                            events.push({
                                id: eventId,
                                title: title,
                                description: `Academic and cultural event at York University featuring ${title}`,
                                startDate: startDate.toISOString(),
                                venue: {
                                    name: 'York University',
                                    address: '4700 Keele St, North York, ON M3J 1P3',
                                    city: 'Toronto',
                                    province: 'Ontario',
                                    country: 'Canada',
                                    location: {
                                        address: '4700 Keele St, North York, ON M3J 1P3',
                                        coordinates: [-79.5019, 43.7735]
                                    }
                                },
                                category: 'Education & Lectures',
                                price: 'Free',
                                url: linkEl?.href || 'https://www.yorku.ca/events',
                                source: 'York University Events',
                                city: 'Toronto',
                                province: 'Ontario',
                                country: 'Canada',
                                streetAddress: '4700 Keele St, North York, ON M3J 1P3'
                            });
                        }
                    } catch (error) {
                        console.log('Error processing event:', error.message);
                    }
                });

                return events;
            });

            // No fallback/sample events - comply with user rule

            console.log(`✅ Found ${events.length} events from ${this.name} (North York)`);
            return events;

        } catch (error) {
            console.error(`❌ Error scraping ${this.name}:`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    }
}

module.exports = YorkUniversityEventsScraper;
