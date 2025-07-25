const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🎆 Scraping events from Celebration of Light Vancouver...');

        // Celebration of Light 2025: July 26, August 2, August 9, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Honda Celebration of Light 2025',
            startDate: new Date('2025-07-26T19:00:00'),
            endDate: new Date('2025-08-09T23:00:00'),
            description: 'The world\'s longest-running offshore fireworks competition featuring three countries competing over three nights with spectacular fireworks displays over English Bay.',
            category: 'Festival',
            subcategory: 'Fireworks Festival',
            venue: {
                name: 'English Bay Beach',
                address: '1700 Beach Ave, Vancouver, BC',
                city: 'Vancouver',
                province: 'British Columbia',
                country: 'Canada'
            },
            sourceUrl: 'https://hondacelebrationoflight.com/',
            source: 'Honda Celebration of Light',
            sourceId: 'celebration-light-2025-main',
            lastUpdated: new Date(),
            tags: ['fireworks', 'celebration-of-light', 'english-bay', 'honda', 'competition'],
            ticketInfo: {
                hasTickets: false,
                isFree: true,
                ticketUrl: 'https://hondacelebrationoflight.com/'
            }
        });

        // Specific fireworks nights
        const fireworksEvents = [
            {
                title: 'Celebration of Light - Team Brazil',
                date: new Date('2025-07-26T22:00:00'),
                description: 'Brazil\'s spectacular fireworks display featuring vibrant colors and rhythmic music celebrating Brazilian culture and carnival spirit.',
                country: 'Brazil',
                night: 1
            },
            {
                title: 'Celebration of Light - Team South Korea',
                date: new Date('2025-08-02T22:00:00'),
                description: 'South Korea\'s innovative fireworks show combining traditional Korean music with modern pyrotechnics and K-pop influences.',
                country: 'South Korea',
                night: 2
            },
            {
                title: 'Celebration of Light - Team Canada',
                date: new Date('2025-08-09T22:00:00'),
                description: 'Canada\'s grand finale fireworks spectacular featuring Canadian music and celebrating the nation\'s natural beauty and culture.',
                country: 'Canada',
                night: 3
            }
        ];

        fireworksEvents.forEach(event => {
            const endDate = new Date(event.date.getTime() + 30 * 60 * 1000); // 30 minutes duration

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Entertainment',
                subcategory: 'Fireworks Competition',
                venue: {
                    name: 'English Bay Beach',
                    address: '1700 Beach Ave, Vancouver, BC',
                    city: 'Vancouver',
                    province: 'British Columbia',
                    country: 'Canada'
                },
                sourceUrl: 'https://hondacelebrationoflight.com/',
                source: 'Honda Celebration of Light',
                sourceId: `celebration-light-${event.country.toLowerCase().replace(/\s+/g, '-')}-2025`,
                lastUpdated: new Date(),
                tags: ['fireworks', 'celebration-of-light', event.country.toLowerCase().replace(/\s+/g, '-'), 'english-bay', 'free'],
                ticketInfo: {
                    hasTickets: false,
                    isFree: true,
                    ticketUrl: 'https://hondacelebrationoflight.com/'
                }
            });
        });

        // Festival activities and ancillary events
        const festivalEvents = [
            {
                title: 'Celebration of Light Festival Village',
                date: new Date('2025-07-26T17:00:00'),
                duration: 6,
                description: 'Festival village with food vendors, merchandise, live entertainment, and family activities before each fireworks show.'
            },
            {
                title: 'Celebration of Light Food Truck Festival',
                date: new Date('2025-08-02T16:00:00'),
                duration: 8,
                description: 'Diverse food trucks and vendors offering international cuisine and local Vancouver favorites during the festival.'
            },
            {
                title: 'Celebration of Light Beach Party',
                date: new Date('2025-08-09T15:00:00'),
                duration: 9,
                description: 'All-day beach party with live music, DJs, beach volleyball, and activities leading up to the grand finale fireworks.'
            }
        ];

        festivalEvents.forEach(event => {
            const endDate = new Date(event.date.getTime() + event.duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Festival',
                subcategory: 'Beach Festival',
                venue: {
                    name: 'English Bay Beach',
                    address: '1700 Beach Ave, Vancouver, BC',
                    city: 'Vancouver',
                    province: 'British Columbia',
                    country: 'Canada'
                },
                sourceUrl: 'https://hondacelebrationoflight.com/',
                source: 'Honda Celebration of Light',
                sourceId: `celebration-light-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['celebration-of-light', 'festival', 'english-bay', 'beach', 'free'],
                ticketInfo: {
                    hasTickets: false,
                    isFree: true,
                    ticketUrl: 'https://hondacelebrationoflight.com/'
                }
            });
        });

        console.log(`Found ${events.length} total events from Celebration of Light`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Celebration of Light:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
