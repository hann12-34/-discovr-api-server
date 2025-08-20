#!/usr/bin/env node

// Calgary Heritage Park Events Scraper - NEW CLEAN VERSION
const puppeteer = require('puppeteer');

class HeritageParkEventsScraper {
    constructor() {
        this.venueName = 'Heritage Park Historical Village';
        this.venueUrl = 'https://www.heritagepark.ca/events';
        this.city = 'Calgary';
        this.venue = {
            name: this.venueName,
            address: '1900 Heritage Dr SW, Calgary, AB T2V 2X3',
            city: this.city,
            province: 'AB',
            coordinates: { lat: 50.9942, lon: -114.1097 }
        };
    }

    async scrape() {
        console.log(`🏛️ Scraping events from ${this.venueName}...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            
            await page.goto(this.venueUrl, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll('.event-item, .event-card, .event, [class*="event"]');
                const results = [];
                
                eventElements.forEach(element => {
                    const titleEl = element.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
                    const dateEl = element.querySelector('.date, .event-date, [class*="date"]');
                    const descEl = element.querySelector('.description, .summary, p');
                    const linkEl = element.querySelector('a');
                    
                    if (titleEl && titleEl.textContent.trim()) {
                        const title = titleEl.textContent.trim();
                        const dateText = dateEl ? dateEl.textContent.trim() : '';
                        const description = descEl ? descEl.textContent.trim() : '';
                        const url = linkEl ? linkEl.href : '';
                        
                        if (title.length > 3 && !title.toLowerCase().includes('menu') && !title.toLowerCase().includes('search')) {
                            results.push({
                                title,
                                dateText,
                                description: description.substring(0, 200),
                                url
                            });
                        }
                    }
                });
                
                return results;
            });

            const formattedEvents = events.map(event => {
                let startDate = new Date();
                
                // Parse date
                if (event.dateText) {
                    const parsed = new Date(event.dateText);
                    if (!isNaN(parsed.getTime())) {
                        startDate = parsed;
                    }
                }
                
                return {
                    id: `heritage-park-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description || `Historical event at ${this.venueName}`,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category: 'History & Heritage',
                    url: event.url || this.venueUrl,
                    image: 'https://www.heritagepark.ca/images/logo.png'
                };
            });

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

module.exports = HeritageParkEventsScraper;
