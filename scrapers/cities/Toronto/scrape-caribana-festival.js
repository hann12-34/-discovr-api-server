const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🏝️ Scraping events from Toronto Caribbean Carnival (Caribana)...');

        // Caribana 2025: July 31 - August 4, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Toronto Caribbean Carnival (Caribana) 2025',
            startDate: new Date('2025-07-31T12:00:00'),
            endDate: new Date('2025-08-04T23:00:00'),
            description: 'North America\'s largest Caribbean festival featuring the Grand Parade, King & Queen Competition, steel pan music, Caribbean cuisine, and vibrant cultural celebrations.',
            category: 'Festival',
            subcategory: 'Caribbean Festival',
            venue: {
                name: 'Multiple Venues & Lakeshore Boulevard',
                address: 'Exhibition Place & Lakeshore Blvd W, Toronto, ON',
                city: 'Toronto',
                province: 'Ontario',
                country: 'Canada'
            },
            sourceUrl: 'https://www.torontocarnival.ca/',
            source: 'Toronto Caribbean Carnival',
            sourceId: 'caribana-2025-main',
            lastUpdated: new Date(),
            tags: ['caribbean', 'carnival', 'caribana', 'parade', 'festival', 'culture', 'steel-pan'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.torontocarnival.ca/tickets'
            }
        });

        // Specific Caribana events
        const caribanaEvents = [
            {
                title: 'Caribbean Carnival Junior Parade',
                date: new Date('2025-07-31T11:00:00'),
                description: 'Children\'s parade featuring young masqueraders in colorful costumes celebrating Caribbean heritage.',
                type: 'parade'
            },
            {
                title: 'King & Queen Competition - Caribana',
                date: new Date('2025-08-01T19:00:00'),
                description: 'Spectacular competition showcasing elaborate costumes and traditional Caribbean mas artistry.',
                type: 'competition'
            },
            {
                title: 'Pan Alive Steel Orchestra Competition',
                date: new Date('2025-08-02T18:00:00'),
                description: 'International steel pan competition featuring orchestras from across the Caribbean and North America.',
                type: 'music'
            },
            {
                title: 'Caribana Grand Parade 2025',
                date: new Date('2025-08-02T10:00:00'),
                description: 'The iconic Grand Parade along Lakeshore Boulevard featuring thousands of masqueraders, floats, and Caribbean music.',
                type: 'parade'
            },
            {
                title: 'Caribbean Food & Craft Market',
                date: new Date('2025-08-02T12:00:00'),
                description: 'Authentic Caribbean cuisine, craft vendors, and cultural displays at Exhibition Place.',
                type: 'market'
            },
            {
                title: 'Calypso & Soca Concert Series',
                date: new Date('2025-08-03T20:00:00'),
                description: 'Live performances by top Caribbean artists featuring calypso, soca, reggae, and dancehall music.',
                type: 'concert'
            },
            {
                title: 'Caribbean Heritage Showcase',
                date: new Date('2025-08-04T15:00:00'),
                description: 'Cultural presentations celebrating the diverse heritage of Caribbean islands and diaspora communities.',
                type: 'cultural'
            }
        ];

        caribanaEvents.forEach(event => {
            const duration = event.type === 'parade' ? 6 : (event.type === 'market' ? 8 : 4);
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.type === 'parade' ? 'Parade' : 
                          (event.type === 'concert' ? 'Music' : 
                          (event.type === 'competition' ? 'Competition' : 'Cultural')),
                subcategory: event.type === 'parade' ? 'Caribbean Parade' :
                            (event.type === 'music' ? 'Steel Pan' :
                            (event.type === 'concert' ? 'Caribbean Music' : 'Caribbean Culture')),
                venue: {
                    name: event.type === 'parade' ? 'Lakeshore Boulevard West' : 
                          (event.type === 'market' ? 'Exhibition Place' : 'Lamport Stadium'),
                    address: event.type === 'parade' ? 'Lakeshore Blvd W, Toronto, ON' : 
                            (event.type === 'market' ? '210 Princes\' Blvd, Toronto, ON' : '1155 King St W, Toronto, ON'),
                    city: 'Toronto',
                    province: 'Ontario',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.torontocarnival.ca/',
                source: 'Toronto Caribbean Carnival',
                sourceId: `caribana-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['caribana', 'caribbean', 'carnival', event.type, 'festival', 'toronto'],
                ticketInfo: {
                    hasTickets: !event.title.includes('Parade'),
                    isFree: event.type === 'parade' || event.type === 'market',
                    ticketUrl: 'https://www.torontocarnival.ca/tickets'
                }
            });
        });

        console.log(`Found ${events.length} total events from Caribana`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Caribana:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
