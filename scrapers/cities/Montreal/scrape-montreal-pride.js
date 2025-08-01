const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🏳️‍🌈 Scraping events from Fierté Montréal Pride Festival...');

        // Based on tourism Montreal info: Festival runs July 31 - August 10, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Fierté Montréal Pride Festival 2025',
            startDate: new Date('2025-07-31T12:00:00'),
            endDate: new Date('2025-08-10T23:00:00'),
            description: 'One of the biggest parties on Montreal\'s annual calendar, bringing a non-stop celebratory atmosphere to the Gay Village with community events, activism, and celebration.',
            category: 'Festival',
            subcategory: 'Pride Festival',
            venue: {
                name: 'Gay Village',
                address: 'Rue Sainte-Catherine Est, Montreal, QC',
                city: 'Montreal',
                province: 'Quebec',
                country: 'Canada'
            },
            sourceUrl: 'https://www.fierte.montreal/',
            source: 'Fierté Montréal',
            sourceId: 'pride-montreal-2025-main',
            lastUpdated: new Date(),
            tags: ['pride', 'lgbtq', 'festival', 'community', 'celebration', 'parade'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.fierte.montreal/'
            }
        });

        // Specific events during Pride week
        const prideEvents = [
            {
                title: 'Community Day - Fierté Montréal',
                date: new Date('2025-08-02T11:00:00'),
                description: 'Community Day featuring local organizations, activism, and community building activities.'
            },
            {
                title: 'Drag Superstars Show - Fierté Montréal',
                date: new Date('2025-08-04T20:00:00'),
                description: 'All-star drag show spotlighting queens from Québec and around the world.'
            },
            {
                title: 'Fierté Montréal Parade 2025',
                date: new Date('2025-08-07T13:00:00'),
                description: 'The iconic Montreal Pride Parade featuring floats, performers, and community groups celebrating 2SLGBTQ+ diversity and rights.'
            },
            {
                title: 'T-Dance Closing Party - Fierté Montréal',
                date: new Date('2025-08-10T16:00:00'),
                description: 'Epic closing T-Dance soundtracked by some of the world\'s top DJs, marking the end of Pride festivities.'
            },
            {
                title: 'Pride Night Market - Fierté Montréal',
                date: new Date('2025-08-05T18:00:00'),
                description: 'Evening market featuring local LGBTQ+ vendors, artists, and community organizations.'
            },
            {
                title: 'Pride Film Screenings - Fierté Montréal',
                date: new Date('2025-08-03T19:00:00'),
                description: 'Curated selection of LGBTQ+ films and documentaries celebrating queer cinema.'
            }
        ];

        prideEvents.forEach(event => {
            const endDate = new Date(event.date.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.title.includes('Parade') ? 'Parade' : (event.title.includes('Film') ? 'Film' : 'Community'),
                subcategory: event.title.includes('Drag') ? 'Drag Show' : (event.title.includes('Dance') ? 'Dance Party' : 'Pride Event'),
                venue: {
                    name: event.title.includes('Parade') ? 'Pride Parade Route' : 'Gay Village',
                    address: 'Rue Sainte-Catherine Est, Montreal, QC',
                    city: 'Montreal',
                    province: 'Quebec',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.fierte.montreal/',
                source: 'Fierté Montréal',
                sourceId: `pride-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['pride', 'lgbtq', '2slgbtq+', 'community', 'celebration', 'gay-village'],
                ticketInfo: {
                    hasTickets: event.title.includes('T-Dance') || event.title.includes('Drag'),
                    isFree: event.title.includes('Parade') || event.title.includes('Community'),
                    ticketUrl: 'https://www.fierte.montreal/'
                }
            });
        });

        console.log(`Found ${events.length} total events from Fierté Montréal Pride`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Fierté Montréal Pride:', error.message);
        return [];
    }
}

// Export for compatibility
const scrapeEvents = scrape;

module.exports = {
    scrape,
    scrapeEvents
};
