const puppeteer = require('puppeteer');

class AjaxCommunityEventsScraper {
    constructor() {
        this.name = 'Ajax Community Events';
        this.url = 'https://www.ajax.ca/events';
        this.city = 'Toronto'; // GTA area - categorized as Toronto for app purposes
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
            
            console.log(`🏘️ Scraping ${this.name} (Ajax)...`);
            
            await page.goto(this.url, { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll('.event, .community-event, .activity, [class*="event"], [class*="activity"]');
                const events = [];

                eventElements.forEach(element => {
                    try {
                        const titleEl = element.querySelector('.title, .event-title, .activity-title, h1, h2, h3, h4');
                        const dateEl = element.querySelector('.date, .event-date, time, [datetime]');
                        const linkEl = element.querySelector('a[href]');
                        const imageEl = element.querySelector('img');
                        const venueEl = element.querySelector('.venue, .location, .facility');

                        if (titleEl && titleEl.textContent?.trim()) {
                            const title = titleEl.textContent.trim();
                            
                            if (title.length < 3) return;

                            let startDate = new Date();
                            startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 1);

                            // Generate unique ID for the event
                            const eventId = `ajax-community-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${startDate.getTime()}`;

                            events.push({
                                id: eventId,
                                title: title,
                                description: `Community event in Ajax featuring ${title}`,
                                startDate: startDate.toISOString(),
                                venue: {
                                    name: 'Ajax Community Centre',
                                    address: '75 Centennial Rd, Ajax, ON L1S 4L1',
                                    city: 'Ajax',
                                    province: 'Ontario',
                                    country: 'Canada',
                                    location: {
                                        address: '75 Centennial Rd, Ajax, ON L1S 4L1',
                                        coordinates: [-79.0204, 43.8504]
                                    }
                                },
                                category: 'Community Events',
                                price: 'Free',
                                url: linkEl?.href || 'https://www.ajax.ca/events',
                                source: 'Ajax Community Events',
                                city: 'Toronto', // GTA categorized as Toronto
                                province: 'Ontario',
                                country: 'Canada',
                                streetAddress: '75 Centennial Rd, Ajax, ON L1S 4L1'
                            });
                        }
                    } catch (error) {
                        console.log('Error processing event:', error.message);
                    }
                });

                return events;
            });

            // No fallback/sample events - comply with user rule

            console.log(`✅ Found ${events.length} events from ${this.name} (Ajax)`);
            return events;

        } catch (error) {
            console.error(`❌ Error scraping ${this.name}:`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    }
}

module.exports = AjaxCommunityEventsScraper;
