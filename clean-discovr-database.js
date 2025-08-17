/**
 * 🧹 CLEAN DISCOVR DATABASE
 * 
 * Remove ALL events from the "discovr" database for a fresh start.
 * Now that all scrapers target the correct database, we can start clean.
 */

const mongoose = require('mongoose');

async function cleanDiscovrDatabase() {
    console.log('🧹 CLEANING DISCOVR DATABASE\n');
    console.log('🎯 Goal: Remove ALL events for fresh start with fixed scrapers\n');
    
    const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected successfully');
        
        const client = mongoose.connection.client;
        const database = client.db('discovr');
        const eventsCollection = database.collection('events');
        
        console.log('\n📊 BEFORE CLEANUP:');
        const beforeCount = await eventsCollection.countDocuments();
        console.log(`   Total events: ${beforeCount}`);
        
        if (beforeCount > 0) {
            // Sample a few events before deletion
            const samples = await eventsCollection.find({}).limit(3).toArray();
            console.log('   Sample events:');
            samples.forEach((event, i) => {
                console.log(`     ${i+1}. "${event.title}" in ${event.city}`);
            });
        }
        
        console.log('\n🗑️ DELETING ALL EVENTS...');
        
        const deleteResult = await eventsCollection.deleteMany({});
        
        console.log(`✅ Deleted ${deleteResult.deletedCount} events`);
        
        console.log('\n📊 AFTER CLEANUP:');
        const afterCount = await eventsCollection.countDocuments();
        console.log(`   Total events: ${afterCount}`);
        
        if (afterCount === 0) {
            console.log('✅ Database successfully cleaned!');
        } else {
            console.log(`⚠️ Warning: ${afterCount} events remain`);
        }
        
        console.log('\n🔍 VERIFY OTHER COLLECTIONS:');
        const collections = await database.listCollections().toArray();
        console.log('   Collections in "discovr" database:');
        
        for (const collection of collections) {
            const count = await database.collection(collection.name).countDocuments();
            console.log(`     ${collection.name}: ${count} documents`);
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        
        console.log('\n' + '='.repeat(70));
        console.log('🧹 DATABASE CLEANUP COMPLETE!');
        console.log('='.repeat(70));
        console.log('✅ "discovr" database is now clean and ready');
        console.log('🔄 Ready for fresh event import from fixed scrapers');
        console.log('📱 Mobile app will show 0 events until new ones are imported');
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. ✅ Database cleaned');
        console.log('2. 🔄 Run Toronto/NY scrapers to populate fresh events');
        console.log('3. 📱 Verify events appear correctly in mobile app');
        console.log('4. 🎯 Production system fully aligned and clean');
        
    } catch (error) {
        console.error('❌ Error cleaning database:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

cleanDiscovrDatabase();
