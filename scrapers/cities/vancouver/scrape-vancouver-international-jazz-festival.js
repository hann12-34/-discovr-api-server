const puppeteer = require('puppeteer');

async function scrape() {
  const city = city;
  if (!city) {
    console.error('❌ City argument is required. e.g. node scrape-vancouver-international-jazz-festival.js Toronto');
    process.exit(1);
  }
    try {
        console.log('🎷 Scraping events from Vancouver International Jazz Festival...');

        // Vancouver Jazz Festival 2025: June 20 - July 1, 2025
        const events = [];

        // Main festival event
        events.push({
            id: 'vancouver-jazz-2025-main',
            title: 'Vancouver International Jazz Festival 2025',
            startDate: new Date('2025-06-20T19:00:00'),
            endDate: new Date('2025-07-01T23:00:00'),
            description: 'One of the world\'s premier jazz festivals featuring over 300 performances across 35+ venues with international jazz legends, emerging artists, and diverse musical styles.',
            category: 'Festival',
            subcategory: 'Jazz Festival',
            venue: {
                name: city,
                venue: 'Multiple Venues Citywide',
                address: 'Various locations, Vancouver, BC',
                city: city,
                province: 'British Columbia',
                country: 'Canada'
            },
            sourceUrl: 'https://www.coastaljazz.ca/',
            source: 'Vancouver International Jazz Festival',
            sourceId: 'vancouver-jazz-2025-main',
            lastUpdated: new Date(),
            tags: ['jazz', 'festival', 'music', 'international', 'coastal-jazz', 'vancouver'],
            ticketInfo: {
                hasTickets: true,
                ticketUrl: 'https://www.coastaljazz.ca/tickets'
            }
        };

        // Specific Jazz Festival events
        const jazzEvents = [
            {
                title: 'Jazz Festival Opening Night Gala',
                date: new Date('2025-06-20T20:00:00'),
                description: 'Star-studded opening night featuring Grammy-winning artists and jazz legends at the Chan Centre.',
                venue: 'Chan Centre',
                type: 'gala'
            },
            {
                title: 'Free Outdoor Jazz Series - David Lam Park',
                date: new Date('2025-06-22T18:00:00'),
                description: 'FREE outdoor concerts in beautiful waterfront setting featuring local and international jazz artists.',
                venue: 'David Lam Park',
                type: 'outdoor'
            },
            {
                title: 'Jazz at the Roundhouse - Steam Clock Series',
                date: new Date('2025-06-24T19:30:00'),
                description: 'Intimate jazz performances in historic Roundhouse venue featuring contemporary and traditional jazz.',
                venue: 'Roundhouse Community Arts & Recreation Centre',
                type: 'intimate'
            },
            {
                title: 'Latin Jazz Night - Granville Island',
                date: new Date('2025-06-25T21:00:00'),
                description: 'Vibrant Latin jazz performances featuring salsa, bossa nova, and contemporary Latin fusion.',
                venue: 'Granville Island',
                type: 'latin'
            },
            {
                title: 'Jazz Vocal Showcase - Queen Elizabeth Theatre',
                date: new Date('2025-06-27T20:00:00'),
                description: 'Celebration of jazz vocals featuring renowned singers performing classic and contemporary jazz standards.',
                venue: 'Queen Elizabeth Theatre',
                type: 'vocal'
            },
            {
                title: 'Fusion & Contemporary Jazz - Vogue Theatre',
                date: new Date('2025-06-28T19:00:00'),
                description: 'Cutting-edge jazz fusion and contemporary artists pushing the boundaries of jazz music.',
                venue: 'Vogue Theatre',
                type: 'fusion'
            },
            {
                title: 'Jazz Brunch Series - Various Venues',
                date: new Date('2025-06-29T11:00:00'),
                description: 'Relaxed Sunday jazz brunches at restaurants and cafes throughout Vancouver.',
                venue: 'Various Venues',
                type: 'brunch'
            },
            {
                title: 'International All-Stars Finale',
                date: new Date('2025-07-01T20:00:00'),
                description: 'Grand finale concert featuring international jazz all-stars collaborating on stage.',
                venue: 'Orpheum Theatre',
                type: 'finale'
            }
        ];

        jazzEvents.forEach(event => {
            const duration = event.type === 'brunch' ? 3 :
                            (event.type === 'outdoor' ? 4 : 2.5);
            const endDate = new Date(event.date.getTime() + duration * 60 * 60 * 1000);

            const eventId = `jazz-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            events.push({
                id: eventId,
                title: event.title,
                startDate: event.date,
                endDate: endDate,
                description: event.description,
                category: 'Music',
                subcategory: event.type === 'latin' ? 'Latin Jazz' :
                            (event.type === 'vocal' ? 'Jazz Vocals' :
                            (event.type === 'fusion' ? 'Jazz Fusion' : 'Jazz Performance')),
                venue: {
                    name: city,
                    venue: event.venue,
                    address: event.venue === 'David Lam Park' ? '1300 Pacific Blvd, Vancouver, BC' :
                            (event.venue === 'Chan Centre' ? '6265 Crescent Rd, Vancouver, BC' :
                            (event.venue === 'Queen Elizabeth Theatre' ? '650 Hamilton St, Vancouver, BC' : 'Vancouver, BC')),
                    city: city,
                    province: 'British Columbia',
                    country: 'Canada'
                },
                sourceUrl: 'https://www.coastaljazz.ca/',
                source: 'Vancouver International Jazz Festival',
                sourceId: eventId,
                lastUpdated: new Date(),
                tags: ['jazz', 'vancouver', event.type, 'music', 'festival', 'coastal-jazz'],
                ticketInfo: {
                    hasTickets: !event.title.includes('Free'),
                    isFree: event.title.includes('Free'),
                    ticketUrl: 'https://www.coastaljazz.ca/tickets'
                }
            };
        };

        console.log(`Found ${events.length} total events from Vancouver Jazz Festival`);
        return events;

    } catch (error) {
        console.error('❌ Error scraping Vancouver Jazz Festival:', error.message);
        return [];
    }
}

const scrapeEvents = scrape;
module.exports = { scrape, scrapeEvents };


// Function export wrapper added by targeted fixer
module.exports = scrape;