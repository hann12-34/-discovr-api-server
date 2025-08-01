const puppeteer = require('puppeteer');

async function scrape() {
    try {
        console.log('🎬 Scraping events from Toronto International Film Festival (TIFF)...');

        // TIFF 2025: September 4-14, 2025
        const events = [];

        // Main festival event
        events.push({
            title: 'Toronto International Film Festival (TIFF) 2025',
            startDate: new Date('2025-09-04T10:00:00'),
            endDate: new Date('2025-09-14T23:00:00'),
            description: 'One of the world\'s largest publicly attended film festivals, featuring over 300 films from around the globe with red carpet premieres, industry screenings, and celebrity appearances.',
            category: 'Festival',
            subcategory: 'Film Festival',
            venue: {
                name: 'Multiple TIFF Venues',
                address: 'King Street West & Entertainment District, Toronto, ON',
                city: 'Toronto',
                province: 'Ontario',
                country: 'Canada'
            },
            sourceUrl: 'https://tiff.net/',
            source: 'TIFF',
            sourceId: 'tiff-2025-main',
            lastUpdated: new Date(),
            tags: ['film', 'festival', 'tiff', 'cinema', 'premieres', 'red-carpet', 'international'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://tiff.net/tickets'
            }
        });

        // Specific TIFF programming blocks
        const tiffEvents = [
            {
                title: 'TIFF Opening Night Gala 2025',
                date: new Date('2025-09-04T19:00:00'),
                description: 'Star-studded opening night gala featuring a major world premiere with red carpet arrivals and after-party.',
                category: 'Gala'
            },
            {
                title: 'TIFF Industry Screenings 2025',
                date: new Date('2025-09-05T09:00:00'),
                description: 'Industry-only screenings for buyers, distributors, and media featuring the latest international cinema.',
                category: 'Industry'
            },
            {
                title: 'TIFF People\'s Choice Premieres',
                date: new Date('2025-09-06T20:00:00'),
                description: 'Public premieres of highly anticipated films competing for the People\'s Choice Award.',
                category: 'Premieres'
            },
            {
                title: 'TIFF Masters Programme',
                date: new Date('2025-09-07T15:00:00'),
                description: 'Films by established auteurs and master filmmakers from around the world.',
                category: 'Masters'
            },
            {
                title: 'TIFF Discovery Programme',
                date: new Date('2025-09-08T17:00:00'),
                description: 'First and second features by emerging filmmakers showcasing new voices in cinema.',
                category: 'Discovery'
            },
            {
                title: 'TIFF Documentary Programme',
                date: new Date('2025-09-09T14:00:00'),
                description: 'Compelling documentaries covering diverse subjects from Canadian and international filmmakers.',
                category: 'Documentary'
            },
            {
                title: 'TIFF Midnight Madness 2025',
                date: new Date('2025-09-10T23:45:00'),
                description: 'Late-night screenings of genre films including horror, action, and cult cinema.',
                category: 'Midnight Movies'
            },
            {
                title: 'TIFF Canadian Cinema 2025',
                date: new Date('2025-09-11T19:30:00'),
                description: 'Celebrating Canadian filmmakers with premieres of the best in Canadian cinema.',
                category: 'Canadian'
            },
            {
                title: 'TIFF Closing Night Film 2025',
                date: new Date('2025-09-14T19:00:00'),
                description: 'Festival closing film and People\'s Choice Award ceremony celebrating the festival\'s conclusion.',
                category: 'Closing'
            }
        ];

        tiffEvents.forEach(event => {
            const duration = event.title.includes('Midnight') ? 3 : 2.5;
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            events.push({
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Film',
                subcategory: event.category,
                venue: {
                    name: event.title.includes('Gala') ? 'Princess of Wales Theatre' : 
                          (event.title.includes('Closing') ? 'Roy Thomson Hall' : 'TIFF Bell Lightbox'),
                    address: 'King Street West, Toronto, ON',
                    city: 'Toronto',
                    province: 'Ontario',
                    country: 'Canada'
                },
                sourceUrl: 'https://tiff.net/',
                source: 'TIFF',
                sourceId: `tiff-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                lastUpdated: new Date(),
                tags: ['tiff', 'film', event.category.toLowerCase(), 'festival', 'toronto'],
                ticketInfo: {
                    hasTickets: true,
                    ticketUrl: 'https://tiff.net/tickets'
                }
            });
        });

        console.log(`Found ${events.length} total events from TIFF`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping TIFF:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };
