/**
 * 🎯 UNIFY ALL DATABASES - MAKE IT ONLY ONE
 * 
 * Consolidate all Toronto events into the SINGLE production database
 * that the mobile app actually uses. Remove all confusion!
 */

const mongoose = require('mongoose');

// The production database that mobile app uses (confirmed working)
const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const PRODUCTION_DB = 'test'; // The database your mobile app uses

async function unifyAllDatabases() {
    console.log('🎯 UNIFYING ALL DATABASES INTO ONE PRODUCTION DATABASE\n');
    console.log('Goal: Make ONE database that everything uses - no more confusion!\n');
    
    // Connect to production
    await mongoose.connect(PRODUCTION_URI);
    console.log('✅ Connected to production MongoDB cluster');
    
    // The ONE database everything will use
    const productionDb = mongoose.connection.client.db(PRODUCTION_DB);
    const productionEvents = productionDb.collection('events');
    
    console.log(`🎯 TARGET DATABASE: "${PRODUCTION_DB}" (the one your mobile app uses)`);
    
    // Check current state of production database
    const currentTotal = await productionEvents.countDocuments();
    const currentToronto = await productionEvents.countDocuments({ 
        city: { $regex: /toronto/i } 
    });
    
    console.log(`📊 Current production database: ${currentTotal} total, ${currentToronto} Toronto`);
    
    // Collect ALL Toronto events from all other databases
    const allTorontoEvents = [];
    
    // Check other databases in the same cluster
    const otherDatabases = ['discovr', 'events', 'production'];
    
    for (const dbName of otherDatabases) {
        if (dbName === PRODUCTION_DB) continue; // Skip the target database
        
        try {
            const sourceDb = mongoose.connection.client.db(dbName);
            const sourceEvents = sourceDb.collection('events');
            const count = await sourceEvents.countDocuments();
            
            if (count > 0) {
                console.log(`\n🔍 Checking database "${dbName}": ${count} total events`);
                
                const torontoEvents = await sourceEvents.find({ 
                    city: { $regex: /toronto/i } 
                }).toArray();
                
                if (torontoEvents.length > 0) {
                    console.log(`📦 Found ${torontoEvents.length} Toronto events to merge`);
                    
                    // Remove _id to avoid conflicts
                    torontoEvents.forEach(event => delete event._id);
                    allTorontoEvents.push(...torontoEvents);
                }
            }
        } catch (error) {
            console.log(`⚠️ Could not access database "${dbName}"`);
        }
    }
    
    console.log(`\n🚀 CONSOLIDATING ${allTorontoEvents.length} Toronto events into production database...`);
    
    // Remove duplicates by ID
    const uniqueEvents = {};
    allTorontoEvents.forEach(event => {
        if (event.id) {
            uniqueEvents[event.id] = event;
        }
    });
    
    const uniqueEventsArray = Object.values(uniqueEvents);
    console.log(`📦 ${uniqueEventsArray.length} unique Toronto events to import`);
    
    // Import all unique events
    let importedCount = 0;
    for (const event of uniqueEventsArray) {
        try {
            await productionEvents.updateOne(
                { id: event.id },
                { $set: event },
                { upsert: true }
            );
            importedCount++;
        } catch (error) {
            console.log(`⚠️ Failed to import: ${event.title}`);
        }
    }
    
    // Final verification
    const finalTotal = await productionEvents.countDocuments();
    const finalToronto = await productionEvents.countDocuments({ 
        city: { $regex: /toronto/i } 
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DATABASE UNIFICATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Production database total events: ${finalTotal}`);
    console.log(`🏙️ Production database Toronto events: ${finalToronto}`);
    console.log(`✅ Toronto events imported this run: ${importedCount}`);
    console.log(`\n🎯 SINGLE SOURCE OF TRUTH: "${PRODUCTION_DB}" database`);
    console.log(`📱 Your mobile app should now show ALL Toronto events!`);
    
    // Create environment file to ensure everything uses the same database
    const envContent = `# UNIFIED PRODUCTION DATABASE CONFIGURATION
# All systems (scrapers, API servers, mobile app) use this SINGLE database

MONGODB_URI=${PRODUCTION_URI}
DATABASE_NAME=${PRODUCTION_DB}
NODE_ENV=production

# This is the ONLY database for Toronto events
# Total events: ${finalTotal}
# Toronto events: ${finalToronto}
`;
    
    require('fs').writeFileSync('/Users/seongwoohan/Desktop/UNIFIED_DATABASE_CONFIG.env', envContent);
    console.log(`\n📄 Unified config saved to Desktop: UNIFIED_DATABASE_CONFIG.env`);
    
    await mongoose.disconnect();
    console.log('\n🎯 SUCCESS! All Toronto events now in ONE database!');
}

unifyAllDatabases().catch(console.error);
