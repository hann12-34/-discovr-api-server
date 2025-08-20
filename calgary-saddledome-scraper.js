#!/usr/bin/env node

// Calgary Saddledome Events Scraper - NEW CLEAN VERSION
const puppeteer = require('puppeteer');

class SaddledomeEventsScraper {
    constructor() {
        this.venueName = 'Scotiabank Saddledome';
        this.venueUrl = 'https://www.saddledome.com/events';
        this.city = 'Calgary';
        this.venue = {
            name: this.venueName,
            address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1',
            city: this.city,
            province: 'AB',
            coordinates: { lat: 51.0373, lon: -114.0517 }
        };
    }

    async scrape() {
        console.log(`🏒 Scraping events from ${this.venueName}...`);
        
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
                const eventElements = document.querySelectorAll('.event, .game, .show, [class*="event"], [class*="game"]');
                const results = [];
                
                eventElements.forEach(element => {
                    const titleEl = element.querySelector('h1, h2, h3, h4, .title, .game-title, [class*="title"]');
                    const dateEl = element.querySelector('.date, .game-date, .event-date, [class*="date"]');
                    const timeEl = element.querySelector('.time, .game-time, [class*="time"]');
                    const linkEl = element.querySelector('a');
                    
                    if (titleEl && titleEl.textContent.trim()) {
                        const title = titleEl.textContent.trim();
                        const dateText = dateEl ? dateEl.textContent.trim() : '';
                        const timeText = timeEl ? timeEl.textContent.trim() : '';
                        const url = linkEl ? linkEl.href : '';
                        
                        if (title.length > 3 && !title.toLowerCase().includes('menu') && !title.toLowerCase().includes('login')) {
                            results.push({
                                title,
                                dateText: `${dateText} ${timeText}`.trim(),
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
                
                // Determine event type
                let category = 'Sports';
                if (event.title.toLowerCase().includes('flames')) {
                    category = 'Hockey';
                } else if (event.title.toLowerCase().includes('concert') || event.title.toLowerCase().includes('music')) {
                    category = 'Music';
                }
                
                return {
                    id: `saddledome-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: `${event.title} at ${this.venueName}`,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category,
                    url: event.url || this.venueUrl,
                    image: 'https://www.saddledome.com/images/logo.png'
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

module.exports = SaddledomeEventsScraper;
