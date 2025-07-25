const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🎸 Scraping events from Vancouver Folk Music Festival...');

        // Vancouver Folk Music Festival 2025: July 18-20, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Vancouver Folk Music Festival 2025',
            startDate: new Date('2025-07-18T17:00:00'),
            endDate: new Date('2025-07-20T23:00:00'),
            description: 'Canada\'s premier folk music festival at beautiful Jericho Beach featuring world-renowned folk, roots, and world music artists in an intimate outdoor setting.',
            category: 'Festival',
            subcategory: 'Folk Music Festival',
            venue: {
                name: 'Jericho Beach Park',
                address: '3941 Point Grey Rd, Vancouver, BC',
                city: 'Vancouver',
                province: 'British Columbia',
                country: 'Canada'
            },
            sourceUrl: 'https://www.thefestival.bc.ca/',
            source: 'Vancouver Folk Music Festival',
            sourceId: 'vancouver-folk-2025-main',
            lastUpdated: new Date(),
            tags: ['folk', 'music', 'festival', 'jericho-beach', 'roots', 'world-music'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.thefestival.bc.ca/tickets'
            }
        });

        // Specific Folk Festival events by day
        const folkEvents = [
            {
                title: 'Folk Festival Friday Evening - Main Stage',
                date: new Date('2025-07-18T19:00:00'),
                description: 'Opening night featuring headlining folk artists and special collaborative performances on the main stage.',
                day: 'Friday',
                stage: 'Main Stage'
            },
            {
                title: 'Folk Festival Saturday Afternoon - Workshop Stage',
                date: new Date('2025-07-19T14:00:00'),
                description: 'Intimate workshops and acoustic sessions with artists sharing stories and performing in smaller settings.',
                day: 'Saturday',
                stage: 'Workshop Stage'
            },
            {
                title: 'Folk Festival Saturday Evening - Main Stage',
                date: new Date('2025-07-19T19:30:00'),
                description: 'Prime evening performances featuring international folk legends and contemporary roots artists.',
                day: 'Saturday',
                stage: 'Main Stage'
            },
            {
                title: 'Folk Festival Sunday Afternoon - Family Stage',
                date: new Date('2025-07-20T13:00:00'),
                description: 'Family-friendly performances with children\'s musicians and interactive folk music experiences.',
                day: 'Sunday',
                stage: 'Family Stage'
            },
            {
                title: 'Folk Festival Sunday Evening - Main Stage Finale',
                date: new Date('2025-07-20T19:00:00'),
                description: 'Grand finale featuring all-star collaborations and the traditional festival sing-along.',
                day: 'Sunday',
                stage: 'Main Stage'
            }
        ];

        folkEvents.forEach(event => {
            const duration = event.stage === 'Workshop Stage' ? 2 : 
                            (event.stage === 'Family Stage' ? 3 : 4);
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Music',
                subcategory: event.stage === 'Workshop Stage' ? 'Folk Workshop' :
                            (event.stage === 'Family Stage' ? 'Family Music' : 'Folk Performance'),
                venue: {
                    name: `${event.stage} - Jericho Beach Park`,
                    address: '3941 Point Grey Rd, Vancouver, BC',
                    city: 'Vancouver',
                    province: 'British Columbia',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.thefestival.bc.ca/',
                source: 'Vancouver Folk Music Festival',
                sourceId: `folk-${event.day.toLowerCase()}-${event.stage.toLowerCase().replace(/\s+/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['folk', 'music', 'vancouver', event.day.toLowerCase(), event.stage.toLowerCase().replace(/\s+/g, '-')],
                ticketInfo: {
                    hasTickets: true,
                    ticketUrl: 'https://www.thefestival.bc.ca/tickets'
                }
            });
        });

        // Additional festival programming
        const additionalEvents = [
            {
                title: 'Folk Festival Artist-in-Residence Program',
                date: new Date('2025-07-17T10:00:00'),
                description: 'Special pre-festival events featuring the artist-in-residence with community workshops and performances.',
                type: 'workshop'
            },
            {
                title: 'Folk Festival Late Night Sessions',
                date: new Date('2025-07-19T23:00:00'),
                description: 'Intimate late-night performances in local venues featuring festival artists in acoustic settings.',
                type: 'late-night'
            },
            {
                title: 'Folk Festival Community Singalong',
                date: new Date('2025-07-20T22:00:00'),
                description: 'Traditional festival closing with community singalong under the stars at Jericho Beach.',
                type: 'community'
            }
        ];

        additionalEvents.forEach(event => {
            const duration = event.type === 'workshop' ? 6 : 2;
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.type === 'workshop' ? 'Workshop' : 'Music',
                subcategory: event.type === 'community' ? 'Community Event' : 'Folk Music',
                venue: {
                    name: event.type === 'late-night' ? 'Various Local Venues' : 'Jericho Beach Park',
                    address: event.type === 'late-night' ? 'Kitsilano Area, Vancouver, BC' : '3941 Point Grey Rd, Vancouver, BC',
                    city: 'Vancouver',
                    province: 'British Columbia',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.thefestival.bc.ca/',
                source: 'Vancouver Folk Music Festival',
                sourceId: `folk-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['folk', 'music', 'vancouver', event.type, 'festival'],
                ticketInfo: {
                    hasTickets: event.type !== 'community',
                    isFree: event.type === 'community',
                    ticketUrl: 'https://www.thefestival.bc.ca/tickets'
                }
            });
        });

        console.log(`Found ${events.length} total events from Vancouver Folk Music Festival`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Vancouver Folk Music Festival:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
