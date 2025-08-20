#!/usr/bin/env node

// Montreal Events Generator - Static events to bootstrap Montreal data
const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Static Montreal events to bootstrap the database
const montrealEvents = [
    {
        id: 'montreal-jazz-festival',
        title: 'Festival International de Jazz de Montréal',
        description: 'World\'s largest jazz festival featuring over 500 concerts and 3,000 artists from around the globe.',
        startDate: new Date('2024-06-28').toISOString(),
        endDate: new Date('2024-07-07').toISOString(),
        venue: {
            name: 'Place des Arts',
            address: '175 Rue Sainte-Catherine O, Montréal, QC H2X 1Z8',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5073, lon: -73.5669 }
        },
        city: 'Montreal',
        category: 'Music',
        price: 'Free-$85',
        url: 'https://www.montrealjazzfest.com',
        image: 'https://www.montrealjazzfest.com/images/logo.jpg',
        isFeatured: true
    },
    {
        id: 'just-for-laughs',
        title: 'Just for Laughs Festival / Juste pour rire',
        description: 'The world\'s largest international comedy festival featuring stand-up, improv, and street performers.',
        startDate: new Date('2024-07-10').toISOString(),
        endDate: new Date('2024-07-28').toISOString(),
        venue: {
            name: 'Quartier des Spectacles',
            address: 'Downtown Montreal, QC',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5088, lon: -73.5656 }
        },
        city: 'Montreal',
        category: 'Comedy',
        price: '$25-120',
        url: 'https://www.hahaha.com',
        isFeatured: true
    },
    {
        id: 'osm-montreal-symphony',
        title: 'Orchestre symphonique de Montréal',
        description: 'World-renowned symphony orchestra performing classical masterpieces at Maison symphonique.',
        startDate: new Date('2024-09-15').toISOString(),
        endDate: new Date('2024-09-15').toISOString(),
        venue: {
            name: 'Maison symphonique de Montréal',
            address: '1600 Rue Saint-Urbain, Montréal, QC H2X 0S1',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5088, lon: -73.5660 }
        },
        city: 'Montreal',
        category: 'Classical',
        price: '$45-150',
        url: 'https://www.osm.ca',
        isFeatured: false
    },
    {
        id: 'montreal-canadiens-game',
        title: 'Canadiens de Montréal vs Toronto Maple Leafs',
        description: 'Historic NHL rivalry at the Bell Centre - hockey\'s most legendary matchup.',
        startDate: new Date('2024-11-09').toISOString(),
        endDate: new Date('2024-11-09').toISOString(),
        venue: {
            name: 'Centre Bell',
            address: '1909 Av. des Canadiens-de-Montréal, Montréal, QC H4B 5G0',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.4962, lon: -73.5693 }
        },
        city: 'Montreal',
        category: 'Sports',
        price: '$75-400',
        url: 'https://www.nhl.com/canadiens',
        isFeatured: true
    },
    {
        id: 'biodome-montreal',
        title: 'Biodôme de Montréal Exhibition',
        description: 'Immersive ecosystem experience featuring four distinct habitats from the Americas.',
        startDate: new Date('2024-10-01').toISOString(),
        endDate: new Date('2025-03-31').toISOString(),
        venue: {
            name: 'Biodôme de Montréal',
            address: '4777 Av. Pierre-De Coubertin, Montréal, QC H1V 1B3',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5597, lon: -73.5496 }
        },
        city: 'Montreal',
        category: 'Science',
        price: '$22-28',
        url: 'https://espacepourlavie.ca/biodome',
        isFeatured: false
    },
    {
        id: 'old-montreal-walking-tour',
        title: 'Vieux-Montréal Historical Walking Tour',
        description: 'Explore cobblestone streets, historic architecture, and French colonial heritage.',
        startDate: new Date('2024-08-20').toISOString(),
        endDate: new Date('2024-08-20').toISOString(),
        venue: {
            name: 'Vieux-Montréal',
            address: 'Place Jacques-Cartier, Montréal, QC H2Y 3Y5',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5088, lon: -73.5536 }
        },
        city: 'Montreal',
        category: 'Cultural',
        price: '$15-35',
        url: 'https://www.tourismemontreal.org',
        isFeatured: false
    },
    {
        id: 'cirque-du-soleil-montreal',
        title: 'Cirque du Soleil - KOOZA',
        description: 'World-famous Montreal-based circus troupe presents acrobatic performances and storytelling.',
        startDate: new Date('2024-12-15').toISOString(),
        endDate: new Date('2025-01-08').toISOString(),
        venue: {
            name: 'Place des Arts',
            address: '175 Rue Sainte-Catherine O, Montréal, QC H2X 1Z8',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5073, lon: -73.5669 }
        },
        city: 'Montreal',
        category: 'Performance',
        price: '$65-185',
        url: 'https://www.cirquedusoleil.com',
        isFeatured: true
    },
    {
        id: 'mount-royal-park-activities',
        title: 'Mount Royal Park Winter Activities',
        description: 'Cross-country skiing, snowshoeing, and winter hiking in Montreal\'s iconic park.',
        startDate: new Date('2024-12-01').toISOString(),
        endDate: new Date('2025-03-15').toISOString(),
        venue: {
            name: 'Parc du Mont-Royal',
            address: '1260 Chemin Remembrance, Montréal, QC H3H 1A2',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5019, lon: -73.5878 }
        },
        city: 'Montreal',
        category: 'Outdoor',
        price: 'Free',
        url: 'https://www.lemontroyal.qc.ca',
        isFeatured: false
    },
    {
        id: 'musee-beaux-arts-montreal',
        title: 'Musée des beaux-arts de Montréal - Special Exhibition',
        description: 'Contemporary art exhibitions featuring Canadian and international artists.',
        startDate: new Date('2024-09-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        venue: {
            name: 'Musée des beaux-arts de Montréal',
            address: '1380 Rue Sherbrooke O, Montréal, QC H3G 1J5',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.4992, lon: -73.5799 }
        },
        city: 'Montreal',
        category: 'Art',
        price: '$16-24',
        url: 'https://www.mbam.qc.ca',
        isFeatured: false
    },
    {
        id: 'notre-dame-basilica-concerts',
        title: 'Notre-Dame Basilica Sacred Music Concert',
        description: 'Classical and sacred music performances in Montreal\'s stunning Gothic Revival basilica.',
        startDate: new Date('2024-10-15').toISOString(),
        endDate: new Date('2024-10-15').toISOString(),
        venue: {
            name: 'Basilique Notre-Dame de Montréal',
            address: '110 Rue Notre-Dame O, Montréal, QC H2Y 1T2',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5045, lon: -73.5563 }
        },
        city: 'Montreal',
        category: 'Music',
        price: '$25-65',
        url: 'https://www.basiliquenotredame.ca',
        isFeatured: false
    },
    {
        id: 'montreal-botanical-garden',
        title: 'Jardin botanique de Montréal - Gardens of Light',
        description: 'Illuminated Chinese and Japanese gardens with magical lantern displays.',
        startDate: new Date('2024-09-06').toISOString(),
        endDate: new Date('2024-10-31').toISOString(),
        venue: {
            name: 'Jardin botanique de Montréal',
            address: '4101 Rue Sherbrooke E, Montréal, QC H1X 2B2',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5574, lon: -73.5524 }
        },
        city: 'Montreal',
        category: 'Nature',
        price: '$15-23',
        url: 'https://espacepourlavie.ca/jardin-botanique',
        isFeatured: false
    },
    {
        id: 'st-lawrence-market-montreal',
        title: 'Marché Jean-Talon - Weekend Market',
        description: 'Vibrant public market featuring local Quebec produce, artisans, and food vendors.',
        startDate: new Date('2024-08-24').toISOString(),
        endDate: new Date('2024-08-25').toISOString(),
        venue: {
            name: 'Marché Jean-Talon',
            address: '7070 Av. Henri-Julien, Montréal, QC H2S 3S3',
            city: 'Montreal',
            province: 'QC',
            coordinates: { lat: 45.5356, lon: -73.6288 }
        },
        city: 'Montreal',
        category: 'Market',
        price: 'Free entry',
        url: 'https://marche-jean-talon.com',
        isFeatured: false
    }
];

async function importMontrealEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        for (const event of montrealEvents) {
            try {
                // Use upsert to avoid duplicates
                await collection.replaceOne(
                    { id: event.id },
                    event,
                    { upsert: true }
                );
                console.log(`✅ Imported: ${event.title}`);
            } catch (error) {
                console.log(`⚠️  Error importing "${event.title}":`, error.message);
            }
        }
        
        // Get totals
        const totalEvents = await collection.countDocuments({ city: 'Montreal' });
        const futureEvents = await collection.countDocuments({
            city: 'Montreal',
            startDate: { $gte: new Date().toISOString() }
        });
        
        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✅ Total imported: ${montrealEvents.length}`);
        console.log(`📈 Total Montreal events: ${totalEvents}`);
        console.log(`🔮 Future Montreal events: ${futureEvents}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await client.close();
    }
}

// Run the import
if (require.main === module) {
    importMontrealEvents();
}

module.exports = { importMontrealEvents, montrealEvents };
