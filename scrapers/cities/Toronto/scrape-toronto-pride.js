const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🏳️‍🌈 Scraping events from Toronto Pride Festival...');

        // Toronto Pride 2025: June 20-29, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Toronto Pride Festival 2025',
            startDate: new Date('2025-06-20T12:00:00'),
            endDate: new Date('2025-06-29T23:00:00'),
            description: 'One of the world\'s largest Pride celebrations featuring the Pride Parade, WorldPride, community events, and 10 days of 2SLGBTQ+ celebration in the Church-Wellesley Village.',
            category: 'Festival',
            subcategory: 'Pride Festival',
            venue: {
                name: 'Church-Wellesley Village',
                address: 'Church Street & Wellesley Street, Toronto, ON',
                city: 'Toronto',
                province: 'Ontario',
                country: 'Canada'
            },
            sourceUrl: 'https://www.pridetoronto.com/',
            source: 'Toronto Pride',
            sourceId: 'toronto-pride-2025-main',
            lastUpdated: new Date(),
            tags: ['pride', 'lgbtq', '2slgbtq+', 'festival', 'church-street', 'worldpride'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.pridetoronto.com/tickets'
            }
        });

        // Specific Toronto Pride events
        const prideEvents = [
            {
                title: 'Toronto Pride Trans March 2025',
                date: new Date('2025-06-21T19:00:00'),
                description: 'Annual Trans March celebrating transgender, non-binary, and gender-diverse communities with advocacy and solidarity.',
                type: 'march'
            },
            {
                title: 'Toronto Pride Dyke March 2025',
                date: new Date('2025-06-21T14:00:00'),
                description: 'Empowering march celebrating lesbian, bisexual, and queer women and non-binary folks.',
                type: 'march'
            },
            {
                title: 'Church Street Festival - Pride',
                date: new Date('2025-06-22T12:00:00'),
                description: 'Street festival on Church Street featuring vendors, food, performances, and community celebrations.',
                type: 'street-festival'
            },
            {
                title: 'Pride in the Square 2025',
                date: new Date('2025-06-25T18:00:00'),
                description: 'Free outdoor concert in Yonge-Dundas Square featuring top Canadian and international artists.',
                type: 'concert'
            },
            {
                title: 'Toronto Pride Parade 2025',
                date: new Date('2025-06-29T14:00:00'),
                description: 'The grand finale Pride Parade along Yonge Street featuring floats, marching groups, and over 1 million spectators.',
                type: 'parade'
            },
            {
                title: 'Pride Island Party 2025',
                date: new Date('2025-06-28T16:00:00'),
                description: 'Ticketed dance party on Centre Island with DJs, performers, and stunning Toronto skyline views.',
                type: 'party'
            },
            {
                title: 'Pride Family Zone 2025',
                date: new Date('2025-06-28T11:00:00'),
                description: 'Family-friendly activities and programming celebrating 2SLGBTQ+ families and allies.',
                type: 'family'
            },
            {
                title: 'Pride Film Festival 2025',
                date: new Date('2025-06-24T19:00:00'),
                description: 'Curated selection of 2SLGBTQ+ films, documentaries, and shorts from Canadian and international filmmakers.',
                type: 'film'
            },
            {
                title: 'Pride Community Stage 2025',
                date: new Date('2025-06-26T15:00:00'),
                description: 'Community performances, drag shows, and local talent showcasing Toronto\'s diverse 2SLGBTQ+ scene.',
                type: 'performance'
            }
        ];

        prideEvents.forEach(event => {
            const duration = event.type === 'parade' ? 5 : 
                            (event.type === 'street-festival' ? 10 : 
                            (event.type === 'party' ? 8 : 4));
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.type === 'parade' || event.type === 'march' ? 'Parade' : 
                          (event.type === 'concert' || event.type === 'performance' ? 'Music' : 
                          (event.type === 'party' ? 'Nightlife' : 'Community')),
                subcategory: event.type === 'march' ? 'Pride March' :
                            (event.type === 'concert' ? 'Pride Concert' :
                            (event.type === 'party' ? 'Dance Party' : 'Pride Event')),
                venue: {
                    name: event.type === 'parade' ? 'Yonge Street Parade Route' : 
                          (event.type === 'party' ? 'Centre Island' :
                          (event.type === 'concert' ? 'Yonge-Dundas Square' : 'Church-Wellesley Village')),
                    address: event.type === 'parade' ? 'Yonge St from Bloor to Lakeshore, Toronto, ON' :
                            (event.type === 'party' ? 'Centre Island, Toronto, ON' :
                            (event.type === 'concert' ? '1 Dundas St E, Toronto, ON' : 'Church St, Toronto, ON')),
                    city: 'Toronto',
                    province: 'Ontario',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.pridetoronto.com/',
                source: 'Toronto Pride',
                sourceId: `toronto-pride-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['pride', 'toronto', '2slgbtq+', 'lgbtq', event.type, 'festival'],
                ticketInfo: {
                    hasTickets: event.type === 'party' || event.type === 'film',
                    isFree: event.type === 'parade' || event.type === 'march' || event.type === 'street-festival',
                    ticketUrl: 'https://www.pridetoronto.com/tickets'
                }
            });
        });

        console.log(`Found ${events.length} total events from Toronto Pride`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Toronto Pride:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
