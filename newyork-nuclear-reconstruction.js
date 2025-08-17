/**
 * New York Nuclear Reconstruction Campaign
 * Applying proven Vancouver scraper template to rebuild corrupted New York scrapers
 * Target: 10 priority New York venues
 */

const fs = require('fs');
const path = require('path');

// Vancouver scraper template - PROVEN WORKING
const vancouverTemplate = `const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class VENUE_CLASSEvents {
    constructor() {
        this.source = 'VENUE_NAME';
        this.city = 'New York';
        this.province = 'NY';
        this.baseUrl = 'VENUE_URL';
        this.eventsUrl = 'VENUE_EVENTS_URL';
    }

    async scrape() {
        let browser;
        try {
            console.log(\`🎭 Scraping events from \${this.source}...\`);
            
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
                            description: description || \`\${title} at VENUE_NAME\`,
                            dateText,
                            price,
                            url: eventUrl
                        });

                    } catch (error) {
                        console.log(\`Error processing event element \${index}:, error\`);
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

            console.log(\`✅ Found \${processedEvents.length} events from \${this.source}\`);
            return processedEvents;

        } catch (error) {
            console.error(\`❌ Error scraping \${this.source}:\`, error.message);
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
            const cleaned = dateText.replace(/[^\\w\\s,.-]/g, '').trim();
            
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

module.exports = VENUE_CLASSEvents;`;

// Priority New York venues for reconstruction
const newYorkVenues = [
    {
        name: 'ApolloTheaterEvents',
        className: 'ApolloTheater',
        displayName: 'Apollo Theater',
        url: 'https://apollotheater.org',
        eventsUrl: 'https://apollotheater.org/events'
    },
    {
        name: 'BroadwayTheatersEvents',
        className: 'BroadwayTheaters', 
        displayName: 'Broadway Theaters',
        url: 'https://broadway.org',
        eventsUrl: 'https://broadway.org/shows'
    },
    {
        name: 'CarnegieHallEvents',
        className: 'CarnegieHall',
        displayName: 'Carnegie Hall',
        url: 'https://carnegiehall.org',
        eventsUrl: 'https://carnegiehall.org/Calendar'
    },
    {
        name: 'LincolnCenterEvents',
        className: 'LincolnCenter',
        displayName: 'Lincoln Center',
        url: 'https://lincolncenter.org',
        eventsUrl: 'https://lincolncenter.org/events-tickets'
    },
    {
        name: 'MetropolitanOperaEvents',
        className: 'MetropolitanOpera',
        displayName: 'Metropolitan Opera',
        url: 'https://metopera.org',
        eventsUrl: 'https://metopera.org/season/tickets'
    },
    {
        name: 'MadisonSquareGardenEvents',
        className: 'MadisonSquareGarden',
        displayName: 'Madison Square Garden',
        url: 'https://msg.com',
        eventsUrl: 'https://msg.com/calendar'
    },
    {
        name: 'BarclaysCenterEvents',
        className: 'BarclaysCenter',
        displayName: 'Barclays Center',
        url: 'https://barclayscenter.com',
        eventsUrl: 'https://barclayscenter.com/events'
    },
    {
        name: 'BeaconTheatreEvents',
        className: 'BeaconTheatre',
        displayName: 'Beacon Theatre',
        url: 'https://beacontheatre.com',
        eventsUrl: 'https://beacontheatre.com/events'
    },
    {
        name: 'BlueNoteEvents',
        className: 'BlueNote',
        displayName: 'Blue Note',
        url: 'https://bluenote.net',
        eventsUrl: 'https://bluenote.net/newyork'
    },
    {
        name: 'BoweryBallroomEvents',
        className: 'BoweryBallroom',
        displayName: 'Bowery Ballroom',
        url: 'https://boweryballroom.com',
        eventsUrl: 'https://boweryballroom.com/events'
    }
];

async function reconstructNewYorkScrapers() {
    console.log('🗽 Starting New York nuclear reconstruction campaign...');
    const targetDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/New York';
    let successCount = 0;

    for (const venue of newYorkVenues) {
        try {
            console.log(`🔧 Reconstructing ${venue.displayName} scraper...`);
            
            const scraperCode = vancouverTemplate
                .replace(/VENUE_CLASS/g, venue.className)
                .replace(/VENUE_NAME/g, venue.displayName)
                .replace(/VENUE_URL/g, venue.url)
                .replace(/VENUE_EVENTS_URL/g, venue.eventsUrl);

            const fileName = `${venue.name.toLowerCase().replace(/events$/, '')}-clean.js`;
            const filePath = path.join(targetDir, fileName);

            fs.writeFileSync(filePath, scraperCode);
            console.log(`✅ Created clean scraper: ${fileName}`);
            successCount++;

        } catch (error) {
            console.error(`❌ Failed to create ${venue.displayName} scraper:`, error.message);
        }
    }

    console.log(`🎉 New York reconstruction complete! Successfully created ${successCount}/${newYorkVenues.length} clean scrapers`);
    return successCount;
}

// Test the reconstructed scrapers
async function testNewYorkScrapers() {
    console.log('🧪 Testing reconstructed New York scrapers...');
    
    const testScrapers = [
        './apollotheater-clean',
        './carnegiehall-clean',
        './lincolncenter-clean'
    ];

    for (const scraperPath of testScrapers) {
        try {
            const ScraperClass = require(`./scrapers/cities/New York/${scraperPath}`);
            const scraper = new ScraperClass();
            console.log(`✅ ${scraperPath} loads successfully`);
            
            // Test constructor
            console.log(`📍 Venue: ${scraper.source}, City: ${scraper.city}`);
            
        } catch (error) {
            console.error(`❌ ${scraperPath}: ${error.message}`);
        }
    }
}

module.exports = { reconstructNewYorkScrapers, testNewYorkScrapers };

// Run reconstruction if called directly
if (require.main === module) {
    reconstructNewYorkScrapers()
        .then(() => testNewYorkScrapers())
        .catch(console.error);
}
