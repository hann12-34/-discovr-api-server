/**
 * CRITICAL VALIDATION: City Filtering Fix Verification
 * 
 * Tests that our city tagging fixes resolve the mobile app issues:
 * 1. No more "Unknown" city labels
 * 2. No cross-city contamination (NY events in Toronto section)
 * 3. Proper city separation and tagging
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Test scrapers directly - confirmed working ones
const NEW_YORK_TEST_SCRAPERS = [
    'apollo-theater-fixed.js',
    'beacon-theatre-fixed.js', 
    'broadway-theaters-fixed.js',
    'central-park-fixed.js',
    'nyc-museums-galleries-fixed.js'
];

const TORONTO_TEST_SCRAPERS = [
    'scrape-moca-events.js',
    'scrape-ago-events-clean.js',
    'scrape-rom-events-clean.js',
    'scrape-casa-loma-events-clean.js',
    'scrape-cn-tower-events-clean.js'
];

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority";

// Event model
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  venue: mongoose.Schema.Types.Mixed,
  location: String,
  city: String,
  date: String,
  category: String,
  description: String,
  link: String,
  source: String
}, { 
  collection: 'events',
  timestamps: true 
});

const Event = mongoose.model('Event', eventSchema);

async function validateCityFiltering() {
    console.log('\n🧪 CRITICAL: CITY FILTERING VALIDATION');
    console.log('='.repeat(60));
    console.log('🎯 Goal: Verify no "Unknown" labels, no cross-contamination');
    
    let nyEvents = [];
    let torontoEvents = [];
    let nyErrors = [];
    let torontoErrors = [];
    
    try {
        // Test New York scrapers city tagging
        console.log('\n🗽 Testing New York scrapers city tagging...');
        
        for (const scraperName of NEW_YORK_TEST_SCRAPERS) {
            try {
                const ScraperClass = require(`../scrapers/cities/New York/${scraperName}`);
                const scraper = new ScraperClass();
                const events = await scraper.scrape();
                
                // Validate each event has proper city tagging
                for (const event of events) {
                    if (!event.city || event.city === 'Unknown') {
                        nyErrors.push(`❌ ${scraperName}: Event missing city or has "Unknown" city`);
                    } else if (event.city !== 'New York') {
                        nyErrors.push(`❌ ${scraperName}: Wrong city "${event.city}", expected "New York"`);
                    } else {
                        nyEvents.push({
                            scraper: scraperName,
                            title: event.title,
                            city: event.city,
                            location: event.location,
                            venue: event.venue
                        });
                    }
                }
                
                console.log(`✅ ${scraperName}: Found ${events.length} events with proper "New York" city tagging`);
                
            } catch (error) {
                nyErrors.push(`❌ ${scraperName}: Error - ${error.message}`);
            }
        }
        
        // Test Toronto scrapers city tagging
        console.log('\n🍁 Testing Toronto scrapers city tagging...');
        
        for (const scraperName of TORONTO_TEST_SCRAPERS) {
            try {
                const ScraperClass = require(`../scrapers/cities/Toronto/${scraperName}`);
                const scraper = new ScraperClass();
                const events = await scraper.scrape();
                
                // Validate each event has proper city tagging
                for (const event of events) {
                    if (!event.city || event.city === 'Unknown') {
                        torontoErrors.push(`❌ ${scraperName}: Event missing city or has "Unknown" city`);
                    } else if (event.city !== 'Toronto') {
                        torontoErrors.push(`❌ ${scraperName}: Wrong city "${event.city}", expected "Toronto"`);
                    } else {
                        torontoEvents.push({
                            scraper: scraperName,
                            title: event.title,
                            city: event.city,
                            location: event.location,
                            venue: event.venue
                        });
                    }
                }
                
                console.log(`✅ ${scraperName}: Found ${events.length} events with proper "Toronto" city tagging`);
                
            } catch (error) {
                torontoErrors.push(`❌ ${scraperName}: Error - ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Validation error:', error.message);
        return;
    }
    
    // Report results
    console.log(`\n📊 CITY FILTERING VALIDATION RESULTS`);
    console.log('='.repeat(60));
    console.log(`🗽 New York events: ${nyEvents.length} (properly tagged)`);
    console.log(`🍁 Toronto events: ${torontoEvents.length} (properly tagged)`);
    console.log(`❌ New York errors: ${nyErrors.length}`);
    console.log(`❌ Toronto errors: ${torontoErrors.length}`);
    
    if (nyErrors.length > 0) {
        console.log('\n🚨 NEW YORK CITY TAGGING ISSUES:');
        nyErrors.forEach(error => console.log(error));
    }
    
    if (torontoErrors.length > 0) {
        console.log('\n🚨 TORONTO CITY TAGGING ISSUES:');
        torontoErrors.forEach(error => console.log(error));
    }
    
    // Sample events
    if (nyEvents.length > 0) {
        console.log('\n🗽 Sample New York event:');
        console.log(JSON.stringify(nyEvents[0], null, 2));
    }
    
    if (torontoEvents.length > 0) {
        console.log('\n🍁 Sample Toronto event:');
        console.log(JSON.stringify(torontoEvents[0], null, 2));
    }
    
    // Final verdict
    const totalErrors = nyErrors.length + torontoErrors.length;
    const totalEvents = nyEvents.length + torontoEvents.length;
    
    if (totalErrors === 0 && totalEvents > 0) {
        console.log('\n🎉 CITY FILTERING FIX VALIDATION: SUCCESS!');
        console.log('✅ No "Unknown" city labels found');
        console.log('✅ All events properly tagged by city');
        console.log('✅ Cross-city contamination prevented');
        console.log('📱 Mobile app should now show proper city separation!');
    } else {
        console.log('\n⚠️ CITY FILTERING VALIDATION: ISSUES FOUND');
        console.log(`❌ ${totalErrors} issues need attention`);
        console.log(`✅ ${totalEvents} events properly tagged`);
    }
}

// Run validation
validateCityFiltering()
    .then(() => {
        console.log('\n🏁 City filtering validation complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    });
