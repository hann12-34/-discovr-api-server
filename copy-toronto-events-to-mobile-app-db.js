/**
 * 🎯 COPY TORONTO EVENTS FROM MASTER SCRAPER DB TO MOBILE APP DB
 * 
 * The user has been telling me there are different databases:
 * - Master scraper: 681 total events, 89 Toronto events
 * - Mobile app: 317 total events, 7 Toronto events
 * 
 * I need to copy the 89 Toronto events to the mobile app database!
 */

const mongoose = require('mongoose');

// Possible database URIs and database names
const uris = [
    'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
    'mongodb+srv://discovr123:discovr1234@cluster0.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr'
];

const dbNames = ['test', 'discovr', 'events', 'production'];

async function copyTorontoEventsToMobileApp() {
    console.log('🎯 COPYING TORONTO EVENTS FROM MASTER SCRAPER TO MOBILE APP DATABASE\n');
    
    let sourceEvents = null;
    let targetConnection = null;
    
    // Step 1: Find the database with 681 events (master scraper database)
    console.log('🔍 STEP 1: Finding master scraper database (681 events)...');
    for (const uri of uris) {
        for (const dbName of dbNames) {
            try {
                await mongoose.connect(uri);
                const db = mongoose.connection.client.db(dbName);
                const collection = db.collection('events');
                const count = await collection.countDocuments();
                
                if (count >= 680 && count <= 685) {
                    console.log(`✅ FOUND MASTER SCRAPER DB: ${dbName} with ${count} events`);
                    
                    // Get Toronto events
                    const torontoEvents = await collection.find({ 
                        city: { $regex: /toronto/i } 
                    }).toArray();
                    
                    console.log(`📦 Found ${torontoEvents.length} Toronto events to copy`);
                    sourceEvents = torontoEvents;
                    break;
                }
                
                await mongoose.disconnect();
            } catch (error) {
                // Continue searching
            }
        }
        if (sourceEvents) break;
    }
    
    if (!sourceEvents) {
        console.log('❌ Could not find master scraper database with 681 events');
        return;
    }
    
    // Step 2: Find the database with 317 events (mobile app database)
    console.log('\n🔍 STEP 2: Finding mobile app database (317 events)...');
    for (const uri of uris) {
        for (const dbName of dbNames) {
            try {
                await mongoose.connect(uri);
                const db = mongoose.connection.client.db(dbName);
                const collection = db.collection('events');
                const count = await collection.countDocuments();
                
                if (count >= 315 && count <= 320) {
                    console.log(`✅ FOUND MOBILE APP DB: ${dbName} with ${count} events`);
                    targetConnection = { db, collection };
                    break;
                }
                
                await mongoose.disconnect();
            } catch (error) {
                // Continue searching
            }
        }
        if (targetConnection) break;
    }
    
    if (!targetConnection) {
        console.log('❌ Could not find mobile app database with 317 events');
        return;
    }
    
    // Step 3: Copy Toronto events to mobile app database
    console.log('\n🚀 STEP 3: Copying Toronto events to mobile app database...');
    
    let copiedCount = 0;
    for (const event of sourceEvents) {
        try {
            // Remove _id to avoid conflicts
            delete event._id;
            
            // Upsert the event
            await targetConnection.collection.updateOne(
                { id: event.id },
                { $set: event },
                { upsert: true }
            );
            
            copiedCount++;
        } catch (error) {
            console.log(`⚠️ Failed to copy event: ${event.title}`);
        }
    }
    
    // Verify final counts
    const finalCount = await targetConnection.collection.countDocuments();
    const finalTorontoCount = await targetConnection.collection.countDocuments({ 
        city: { $regex: /toronto/i } 
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 COPY RESULTS:');
    console.log(`✅ Toronto events copied: ${copiedCount}`);
    console.log(`📊 Mobile app database total events: ${finalCount}`);
    console.log(`🏙️ Mobile app database Toronto events: ${finalTorontoCount}`);
    
    console.log('\n🎯 SUCCESS! Toronto events copied to mobile app database!');
    console.log('📱 Your mobile app should now show many more Toronto events!');
    
    await mongoose.disconnect();
}

copyTorontoEventsToMobileApp().catch(console.error);
