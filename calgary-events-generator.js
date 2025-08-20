#!/usr/bin/env node

// Calgary Events Generator - Static events to bootstrap Calgary data
const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Static Calgary events to bootstrap the database
const calgaryEvents = [
    {
        id: 'calgary-stampede-2024',
        title: 'Calgary Stampede 2024',
        description: 'The Greatest Outdoor Show on Earth featuring rodeo, concerts, midway, and western heritage celebrations.',
        startDate: new Date('2024-07-05').toISOString(),
        endDate: new Date('2024-07-14').toISOString(),
        venue: {
            name: 'Calgary Stampede Grounds',
            address: '1410 Olympic Way SE, Calgary, AB T2G 2W1',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0390, lon: -114.0518 }
        },
        city: 'Calgary',
        category: 'Festival',
        price: '$18-65',
        url: 'https://www.calgarystampede.com',
        image: 'https://www.calgarystampede.com/images/stampede-logo.jpg',
        isFeatured: true
    },
    {
        id: 'calgary-zoo-lights',
        title: 'Calgary Zoo Lights',
        description: 'Million-light holiday display featuring illuminated animal sculptures and seasonal activities.',
        startDate: new Date('2024-11-15').toISOString(),
        endDate: new Date('2025-01-03').toISOString(),
        venue: {
            name: 'Calgary Zoo',
            address: '1300 Zoo Rd NE, Calgary, AB T2E 7V6',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0485, lon: -114.0291 }
        },
        city: 'Calgary',
        category: 'Holiday',
        price: '$25-35',
        url: 'https://www.calgaryzoo.com',
        isFeatured: true
    },
    {
        id: 'jubilee-auditorium-symphony',
        title: 'Calgary Philharmonic Orchestra',
        description: 'World-class classical music performances at the iconic Jubilee Auditorium.',
        startDate: new Date('2024-09-20').toISOString(),
        endDate: new Date('2024-09-20').toISOString(),
        venue: {
            name: 'Jubilee Auditorium',
            address: '1415 14 Ave NW, Calgary, AB T2N 1M5',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0625, lon: -114.0892 }
        },
        city: 'Calgary',
        category: 'Music',
        price: '$35-85',
        url: 'https://www.jubileeauditorium.com',
        isFeatured: false
    },
    {
        id: 'sled-island-music-festival',
        title: 'Sled Island Music Festival',
        description: 'Independent music festival featuring emerging and established artists across multiple venues.',
        startDate: new Date('2024-06-21').toISOString(),
        endDate: new Date('2024-06-24').toISOString(),
        venue: {
            name: 'Various Venues',
            address: 'Downtown Calgary, AB',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0447, lon: -114.0719 }
        },
        city: 'Calgary',
        category: 'Music',
        price: '$40-120',
        url: 'https://www.sledisland.com',
        isFeatured: true
    },
    {
        id: 'glenbow-museum-exhibitions',
        title: 'Glenbow Museum Special Exhibitions',
        description: 'World-renowned art and cultural exhibitions featuring Canadian and international artists.',
        startDate: new Date('2024-10-01').toISOString(),
        endDate: new Date('2025-03-31').toISOString(),
        venue: {
            name: 'Glenbow Museum',
            address: '130 9 Ave SE, Calgary, AB T2G 0P3',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0447, lon: -114.0606 }
        },
        city: 'Calgary',
        category: 'Art',
        price: '$18-25',
        url: 'https://www.glenbow.org',
        isFeatured: false
    },
    {
        id: 'calgary-tower-observation',
        title: 'Calgary Tower Sky 360 Restaurant',
        description: 'Revolving restaurant with panoramic city views and fine dining experience.',
        startDate: new Date('2024-08-15').toISOString(),
        endDate: new Date('2024-08-15').toISOString(),
        venue: {
            name: 'Calgary Tower',
            address: '101 9 Ave SW, Calgary, AB T2P 1J9',
            city: 'Calgary',
            province: 'AB',
            coordinates: { lat: 51.0440, lon: -114.0631 }
        },
        city: 'Calgary',
        category: 'Dining',
        price: '$65-120',
        url: 'https://www.calgarytower.com',
        isFeatured: false
    },
    {
        title: "Arts Commons Presents: Canadian Opera Company",
        startDate: "2025-03-15T19:30:00.000Z", 
        endDate: "2025-03-15T22:00:00.000Z",
        description: "World-class opera performance at Jack Singer Concert Hall",
        venue: {
            name: "Arts Commons - Jack Singer Concert Hall",
            address: "205 8 Ave SE, Calgary, AB T2G 0K7",
            city: "Calgary", 
            province: "AB",
            coordinates: { lat: 51.0447, lon: -114.0719 }
        },
        city: "Calgary",
        category: "Music",
        price: "Tickets from $45",
        image: "https://example.com/opera.jpg",
        url: "https://www.artscommons.ca"
    },
    {
        title: "Glenbow Museum: Contemporary Indigenous Art Exhibition", 
        startDate: "2025-02-01T10:00:00.000Z",
        endDate: "2025-05-31T17:00:00.000Z",
        description: "Explore contemporary Indigenous art and cultural expressions",
        venue: {
            name: "Glenbow Museum",
            address: "130 9 Ave SE, Calgary, AB T2G 0P3",
            city: "Calgary",
            province: "AB", 
            coordinates: { lat: 51.0449, lon: -114.0611 }
        },
        city: "Calgary",
        category: "Art & Culture",
        price: "Adults $18, Students $12",
        image: "https://example.com/glenbow.jpg",
        url: "https://www.glenbow.org"
    },
    {
        title: "Calgary Flames vs Edmonton Oilers",
        startDate: "2025-03-22T19:00:00.000Z",
        endDate: "2025-03-22T22:00:00.000Z", 
        description: "NHL hockey game - Battle of Alberta rivalry",
        venue: {
            name: "Scotiabank Saddledome",
            address: "555 Saddledome Rise SE, Calgary, AB T2G 2W1",
            city: "Calgary",
            province: "AB",
            coordinates: { lat: 51.0373, lon: -114.0517 }
        },
        city: "Calgary",
        category: "Sports",
        price: "Tickets from $65",
        image: "https://example.com/flames.jpg", 
        url: "https://www.nhl.com/flames",
        isFeatured: true
    },
    {
        title: "TELUS Spark Science Centre: Space Explorer Exhibition",
        startDate: "2025-01-15T10:00:00.000Z",
        endDate: "2025-06-15T17:00:00.000Z",
        description: "Interactive space exploration exhibit for all ages",
        venue: {
            name: "TELUS Spark Science Centre", 
            address: "220 St George's Dr NE, Calgary, AB T2E 5T2",
            city: "Calgary",
            province: "AB",
            coordinates: { lat: 51.0581, lon: -114.0281 }
        },
        city: "Calgary",
        category: "Science & Technology",
        price: "Adults $26, Youth $21", 
        image: "https://example.com/spark.jpg",
        url: "https://www.sparkscience.ca"
    },
    {
        title: "Heritage Park Historical Village: Winter Festival",
        startDate: "2025-02-14T10:00:00.000Z",
        endDate: "2025-02-16T16:00:00.000Z",
        description: "Historic winter celebration with period activities and demonstrations",
        venue: {
            name: "Heritage Park Historical Village",
            address: "1900 Heritage Dr SW, Calgary, AB T2V 2X3", 
            city: "Calgary",
            province: "AB",
            coordinates: { lat: 50.9942, lon: -114.1097 }
        },
        city: "Calgary",
        category: "History & Heritage",
        price: "Adults $22, Children $16",
        image: "https://example.com/heritage.jpg",
        url: "https://www.heritagepark.ca"
    },
    {
        title: "Calgary Philharmonic Orchestra: Beethoven Symphony No. 9",
        startDate: "2025-04-12T19:30:00.000Z",
        endDate: "2025-04-12T22:00:00.000Z", 
        description: "Choral masterpiece performed by Calgary Philharmonic Orchestra",
        venue: {
            name: "Jack Singer Concert Hall",
            address: "205 8 Ave SE, Calgary, AB T2G 0K7",
            city: "Calgary",
            province: "AB",
            coordinates: { lat: 51.0447, lon: -114.0719 }
        },
        city: "Calgary", 
        category: "Classical Music",
        price: "Tickets from $35",
        image: "https://example.com/cpo.jpg",
        url: "https://www.calgaryphil.com"
    },
    {
        title: "Calgary Folk Music Festival",
        startDate: "2025-07-24T12:00:00.000Z",
        endDate: "2025-07-27T23:00:00.000Z",
        description: "Four-day outdoor music festival featuring folk, roots and world music",
        venue: {
            name: "Prince's Island Park", 
            address: "698 Eau Claire Ave SW, Calgary, AB T2P 2G5",
            city: "Calgary",
            province: "AB",
            coordinates: { lat: 51.0535, lon: -114.0708 }
        },
        city: "Calgary",
        category: "Music Festival",
        price: "4-day pass from $180",
        image: "https://example.com/folkfest.jpg",
        url: "https://www.calgaryfolkfest.com",
        isFeatured: true
    }
];

async function importCalgaryEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        let imported = 0;
        
        // Static Calgary events array 
        const eventsToImport = [
            {
                title: "Calgary Stampede - The Greatest Outdoor Show on Earth",
                startDate: "2025-07-04T19:00:00.000Z",
                endDate: "2025-07-13T23:00:00.000Z",
                description: "Annual rodeo, exhibition and festival celebrating western heritage and culture",
                venue: {
                    name: "Stampede Park",
                    address: "1410 Olympic Way SE, Calgary, AB T2G 2W1",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0390, lon: -114.0518 }
                },
                city: "Calgary",
                category: "Festival",
                price: "General admission from $25",
                image: "https://example.com/stampede.jpg",
                url: "https://www.calgarystampede.com",
                isFeatured: true
            },
            {
                title: "Arts Commons Presents: Canadian Opera Company",
                startDate: "2025-03-15T19:30:00.000Z", 
                endDate: "2025-03-15T22:00:00.000Z",
                description: "World-class opera performance at Jack Singer Concert Hall",
                venue: {
                    name: "Arts Commons - Jack Singer Concert Hall",
                    address: "205 8 Ave SE, Calgary, AB T2G 0K7",
                    city: "Calgary", 
                    province: "AB",
                    coordinates: { lat: 51.0447, lon: -114.0719 }
                },
                city: "Calgary",
                category: "Music",
                price: "Tickets from $45",
                image: "https://example.com/opera.jpg",
                url: "https://www.artscommons.ca"
            },
            {
                title: "Calgary Flames vs Edmonton Oilers",
                startDate: "2025-03-22T19:00:00.000Z",
                endDate: "2025-03-22T22:00:00.000Z", 
                description: "NHL hockey game - Battle of Alberta rivalry",
                venue: {
                    name: "Scotiabank Saddledome",
                    address: "555 Saddledome Rise SE, Calgary, AB T2G 2W1",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0373, lon: -114.0517 }
                },
                city: "Calgary",
                category: "Sports",
                price: "Tickets from $65",
                image: "https://example.com/flames.jpg", 
                url: "https://www.nhl.com/flames",
                isFeatured: true
            },
            {
                title: "TELUS Spark Science Centre: Space Explorer Exhibition",
                startDate: "2025-01-15T10:00:00.000Z",
                endDate: "2025-06-15T17:00:00.000Z",
                description: "Interactive space exploration exhibit for all ages",
                venue: {
                    name: "TELUS Spark Science Centre", 
                    address: "220 St George's Dr NE, Calgary, AB T2E 5T2",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0581, lon: -114.0281 }
                },
                city: "Calgary",
                category: "Science & Technology",
                price: "Adults $26, Youth $21", 
                image: "https://example.com/spark.jpg",
                url: "https://www.sparkscience.ca"
            },
            {
                title: "Calgary Folk Music Festival",
                startDate: "2025-07-24T12:00:00.000Z",
                endDate: "2025-07-27T23:00:00.000Z",
                description: "Four-day outdoor music festival featuring folk, roots and world music",
                venue: {
                    name: "Prince's Island Park", 
                    address: "698 Eau Claire Ave SW, Calgary, AB T2P 2G5",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0535, lon: -114.0708 }
                },
                city: "Calgary",
                category: "Music Festival",
                price: "4-day pass from $180",
                image: "https://example.com/folkfest.jpg",
                url: "https://www.calgaryfolkfest.com",
                isFeatured: true
            },
            {
                title: "Calgary International Film Festival",
                startDate: "2025-09-19T18:00:00.000Z",
                endDate: "2025-09-29T23:00:00.000Z",
                description: "Annual film festival showcasing international and Canadian cinema",
                venue: {
                    name: "Globe Cinema",
                    address: "617 8 Ave SW, Calgary, AB T2P 1G2",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0448, lon: -114.0720 }
                },
                city: "Calgary",
                category: "Film Festival",
                price: "Single tickets from $15",
                image: "https://example.com/ciff.jpg",
                url: "https://www.ciff.ca"
            },
            {
                title: "Beakerhead Festival - Art Meets Science",
                startDate: "2025-09-12T10:00:00.000Z",
                endDate: "2025-09-15T22:00:00.000Z",
                description: "Unique festival combining art, science and engineering innovations",
                venue: {
                    name: "Various Venues",
                    address: "Downtown Calgary, AB",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0447, lon: -114.0719 }
                },
                city: "Calgary",
                category: "Science & Art",
                price: "Many free events",
                image: "https://example.com/beakerhead.jpg",
                url: "https://www.beakerhead.org",
                isFeatured: true
            },
            {
                title: "Calgary Comic & Entertainment Expo",
                startDate: "2025-04-25T10:00:00.000Z",
                endDate: "2025-04-27T18:00:00.000Z",
                description: "Pop culture convention featuring comics, gaming, anime and celebrity guests",
                venue: {
                    name: "BMO Centre",
                    address: "20 Roundup Way SE, Calgary, AB T2G 2W1",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0380, lon: -114.0500 }
                },
                city: "Calgary",
                category: "Convention",
                price: "Weekend passes from $75",
                image: "https://example.com/ccee.jpg",
                url: "https://www.calgaryexpo.com"
            },
            {
                title: "Calgary Farmers' Market Winter Edition",
                startDate: "2025-01-11T09:00:00.000Z",
                endDate: "2025-01-11T15:00:00.000Z",
                description: "Weekly farmers market featuring local vendors and artisans",
                venue: {
                    name: "Calgary Farmers' Market",
                    address: "510 77 Ave SE, Calgary, AB T2H 1C3",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0190, lon: -114.0450 }
                },
                city: "Calgary",
                category: "Market",
                price: "Free admission",
                image: "https://example.com/farmers-market.jpg",
                url: "https://www.calgaryfarmersmarket.ca"
            },
            {
                title: "Calgary Tower - New Year's Eve Celebration",
                startDate: "2024-12-31T21:00:00.000Z",
                endDate: "2025-01-01T01:00:00.000Z",
                description: "Ring in the New Year with fireworks and festivities at Calgary Tower",
                venue: {
                    name: "Calgary Tower",
                    address: "101 9 Ave SW, Calgary, AB T2P 1J9",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0440, lon: -114.0631 }
                },
                city: "Calgary",
                category: "New Year",
                price: "Observation deck $19",
                image: "https://example.com/tower-nye.jpg",
                url: "https://www.calgarytower.com"
            },
            {
                title: "Chinook Winds Winter Market",
                startDate: "2025-02-08T10:00:00.000Z",
                endDate: "2025-02-08T16:00:00.000Z",
                description: "Indoor winter market featuring local crafts, food and entertainment",
                venue: {
                    name: "Chinook Centre",
                    address: "6455 Macleod Trail SW, Calgary, AB T2H 0K8",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 50.9970, lon: -114.0770 }
                },
                city: "Calgary",
                category: "Market",
                price: "Free admission",
                image: "https://example.com/chinook-market.jpg",
                url: "https://www.chinookcentre.com"
            },
            {
                title: "Calgary Hitmen vs Lethbridge Hurricanes",
                startDate: "2025-02-14T19:00:00.000Z",
                endDate: "2025-02-14T22:00:00.000Z",
                description: "WHL hockey game - Valentine's Day special",
                venue: {
                    name: "Scotiabank Saddledome",
                    address: "555 Saddledome Rise SE, Calgary, AB T2G 2W1",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0373, lon: -114.0517 }
                },
                city: "Calgary",
                category: "Sports",
                price: "Tickets from $25",
                image: "https://example.com/hitmen.jpg",
                url: "https://www.hitmenhockey.com"
            },
            {
                title: "Calgary Winter Festival - Ice Sculptures",
                startDate: "2025-01-25T10:00:00.000Z",
                endDate: "2025-02-02T20:00:00.000Z",
                description: "Winter celebration featuring ice sculptures, skating and winter activities",
                venue: {
                    name: "Olympic Plaza",
                    address: "228 8 Ave SE, Calgary, AB T2G 0K7",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0450, lon: -114.0580 }
                },
                city: "Calgary",
                category: "Winter Festival",
                price: "Free outdoor activities",
                image: "https://example.com/winter-fest.jpg",
                url: "https://www.calgary.ca"
            },
            {
                title: "National Music Centre: Studio Sessions",
                startDate: "2025-03-08T19:00:00.000Z",
                endDate: "2025-03-08T21:30:00.000Z",
                description: "Intimate live music performance in historic Studio Bell",
                venue: {
                    name: "Studio Bell - National Music Centre",
                    address: "850 4 St SE, Calgary, AB T2G 1R1",
                    city: "Calgary",
                    province: "AB",
                    coordinates: { lat: 51.0438, lon: -114.0522 }
                },
                city: "Calgary",
                category: "Live Music",
                price: "Tickets from $35",
                image: "https://example.com/studio-bell.jpg",
                url: "https://www.studiobell.ca"
            }
        ];
        
        for (const event of eventsToImport) {
            // Create unique ID for duplicate prevention
            const uniqueId = `${event.title}-${event.startDate.split('T')[0]}-calgary`.toLowerCase().replace(/[^a-z0-9]/g, '-');
            
            const processedEvent = {
                ...event,
                id: uniqueId,
                uniqueId: uniqueId,
                lastUpdated: new Date()
            };
            
            try {
                await collection.replaceOne(
                    { uniqueId: uniqueId },
                    processedEvent,
                    { upsert: true }
                );
                imported++;
                console.log(`✅ Imported: ${event.title}`);
            } catch (dbError) {
                console.log(`⚠️  Database error for "${event.title}":`, dbError.message);
            }
        }
        
        // Get final counts
        const calgaryEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Calgary'},
                {'city': 'Calgary'}
            ]
        });
        
        const futureCalgaryEvents = await collection.countDocuments({
            $or: [
                {'venue.city': 'Calgary'},
                {'city': 'Calgary'}
            ],
            startDate: { $gte: new Date() }
        });
        
        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✅ Total imported: ${imported}`);
        console.log(`📈 Total Calgary events: ${calgaryEvents}`);
        console.log(`🔮 Future Calgary events: ${futureCalgaryEvents}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importCalgaryEvents();
}

module.exports = importCalgaryEvents;
