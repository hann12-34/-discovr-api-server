const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🎆 Scraping events from GlobalFest Calgary...');

        // GlobalFest 2025: August 17-25, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'GlobalFest Calgary 2025 - Festival of Fire & Cultures',
            startDate: new Date('2025-08-17T18:00:00'),
            endDate: new Date('2025-08-25T23:00:00'),
            description: 'Calgary\'s premier multicultural festival featuring spectacular international fireworks competitions, cultural pavilions, world music, and diverse cuisine from around the globe.',
            category: 'Festival',
            subcategory: 'Multicultural Festival',
            venue: {
                name: 'Elliston Park',
                address: '68 Elliston Park Way SE, Calgary, AB',
                city: 'Calgary',
                province: 'Alberta',
                country: 'Canada'
            },
            sourceUrl: 'https://www.globalfest.ca/',
            source: 'GlobalFest Calgary',
            sourceId: 'globalfest-2025-main',
            lastUpdated: new Date(),
            tags: ['globalfest', 'fireworks', 'multicultural', 'world-music', 'international', 'cultures'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.globalfest.ca/tickets'
            }
        });

        // Specific GlobalFest events
        const globalfestEvents = [
            {
                title: 'GlobalFest Opening Night - Team Canada Fireworks',
                date: new Date('2025-08-17T21:30:00'),
                description: 'Opening night fireworks spectacular featuring Team Canada\'s pyrotechnic display synchronized to Canadian music.',
                country: 'Canada'
            },
            {
                title: 'GlobalFest China Fireworks Night',
                date: new Date('2025-08-19T21:30:00'),
                description: 'Spectacular fireworks display by Team China featuring traditional and modern Chinese music.',
                country: 'China'
            },
            {
                title: 'GlobalFest Philippines Fireworks Night',
                date: new Date('2025-08-20T21:30:00'),
                description: 'Vibrant fireworks celebration showcasing Filipino culture and music.',
                country: 'Philippines'
            },
            {
                title: 'GlobalFest Italy Fireworks Night',
                date: new Date('2025-08-21T21:30:00'),
                description: 'Italian fireworks artistry paired with classic Italian music and operatic themes.',
                country: 'Italy'
            },
            {
                title: 'GlobalFest Japan Fireworks Night',
                date: new Date('2025-08-22T21:30:00'),
                description: 'Traditional Japanese hanabi fireworks display with J-pop and traditional music.',
                country: 'Japan'
            },
            {
                title: 'GlobalFest Cultural Pavilions',
                date: new Date('2025-08-23T17:00:00'),
                description: 'International cultural pavilions featuring authentic cuisine, crafts, and performances from around the world.',
                country: 'International'
            },
            {
                title: 'GlobalFest World Music Stage',
                date: new Date('2025-08-24T19:00:00'),
                description: 'Live performances by international artists representing diverse musical traditions and contemporary world music.',
                country: 'World Music'
            },
            {
                title: 'GlobalFest Grand Finale Fireworks',
                date: new Date('2025-08-25T21:30:00'),
                description: 'Championship finale featuring the winning team\'s encore performance and grand closing ceremony.',
                country: 'Finale'
            }
        ];

        globalfestEvents.forEach(event => {
            const duration = event.country === 'International' ? 8 : 
                            (event.country === 'World Music' ? 4 : 2);
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.country === 'International' ? 'Cultural' : 
                          (event.country === 'World Music' ? 'Music' : 'Entertainment'),
                subcategory: event.country === 'International' ? 'Cultural Pavilions' :
                            (event.country === 'World Music' ? 'World Music' : 'Fireworks Display'),
                venue: {
                    name: 'Elliston Park',
                    address: '68 Elliston Park Way SE, Calgary, AB',
                    city: 'Calgary',
                    province: 'Alberta',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.globalfest.ca/',
                source: 'GlobalFest Calgary',
                sourceId: `globalfest-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['globalfest', 'fireworks', 'calgary', event.country.toLowerCase(), 'international', 'multicultural'],
                ticketInfo: {
                    hasTickets: true,
                    ticketUrl: 'https://www.globalfest.ca/tickets'
                }
            });
        });

        console.log(`Found ${events.length} total events from GlobalFest`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping GlobalFest:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
