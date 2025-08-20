#!/usr/bin/env node

// Calgary Zoo Events Scraper - NEW CLEAN VERSION
const puppeteer = require('puppeteer');

class CalgaryZooEventsScraper {
    constructor() {
        this.venueName = 'Calgary Zoo';
        this.venueUrl = 'https://www.calgaryzoo.com/events';
        this.city = 'Calgary';
        this.venue = {
            name: this.venueName,
            address: '1300 Zoo Rd NE, Calgary, AB T2E 7V6',
            city: this.city,
            province: 'AB',
            coordinates: { lat: 51.0485, lon: -114.0291 }
        };
    }

    async scrape() {
        console.log(`🦁 Scraping events from ${this.venueName}...`);
        
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
                const eventElements = document.querySelectorAll('.event, .event-item, .event-card, [class*="event"], .activity');
                const results = [];
                
                eventElements.forEach(element => {
                    const titleEl = element.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
                    const dateEl = element.querySelector('.date, .event-date, [class*="date"], time');
                    const descEl = element.querySelector('.description, .summary, p');
                    const linkEl = element.querySelector('a');
                    const priceEl = element.querySelector('.price, [class*="price"]');
                    
                    if (titleEl && titleEl.textContent.trim()) {
                        const title = titleEl.textContent.trim();
                        const dateText = dateEl ? dateEl.textContent.trim() : '';
                        const description = descEl ? descEl.textContent.trim() : '';
                        const url = linkEl ? linkEl.href : '';
                        const price = priceEl ? priceEl.textContent.trim() : '';
                        
                        if (title.length > 3 && !title.toLowerCase().includes('menu') && !title.toLowerCase().includes('cookie')) {
                            results.push({
                                title,
                                dateText,
                                description: description.substring(0, 300),
                                url,
                                price
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
                
                // Determine category
                let category = 'Nature';
                if (event.title.toLowerCase().includes('education') || event.title.toLowerCase().includes('learn')) {
                    category = 'Education';
                } else if (event.title.toLowerCase().includes('family')) {
                    category = 'Family';
                } else if (event.title.toLowerCase().includes('conservation')) {
                    category = 'Conservation';
                }
                
                return {
                    id: `zoo-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description || `${event.title} at Calgary Zoo`,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category,
                    price: event.price || 'Zoo admission required',
                    url: event.url || this.venueUrl,
                    image: 'https://www.calgaryzoo.com/images/logo.png',
                    isFeatured: false
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

module.exports = CalgaryZooEventsScraper;
