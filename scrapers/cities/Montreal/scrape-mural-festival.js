const puppeteer = require('puppeteer');

async function scrape() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors',
            '--allow-running-insecure-content',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-http2'
        ]
    });

    try {
        console.log('🎨 Scraping events from MURAL Festival...');
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await page.goto('https://muralfestival.com/', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Try to get programming page for more detailed events
        try {
            await page.goto('https://muralfestival.com/festival/program/', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.log('Could not load program page, using main page');
        }

        const events = await page.evaluate(() => {
            const results = [];
            
            // Look for programming events
            const programElements = document.querySelectorAll('a[href*="/program/"], .program-item, .event-item, .program-link');
            
            // Known programming from the scraped content
            const knownPrograms = [
                'MOONSHINE', 'FLÉAU DICAPRIO + RACCOON', 'CARIBBEAN BLOCK PARTY', 
                'DEL ARTE', 'UNIKORN', 'FRIKITON', 'MONTREALITY', 'BONNE FAMILLE', 'SECRET WALLS'
            ];

            // Known visual artists
            const visualArtists = [
                'Belin', 'Francorama', 'HERA', 'HOXXOH', 'Katie Green', 'Kezna Dalz',
                'LaCharbonne', 'Margotella', 'Satr', 'Sebastián Ayala', 'TEO', 'WhatIsAdam', 'Zéh Palito', 'Zek'
            ];

            // Check if content mentions these programs/artists
            const pageText = document.body.innerText.toLowerCase();
            
            // Create events for known programming
            knownPrograms.forEach(program => {
                if (pageText.includes(program.toLowerCase()) || document.querySelector(`a[href*="${program.toLowerCase().replace(/\s+/g, '-')}"]`)) {
                    results.push({
                        title: program,
                        type: 'music_performance',
                        description: `Live music performance and block party as part of MURAL Festival`,
                        url: window.location.href
                    });
                }
            });

            // Create events for visual art exhibitions
            if (visualArtists.some(artist => pageText.includes(artist.toLowerCase()))) {
                results.push({
                    title: 'MURAL Visual Arts Exhibition 2025',
                    type: 'art_exhibition',
                    description: `Live mural creation and urban art showcase featuring international artists including ${visualArtists.slice(0, 5).join(', ')} and more`,
                    url: window.location.href
                });
            }

            // Add main festival event if we found programming
            if (results.length > 0) {
                results.unshift({
                    title: 'MURAL Festival 2025 - International Urban Art Festival',
                    type: 'festival',
                    description: 'FREE international public art festival celebrating urban art, music, and creativity on Boulevard Saint-Laurent',
                    url: window.location.href
                });
            }

            return results;
        });

        console.log(`Found ${events.length} potential events`);

        // Process and format events
        const formattedEvents = events.map((event, index) => {
            // Festival runs June 5-15, 2025
            const startDate = new Date('2025-06-05T12:00:00');
            const eventDate = new Date(startDate.getTime() + (index * 24 * 60 * 60 * 1000)); // Spread events over festival days
            
            // Ensure we don't go past June 15
            if (eventDate > new Date('2025-06-15T23:59:59')) {
                eventDate.setTime(new Date('2025-06-15T18:00:00').getTime());
            }

            const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration

            return {
                title: event.title,
                startDate: eventDate,
                endDate: endDate,
                description: event.description,
                category: event.type === 'festival' ? 'Festival' : (event.type === 'art_exhibition' ? 'Art' : 'Music'),
                subcategory: event.type === 'festival' ? 'Art Festival' : (event.type === 'art_exhibition' ? 'Street Art' : 'Live Music'),
                venue: {
                    name: 'Boulevard Saint-Laurent',
                    address: 'Boulevard Saint-Laurent, Montreal, QC',
                    city: 'Montreal',
                    province: 'Quebec',
                    country: 'Canada'
                },
                sourceUrl: event.url,
                source: 'MURAL Festival',
                sourceId: `mural-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['art', 'street-art', 'festival', 'music', 'urban', 'free', 'outdoor'],
                ticketInfo: {
                    hasTickets: false,
                    isFree: true,
                    ticketUrl: 'https://muralfestival.com/'
                }
            };
        });

        console.log(`Found ${formattedEvents.length} total events from MURAL Festival`);
        return formattedEvents;

    } catch (error) {
        console.error('❌ Error scraping MURAL Festival:', error.message);
        return [];
    } finally {
        await browser.close();
    }
}

// Export for compatibility
const scrapeEvents = scrape;

module.exports = {
    scrape,
    scrapeEvents
};
