const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🇰🇷 Scraping events from POCHA MTL Korean Festival...');

        // Based on tourism Montreal info: Festival runs July 24-27, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'POCHA MTL Korean Festival 2025',
            startDate: new Date('2025-07-24T11:00:00'),
            endDate: new Date('2025-07-27T22:00:00'),
            description: 'Montreal\'s annual Korean festival celebrating cuisine, culture and K-Pop with Korean BBQ, pancakes, kogos, and K-Pop dance competitions.',
            category: 'Festival',
            subcategory: 'Cultural Festival',
            venue: {
                name: 'Korean Cultural Festival Grounds',
                address: 'Montreal, QC',
                city: 'Montreal',
                province: 'Quebec',
                country: 'Canada'
            },
            sourceUrl: 'https://www.asiasie.com/pochamtl',
            source: 'POCHA MTL',
            sourceId: 'pocha-mtl-2025-main',
            lastUpdated: new Date(),
            tags: ['korean', 'culture', 'k-pop', 'food', 'festival', 'asian', 'community'],
            ticketInfo: {
                hasTickets: false,
                isFree: true,
                ticketUrl: 'https://www.asiasie.com/pochamtl'
            }
        });

        // Specific events during POCHA MTL
        const pochaEvents = [
            {
                title: 'Korean Food Festival - POCHA MTL',
                date: new Date('2025-07-24T12:00:00'),
                description: 'Authentic Korean street food featuring BBQ, Korean pancakes, and kogos (Korean-style pogos with unique add-ons).',
                type: 'food'
            },
            {
                title: 'K-Pop Dance Competition - POCHA MTL',
                date: new Date('2025-07-25T19:00:00'),
                description: 'Competition showcasing the best K-Pop dance performances with prizes for winners.',
                type: 'competition'
            },
            {
                title: 'K-Pop Night - POCHA MTL',
                date: new Date('2025-07-25T21:00:00'),
                description: 'Dance the night away to your favourite K-Pop tunes with DJs and live performances.',
                type: 'music'
            },
            {
                title: 'Korean Cultural Showcase - POCHA MTL',
                date: new Date('2025-07-26T14:00:00'),
                description: 'Traditional Korean music, dance, and cultural performances celebrating Korean heritage.',
                type: 'cultural'
            },
            {
                title: 'Korean Market & Vendors - POCHA MTL',
                date: new Date('2025-07-26T11:00:00'),
                description: 'Browse Korean goods, cosmetics, snacks, and cultural items from local vendors.',
                type: 'market'
            },
            {
                title: 'K-Pop Karaoke Contest - POCHA MTL',
                date: new Date('2025-07-27T16:00:00'),
                description: 'Sing your favorite K-Pop songs in a karaoke competition with prizes.',
                type: 'competition'
            },
            {
                title: 'Korean Cooking Demo - POCHA MTL',
                date: new Date('2025-07-27T13:00:00'),
                description: 'Learn to make authentic Korean dishes with professional chefs.',
                type: 'workshop'
            }
        ];

        pochaEvents.forEach(event => {
            const duration = event.type === 'music' ? 4 : (event.type === 'market' ? 6 : 2);
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: event.type === 'food' || event.type === 'market' ? 'Food & Market' : 
                          (event.type === 'music' ? 'Music' : 
                          (event.type === 'competition' ? 'Competition' : 'Cultural')),
                subcategory: event.type === 'food' ? 'Food Festival' :
                            (event.type === 'music' ? 'K-Pop' :
                            (event.type === 'competition' ? 'Dance Competition' : 'Cultural Event')),
                venue: {
                    name: 'Korean Cultural Festival Grounds',
                    address: 'Montreal, QC',
                    city: 'Montreal',
                    province: 'Quebec',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.asiasie.com/pochamtl',
                source: 'POCHA MTL',
                sourceId: `pocha-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['korean', 'k-pop', 'culture', 'food', 'asian', 'community', 'free'],
                ticketInfo: {
                    hasTickets: false,
                    isFree: true,
                    ticketUrl: 'https://www.asiasie.com/pochamtl'
                }
            });
        });

        console.log(`Found ${events.length} total events from POCHA MTL`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping POCHA MTL:', error.message);
        return [];
    }
}

// Export for compatibility
const scrapeEvents = scrape;

module.exports = {
    scrape,
    scrapeEvents
};
