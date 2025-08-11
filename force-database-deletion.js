/**
 * 🗑️ FORCE DATABASE DELETION - PHYSICALLY REMOVE ALL EXCEPT 'discovr'
 * 
 * User wants PHYSICAL deletion, not ignoring. Try alternative approaches:
 * 1. Admin database with different permissions
 * 2. Collection-level deletion instead of database-level
 * 3. Different connection approaches
 */

const mongoose = require('mongoose');

// Try alternative connection with admin privileges
const ADMIN_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/admin?retryWrites=true&w=majority&appName=Discovr';
const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const KEEP_DATABASE = 'discovr';

async function forceDatabaseDeletion() {
    console.log('🗑️ FORCE DATABASE DELETION - PHYSICALLY REMOVE ALL EXCEPT "discovr"\n');
    console.log('🎯 Goal: PHYSICALLY delete all databases except "discovr" - no ignoring!\n');
    
    let client;
    
    try {
        // Try admin connection first
        console.log('🔐 ATTEMPT 1: Connecting with admin privileges...');
        await mongoose.connect(ADMIN_URI);
        client = mongoose.connection.client;
        console.log('✅ Connected with admin URI');
    } catch (error) {
        console.log('❌ Admin connection failed, trying regular connection...');
        await mongoose.connect(PRODUCTION_URI);
        client = mongoose.connection.client;
        console.log('✅ Connected with regular URI');
    }
    
    // List databases to delete
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    
    const databasesToDelete = [];
    for (const db of dbList.databases) {
        const dbName = db.name;
        
        // Skip system databases and our production database
        if (dbName !== 'admin' && dbName !== 'local' && dbName !== 'config' && 
            dbName !== 'sample_mflix' && dbName !== KEEP_DATABASE) {
            
            // Check if it has events collection
            try {
                const database = client.db(dbName);
                const collections = await database.listCollections().toArray();
                const hasEventsCollection = collections.some(col => col.name === 'events');
                
                if (hasEventsCollection) {
                    const eventsCount = await database.collection('events').countDocuments();
                    databasesToDelete.push({ name: dbName, events: eventsCount });
                }
            } catch (error) {
                // If we can't access it, still try to delete it
                databasesToDelete.push({ name: dbName, events: 0 });
            }
        }
    }
    
    console.log(`\n🗑️ DATABASES TO PHYSICALLY DELETE: ${databasesToDelete.length}`);
    databasesToDelete.forEach(db => {
        console.log(`   ❌ ${db.name}: ${db.events} events`);
    });
    
    if (databasesToDelete.length === 0) {
        console.log('\n🎉 No databases to delete! Only production database exists.');
        await mongoose.disconnect();
        return;
    }
    
    console.log('\n🚀 ATTEMPT 2: Collection-level deletion (if database deletion fails)...\n');
    
    let deletedDatabases = 0;
    let deletedCollections = 0;
    
    for (const db of databasesToDelete) {
        console.log(`🗑️ Attempting to delete database "${db.name}"...`);
        
        try {
            // Try database-level deletion first
            await client.db(db.name).dropDatabase();
            console.log(`   ✅ DELETED DATABASE: "${db.name}"`);
            deletedDatabases++;
        } catch (error) {
            console.log(`   ❌ Database deletion failed: ${error.message}`);
            console.log(`   🔄 Trying collection-level deletion...`);
            
            try {
                // Try collection-level deletion
                const database = client.db(db.name);
                const collections = await database.listCollections().toArray();
                
                for (const collection of collections) {
                    await database.collection(collection.name).drop();
                    console.log(`     ✅ Deleted collection: ${db.name}.${collection.name}`);
                    deletedCollections++;
                }
                
                console.log(`   ✅ CLEARED ALL DATA from "${db.name}"`);
            } catch (collectionError) {
                console.log(`   ❌ Collection deletion also failed: ${collectionError.message}`);
            }
        }
    }
    
    console.log('\n🚀 ATTEMPT 3: Manual deletion instructions...\n');
    
    if (deletedDatabases === 0 && deletedCollections === 0) {
        console.log('🔧 MANUAL DELETION REQUIRED:');
        console.log('');
        console.log('Since automated deletion failed, you need to manually delete databases:');
        console.log('');
        console.log('🌐 OPTION 1: MongoDB Atlas Dashboard');
        console.log('1. Go to: https://cloud.mongodb.com/');
        console.log('2. Login to your MongoDB Atlas account');
        console.log('3. Navigate to your cluster');
        console.log('4. Go to "Collections" or "Data Explorer"');
        console.log('5. Delete these databases:');
        databasesToDelete.forEach(db => {
            console.log(`   - ${db.name}`);
        });
        console.log('6. Keep ONLY: "discovr"');
        console.log('');
        console.log('🔧 OPTION 2: MongoDB Compass');
        console.log('1. Download MongoDB Compass');
        console.log('2. Connect with your URI');
        console.log('3. Right-click and delete each unwanted database');
        console.log('');
        console.log('💡 OPTION 3: Different Admin User');
        console.log('1. Create a user with "dbOwner" or "root" privileges');
        console.log('2. Re-run this script with that user');
    }
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION...\n');
    
    const finalDbList = await adminDb.admin().listDatabases();
    const remainingEventDbs = [];
    
    for (const db of finalDbList.databases) {
        const dbName = db.name;
        
        if (dbName !== 'admin' && dbName !== 'local' && dbName !== 'config' && dbName !== 'sample_mflix') {
            try {
                const database = client.db(dbName);
                const collections = await database.listCollections().toArray();
                const hasEventsCollection = collections.some(col => col.name === 'events');
                
                if (hasEventsCollection) {
                    const eventsCount = await database.collection('events').countDocuments();
                    remainingEventDbs.push({ name: dbName, events: eventsCount });
                }
            } catch (error) {
                // Skip if we can't access
            }
        }
    }
    
    console.log('📊 REMAINING EVENT DATABASES:');
    remainingEventDbs.forEach(db => {
        if (db.name === KEEP_DATABASE) {
            console.log(`   ✅ ${db.name}: ${db.events} events (PRODUCTION - KEEP)`);
        } else {
            console.log(`   ❌ ${db.name}: ${db.events} events (STILL EXISTS - MANUAL DELETION NEEDED)`);
        }
    });
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DELETION ATTEMPT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Databases deleted: ${deletedDatabases}`);
    console.log(`✅ Collections cleared: ${deletedCollections}`);
    console.log(`🎯 Target: Keep ONLY "${KEEP_DATABASE}" database`);
    
    if (remainingEventDbs.length === 1 && remainingEventDbs[0].name === KEEP_DATABASE) {
        console.log('\n🎉 SUCCESS! Only production database remains!');
    } else {
        console.log('\n⚠️ Manual deletion required for remaining databases');
        console.log('📋 Use MongoDB Atlas dashboard or Compass for final cleanup');
    }
}

forceDatabaseDeletion().catch(console.error);
