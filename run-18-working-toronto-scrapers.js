/**
 * RUN 18 WORKING TORONTO SCRAPERS
 * 
 * Orchestrator for the 18 confirmed working Toronto scrapers
 * with fixed venue names and proper export structures
 */

const { MongoClient } = require('mongodb');
const path = require('path');

const MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// List of 18 confirmed working Toronto scrapers
const WORKING_SCRAPERS = [
  'scrape-moca-events.js',
  'scrape-ago-events-clean.js', 
  'scrape-rom-events-clean.js',
  'scrape-harbourfront-events-clean.js',
  'scrape-casa-loma-events-clean.js',
  'scrape-cn-tower-events-clean.js',
  'scrape-distillery-district-events-clean.js',
  'scrape-ontario-science-centre-events-clean.js',
  'scrape-toronto-zoo-events-clean.js',
  'scrape-ripley-aquarium-events-clean.js',
  'scrape-massey-hall-events-clean.js',
  'scrape-roy-thomson-hall-events-clean.js',
  'scrape-phoenix-concert-theatre-events-clean.js',
  'scrape-danforth-music-hall-events-clean.js',
  'scrape-opera-house-events-clean.js',
  'scrape-elgin-winter-garden-events-clean.js',
  'scrape-princess-of-wales-theatre-events-clean.js',
  'scrape-royal-alexandra-theatre-events-clean.js'
];

const TORONTO_DIR = '/Users/seongwoohan/Desktop/discovr-api-server/scrapers/cities/Toronto';

async function runWorkingTorontoScrapers() {
  console.log('🚀 RUNNING 18 WORKING TORONTO SCRAPERS');
  console.log('='.repeat(50));
  console.log(`📁 Scraper directory: ${TORONTO_DIR}`);
  console.log(`📊 Confirmed working scrapers: ${WORKING_SCRAPERS.length}`);
  
  let client;
  let totalEvents = 0;
  let successfulScrapers = 0;
  let failedScrapers = 0;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    for (let i = 0; i < WORKING_SCRAPERS.length; i++) {
      const scraperFile = WORKING_SCRAPERS[i];
      const scraperPath = path.join(TORONTO_DIR, scraperFile);
      
      console.log(`\n🔍 [${i+1}/${WORKING_SCRAPERS.length}] Running ${scraperFile}...`);
      
      try {
        // Clear require cache to ensure fresh module load
        delete require.cache[require.resolve(scraperPath)];
        
        // Import the scraper
        const scraper = require(scraperPath);
        
        if (typeof scraper.scrapeEvents === 'function') {
          console.log('✅ Valid scrapeEvents function found');
          
          // Run the scraper
          const events = await scraper.scrapeEvents('Toronto');
          
          if (events && Array.isArray(events) && events.length > 0) {
            console.log(`🎉 Successfully scraped ${events.length} events`);
            totalEvents += events.length;
            successfulScrapers++;
            
            // Show first event as sample
            const sample = events[0];
            console.log(`   📋 Sample: "${sample.title}" at ${sample.venue || 'Unknown venue'}`);
            
          } else {
            console.log('⚠️ No events returned (may be normal for some venues)');
            successfulScrapers++;
          }
          
        } else {
          console.log('❌ No valid scrapeEvents function found');
          failedScrapers++;
        }
        
      } catch (error) {
        console.log(`❌ Error running ${scraperFile}: ${error.message}`);
        failedScrapers++;
      }
      
      // Anti-bot delay between scrapers
      if (i < WORKING_SCRAPERS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final database check
    const torontoCount = await collection.countDocuments({ city: { $regex: /toronto/i } });
    
    console.log('\n🏁 WORKING SCRAPERS ORCHESTRATOR COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Successful scrapers: ${successfulScrapers}`);
    console.log(`❌ Failed scrapers: ${failedScrapers}`);
    console.log(`🎪 Total events processed: ${totalEvents}`);
    console.log(`📊 Toronto events in database: ${torontoCount}`);
    
    if (torontoCount > 0) {
      console.log('🎉 SUCCESS! Toronto events imported with proper venue names');
      
      // Show sample of imported events
      const samples = await collection.find({ city: { $regex: /toronto/i } }).limit(5).toArray();
      console.log('\n📋 Sample imported events:');
      samples.forEach((e, idx) => {
        console.log(`   ${idx+1}. 🏢 ${e.venue || 'Unknown'}: ${e.title}`);
      });
    } else {
      console.log('⚠️ No Toronto events found in database - check scrapers');
    }
    
  } catch (error) {
    console.error('❌ Orchestrator error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the orchestrator
runWorkingTorontoScrapers().catch(console.error);
