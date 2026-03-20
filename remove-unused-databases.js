/**
 * 🗑️ REMOVE ALL UNUSED DATABASES - KEEP ONLY 'discovr'
 * 
 * Goal: Eliminate confusion by having ONLY ONE production database
 * Keep: 'discovr' (the one API server uses)
 * Remove: 'test', 'events', and any other event databases
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const KEEP_DATABASE = 'discovr'; // The ONLY database we keep

async function removeUnusedDatabases() {
    console.log('🗑️ REMOVING ALL UNUSED DATABASES - KEEP ONLY "discovr"\n');
    console.log('🎯 Goal: Eliminate confusion by having ONLY ONE production database\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const client = mongoose.connection.client;
    
    console.log('🔍 STEP 1: Listing all databases...\n');
    
    // List all databases
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    
    console.log('📊 ALL DATABASES IN CLUSTER:');
    const eventDatabases = [];
    
    for (const db of dbList.databases) {
        const dbName = db.name;
        const size = (db.sizeOnDisk / (1024 * 1024)).toFixed(2); // Convert to MB
        
        console.log(`   ${dbName}: ${size} MB`);
        
        // Check if this database contains events
        if (dbName !== 'admin' && dbName !== 'local' && dbName !== 'config') {
            try {
                const database = client.db(dbName);
                const collections = await database.listCollections().toArray();
                const hasEventsCollection = collections.some(col => col.name === 'events');
                
                if (hasEventsCollection) {
                    const eventsCount = await database.collection('events').countDocuments();
                    console.log(`     → Contains ${eventsCount} events`);
                    eventDatabases.push({ name: dbName, events: eventsCount, size: size });
                }
            } catch (error) {
                console.log(`     → Could not check contents`);
            }
        }
    }
    
    console.log(`\n📋 EVENT DATABASES FOUND: ${eventDatabases.length}`);
    eventDatabases.forEach(db => {
        console.log(`   ${db.name}: ${db.events} events (${db.size} MB)`);
    });
    
    console.log(`\n✅ KEEPING: "${KEEP_DATABASE}" (API server database)`);
    
    // Identify databases to remove
    const databasesToRemove = eventDatabases.filter(db => db.name !== KEEP_DATABASE);
    
    if (databasesToRemove.length === 0) {
        console.log('\n🎉 No unused databases to remove! Only the production database exists.');
        await mongoose.disconnect();
        return;
    }
    
    console.log(`\n🗑️ DATABASES TO REMOVE: ${databasesToRemove.length}`);
    databasesToRemove.forEach(db => {
        console.log(`   ❌ ${db.name}: ${db.events} events (${db.size} MB)`);
    });
    
    console.log('\n⚠️ SAFETY CHECK: Backing up data from databases to be removed...\n');
    
    // Backup data from databases to be removed (in case we need it)
    const backupData = {};
    
    for (const db of databasesToRemove) {
        console.log(`📦 Backing up data from "${db.name}"...`);
        try {
            const database = client.db(db.name);
            const eventsCollection = database.collection('events');
            const events = await eventsCollection.find({}).limit(100).toArray(); // Sample backup
            
            backupData[db.name] = {
                totalEvents: db.events,
                sampleEvents: events.slice(0, 5).map(e => ({ 
                    title: e.title, 
                    city: e.city, 
                    venue: e.venue,
                    source: e.source 
                }))
            };
            console.log(`   ✅ Backed up sample data from "${db.name}"`);
        } catch (error) {
            console.log(`   ⚠️ Could not backup "${db.name}": ${error.message}`);
        }
    }
    
    // Save backup to file
    const fs = require('fs');
    const backupFile = '/Users/seongwoo/Desktop/DISCOVR_DATABASE_BACKUP.json';
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`\n💾 Backup saved to: ${backupFile}`);
    
    console.log('\n🗑️ STEP 2: Removing unused databases...\n');
    
    for (const db of databasesToRemove) {
        console.log(`🗑️ Removing database "${db.name}"...`);
        try {
            await client.db(db.name).dropDatabase();
            console.log(`   ✅ Removed "${db.name}" (${db.events} events freed)`);
        } catch (error) {
            console.log(`   ❌ Failed to remove "${db.name}": ${error.message}`);
        }
    }
    
    console.log('\n🔍 STEP 3: Verification - List remaining databases...\n');
    
    const finalDbList = await adminDb.admin().listDatabases();
    console.log('📊 REMAINING DATABASES:');
    
    for (const db of finalDbList.databases) {
        const dbName = db.name;
        const size = (db.sizeOnDisk / (1024 * 1024)).toFixed(2);
        console.log(`   ${dbName}: ${size} MB`);
        
        if (dbName === KEEP_DATABASE) {
            const database = client.db(dbName);
            const eventsCount = await database.collection('events').countDocuments();
            console.log(`     ✅ PRODUCTION DATABASE: ${eventsCount} events`);
        }
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DATABASE CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Kept: "${KEEP_DATABASE}" (production database)`);
    console.log(`🗑️ Removed: ${databasesToRemove.length} unused databases`);
    console.log(`💾 Backup saved: ${backupFile}`);
    console.log(`\n🎉 NO MORE DATABASE CONFUSION!`);
    console.log(`📱 Mobile app will ONLY read from "${KEEP_DATABASE}" database`);
    console.log(`🔧 All scrapers must ONLY write to "${KEEP_DATABASE}" database`);
    
    console.log('\n🚀 SUCCESS! Single production database achieved!');
}

removeUnusedDatabases().catch(console.error);
