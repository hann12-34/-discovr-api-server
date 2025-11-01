const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

/**
 * Place des Arts Events Scraper with Puppeteer
 * Uses browser automation to handle dynamic content
 */
class PlaceDesArtsPuppeteerEvents {
    constructor() {
        this.name = 'Place des Arts (Puppeteer)';
        this.baseUrl = 'https://www.placedesarts.com';
        this.eventsUrl = 'https://www.placedesarts.com/en/events';
        this.source = 'place-des-arts-puppeteer';
        this.city = 'Montreal';
        this.province = 'Quebec';
        this.enabled = true;
    }

    async scrapeEvents() {
        let browser;
        try {
            console.log(`🎭 Scraping events from ${this.source} with Puppeteer...`);

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Navigate and wait for content
            await page.goto(this.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for potential dynamic content
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Extract events using page.evaluate
            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll('.event, .show, .spectacle, article, .card, .event-item, .performance, .calendar-event, .upcoming-event, [data-event], .wp-block-group, .entry, .program-item');
                const extractedEvents = [];

                eventElements.forEach((element) => {
                    const titleEl = element.querySelector('h1, h2, h3, h4, .title, .event-title, .name, .headline, .entry-title');
                    const title = titleEl ? titleEl.textContent.trim() : '';

                    if (title && title.length > 3) {
                        const descEl = element.querySelector('p, .description, .summary, .excerpt');
                        const description = descEl ? descEl.textContent.trim() : '';

                        const dateEl = element.querySelector('.date, .event-date, .when, time, .datetime, .start-date');
                        const dateText = dateEl ? dateEl.textContent.trim() : '';

                        extractedEvents.push({
                            title: title,
                            description: description && description.length > 20 ? description : `${title} at Place des Arts`,
                            dateText: dateText,
                            url: window.location.href
                        });
                    }
                });

                return extractedEvents;
            });

            // Process events
            const processedEvents = events.map(event => ({
                id: uuidv4(),
                name: event.title,
                title: event.title,
                description: event.description && event.description.length > 20 ? event.description : `${title} in Montreal`,
                date: this.parseDate(event.dateText) || new Date(),
                venue: {
                    name: 'Place des Arts',
                    address: '175 Rue Sainte-Catherine O, Montreal, QC',
                    city: this.city,
                    province: 'QC',
                    coordinates: { latitude: 45.5088, longitude: -73.5673 }
                },
                city: this.city,
                province: this.province,
                category: 'Arts & Culture',
                source: this.source,
                url: event.url,
                scrapedAt: new Date()
            }));

            const liveEvents = processedEvents.filter(event => this.isEventLive(event.date));

            console.log(`🎉 Successfully scraped ${liveEvents.length} events from ${this.source} with Puppeteer`);
            return liveEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.source} with Puppeteer:`, error.message);
            return [];
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim().replace(/\s+/g, ' ');
            const parsedDate = new Date(cleanDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    isEventLive(eventDate) {
        if (!eventDate) return false;
        const now = new Date();
        const eventDateTime = new Date(eventDate);
        return eventDateTime >= now;
    }
}

// Export async function wrapper
async function scrapeEvents() {
    const scraper = new PlaceDesArtsPuppeteerEvents();
    return await scraper.scrapeEvents();
}

module.exports = scrapeEvents;
