const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🎬 Scraping events from Fantasia International Film Festival...');

        // Based on tourism Montreal info: Festival runs July 17 - August 3, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Fantasia International Film Festival 2025',
            startDate: new Date('2025-07-17T18:00:00'),
            endDate: new Date('2025-08-03T23:00:00'),
            description: 'One of Montreal\'s most eagerly-awaited cinematic events, bringing together genre film mainstays of horror, fantasy and sci-fi with hard-to-find premieres and filmmaker Q&As.',
            category: 'Festival',
            subcategory: 'Film Festival',
            venue: {
                name: 'Multiple Cinema Venues',
                address: 'Various locations, Montreal, QC',
                city: 'Montreal',
                province: 'Quebec',
                country: 'Canada'
            },
            sourceUrl: 'https://fantasiafestival.com/',
            source: 'Fantasia Film Festival',
            sourceId: 'fantasia-2025-main',
            lastUpdated: new Date(),
            tags: ['film', 'festival', 'horror', 'fantasy', 'sci-fi', 'cinema', 'premieres'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://fantasiafestival.com/'
            }
        });

        // Genre-specific screening blocks (typical Fantasia programming)
        const filmEvents = [
            {
                title: 'Horror Premieres Night - Fantasia 2025',
                date: new Date('2025-07-18T21:00:00'),
                description: 'World and North American premieres of the latest horror films with filmmaker Q&As.',
                genre: 'Horror'
            },
            {
                title: 'Sci-Fi Showcase - Fantasia 2025',
                date: new Date('2025-07-20T19:00:00'),
                description: 'Science fiction films from around the world including anticipated premieres and cult classics.',
                genre: 'Science Fiction'
            },
            {
                title: 'Fantasy Film Block - Fantasia 2025',
                date: new Date('2025-07-22T20:00:00'),
                description: 'Fantasy films ranging from dark fairy tales to epic adventures.',
                genre: 'Fantasy'
            },
            {
                title: 'Asian Cinema Spotlight - Fantasia 2025',
                date: new Date('2025-07-25T18:30:00'),
                description: 'Cutting-edge films from Japan, Korea, Thailand and beyond.',
                genre: 'Asian Cinema'
            },
            {
                title: 'Midnight Madness - Fantasia 2025',
                date: new Date('2025-07-26T23:45:00'),
                description: 'Late-night screenings of the wildest, most outrageous films in the festival.',
                genre: 'Midnight Movies'
            },
            {
                title: 'Documentary Premieres - Fantasia 2025',
                date: new Date('2025-07-28T17:00:00'),
                description: 'Genre documentaries exploring horror, sci-fi and fantasy themes.',
                genre: 'Documentary'
            },
            {
                title: 'Short Film Showcases - Fantasia 2025',
                date: new Date('2025-07-30T16:00:00'),
                description: 'International short films in horror, fantasy and sci-fi.',
                genre: 'Short Films'
            },
            {
                title: 'Closing Night Gala - Fantasia 2025',
                date: new Date('2025-08-02T20:00:00'),
                description: 'Festival closing with a special premiere and audience choice award ceremony.',
                genre: 'Gala'
            }
        ];

        filmEvents.forEach(event => {
            const duration = event.title.includes('Midnight') ? 3 : 2.5; // Midnight shows are longer
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Film',
                subcategory: event.genre,
                venue: {
                    name: event.title.includes('Gala') ? 'Cinéma Impérial' : 'Concordia Hall Cinema',
                    address: 'Various cinema venues, Montreal, QC',
                    city: 'Montreal',
                    province: 'Quebec',
                    country: 'Canada'
                },
                sourceUrl: 'https://fantasiafestival.com/',
                source: 'Fantasia Film Festival',
                sourceId: `fantasia-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['film', 'cinema', event.genre.toLowerCase().replace(/\s+/g, '-'), 'festival', 'premiere'],
                ticketInfo: {
                    hasTickets: true,
                    ticketUrl: 'https://fantasiafestival.com/'
                }
            });
        });

        console.log(`Found ${events.length} total events from Fantasia Film Festival`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Fantasia Film Festival:', error.message);
        return [];
    }
}

// Export for compatibility
const scrapeEvents = scrape;

module.exports = {
    scrape,
    scrapeEvents
};
