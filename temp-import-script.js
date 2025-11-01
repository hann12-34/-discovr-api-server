#!/usr/bin/env node

// Improved Vancouver Master Scraper - replaces broken mass import
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// 50+ Syntax-valid scrapers (expanding towards 100)
const reliableScrapers = [
    'fortuneSoundClub.js',
    'commodoreBallroom.js',
    'orpheum.js',
    'rogersArena.js',
    'bcPlace.js',
    'vancouverSymphony.js',
    'vancouverArtGallery.js',
    'scienceWorld.js',
    'granvilleIsland.js',
    'capilanoSuspensionBridge.js',
    'grouseMountain.js',
    'vandusenGarden.js',
    'museumOfVancouver.js',
    'museumOfAnthropology.js',
    'artsClubTheatre.js',
    'firehallArtsCentre.js',
    'pacificTheatre.js',
    'theatreUnderTheStars.js',
    'pushFestival.js',
    'vancouverFringe.js',
    'viff.js',
    'vancouverPride.js',
    'bardOnTheBeach.js',
    'foxCabaret.js',
    'biltmoreCabaret.js',
    'celebritiesNightclub.js',
    'penthouseNightclub.js',
    'redRoomUltraBar.js',
    'electricOwl.js',
    'thePearl.js',
    'theRoxy.js',
    'phoenixConcertTheatre.js',
    'pacificColiseum.js',
    'queenElizabethTheatre.js',
    'do604.js',
    'georgiaStraight.js',
    'eventbriteVancouver.js',
    'dailyHiveVancouver.js',
    'bandsintown.js',
    'balletBC.js',
    'billReidGallery.js',
    'canadaPlace.js',
    'ubcChanCentre.js',
    'performanceWorks.js',
    'redTruckBeerCompany.js',
    'granvilleIslandBrewing.js',
    'steamworksBrewpub.js',
    'japanMarket.js',
    'musicOnMain.js',
    'broadwayRave.js',
    'theVenue.js',
    'malkinBowl.js',
    'playhouse.js',
    'gatewayTheatre.js',
    'studioTheatre.js',
    'centennialTheatre.js',
    'vogueTheatre_clean.js',
    'vogueTheatre.js',
    'vsffEvents.js',
    // Adding more syntax-valid scrapers
    'richmondOvalEvents_clean.js',
    'roundhouseEvents_clean.js',
    'scienceWorldEvents_clean.js',
    'stanleyParkEvents_clean.js',
    'summerNightMarketEvents_clean.js',
    'surreyCentreEvents_clean.js',
    'surreyLibraryEvents_clean.js',
    'surreyMuseumEvents_clean.js',
    'theRioTheatreEvents_clean.js',
    'ubcBookstoreEvents_clean.js',
    'vancouverAquariumEvents_clean.js',
    'vancouverCanucksEvents_clean.js',
    'vancouverComicArtsEvents_clean.js',
    'vancouverConventionCentreEvents_clean.js',
    'vancouverFilmFestivalEvents_clean.js',
    'vancouverOperaEvents_clean.js',
    'vanDusenGardenEvents_clean.js'
];

// Date validation and correction
function validateAndFixDate(dateString, eventTitle) {
    if (!dateString) {
        console.log(`⚠️  No date for "${eventTitle}" - skipping`);
        return null;
    }
    
    const date = new Date(dateString);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    // Skip events with invalid dates
    if (isNaN(date.getTime())) {
        console.log(`❌ Invalid date for "${eventTitle}": ${dateString}`);
        return null;
    }
    
    // Skip events older than 1 year or more than 1 year in future
    if (date < oneYearAgo || date > oneYearFromNow) {
        console.log(`📅 Date out of range for "${eventTitle}": ${date.toDateString()}`);
        return null;
    }
    
    return date;
}

async function importReliableEvents() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        let totalImported = 0;
        let totalSkipped = 0;
        
        for (const scraperFile of reliableScrapers) {
            const scraperPath = path.join(__dirname, '..', 'scrapers', 'cities', 'vancouver', scraperFile);
            
            if (!fs.existsSync(scraperPath)) {
                console.log(`⚠️  Scraper not found: ${scraperFile}`);
                continue;
            }
            
            try {
                console.log(`\n🔄 Running: ${scraperFile}`);
                const scraper = require(scraperPath);
                
                if (typeof scraper === 'function') {
                    let events;
                    try {
                        events = await scraper('Vancouver');
                    } catch (scraperError) {
                        console.log(`❌ Runtime error in ${scraperFile}: ${scraperError.message.split('\n')[0]}`);
                        continue;
                    }
                    
                    if (events && events.length > 0) {
                        let scraperImported = 0;
                        let scraperSkipped = 0;
                        
                        for (const event of events) {
                            // Validate dates before importing
                            const validStartDate = validateAndFixDate(event.date, event.title);
                            
                            if (!validStartDate) {
                                scraperSkipped++;
                                totalSkipped++;
                                continue;
                            }
                            
                            // Ensure proper Vancouver tagging
                            const cleanEvent = {
                                ...event,
                                startDate: validStartDate,
                                endDate: validateAndFixDate(event.endDate, event.title) || validStartDate,
                                venue: {
                                    ...event.venue,
                                    city: 'Vancouver'
                                },
                                city: 'Vancouver'
                            };
                            
                            try {
                                await collection.updateOne(
                                    { 
                                        title: cleanEvent.title,
                                        'venue.name': cleanEvent.venue.name,
                                        startDate: cleanEvent.startDate
                                    },
                                    { $set: cleanEvent },
                                    { upsert: true }
                                );
                                scraperImported++;
                                totalImported++;
                            } catch (insertError) {
                                if (!insertError.message.includes('duplicate key')) {
                                    console.log(`❌ Insert error for ${cleanEvent.title}: ${insertError.message}`);
                                }
                            }
                        }
                        
                        console.log(`✅ ${scraperFile}: ${scraperImported} imported, ${scraperSkipped} skipped`);
                    }
                } else {
                    console.log(`❌ ${scraperFile}: Not a function`);
                }
            } catch (error) {
                console.log(`❌ Error in ${scraperFile}: ${error.message}`);
            }
        }
        
        // Final summary
        const vancouverCount = await collection.countDocuments({ 'venue.city': 'Vancouver' });
        const futureEvents = await collection.countDocuments({ 
            'venue.city': 'Vancouver',
            startDate: { $gte: new Date() }
        });
        
        console.log(`\n📊 IMPORT SUMMARY:`);
        console.log(`✅ Total imported: ${totalImported}`);
        console.log(`⚠️  Total skipped (bad dates): ${totalSkipped}`);
        console.log(`📈 Total Vancouver events: ${vancouverCount}`);
        console.log(`🔮 Future Vancouver events: ${futureEvents}`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    importReliableEvents();
}

module.exports = { importReliableEvents };
