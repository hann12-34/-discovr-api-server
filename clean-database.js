/**
 * Clean database of incorrect Vancouver addresses and "Learn More" events
 * This script removes bad data from the database
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanDatabase() {
    console.log('🧹 Cleaning database of incorrect Vancouver addresses and "Learn More" events...\n');
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ No MONGODB_URI found in environment variables');
        return;
    }

    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db();
        const eventsCollection = db.collection('events');
        
        // Count events before cleaning
        const totalBefore = await eventsCollection.countDocuments();
        console.log(`📊 Total events before cleaning: ${totalBefore}`);
        
        // Delete events with Vancouver addresses
        const vancouverResult = await eventsCollection.deleteMany({
            $or: [
                { 'venue.address': { $regex: /vancouver/i } },
                { 'venue.address': { $regex: /\bbc\b/i } },
                { 'venue.city': { $regex: /vancouver/i } },
                { 'venue.address': { $regex: /downtown vancouver/i } }
            ]
        });
        
        console.log(`🗑️  Deleted ${vancouverResult.deletedCount} events with Vancouver addresses`);
        
        // Delete "Learn More" events
        const learnMoreResult = await eventsCollection.deleteMany({
            $or: [
                { 'name': { $regex: /^learn more$/i } },
                { 'title': { $regex: /^learn more$/i } }
            ]
        });
        
        console.log(`🗑️  Deleted ${learnMoreResult.deletedCount} "Learn More" events`);
        
        // Delete events with no source (likely bad data)
        const noSourceResult = await eventsCollection.deleteMany({
            $or: [
                { 'source': { $exists: false } },
                { 'source': null },
                { 'source': '' }
            ]
        });
        
        console.log(`🗑️  Deleted ${noSourceResult.deletedCount} events with no source`);
        
        // Count events after cleaning
        const totalAfter = await eventsCollection.countDocuments();
        console.log(`📊 Total events after cleaning: ${totalAfter}`);
        
        console.log(`✅ Database cleaned! Removed ${totalBefore - totalAfter} total events`);
        
        // Show remaining events by source
        const eventsBySource = await eventsCollection.aggregate([
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        console.log('\n📊 Remaining events by source:');
        eventsBySource.forEach(source => {
            console.log(`  ${source._id || 'No source'}: ${source.count} events`);
        });
        
    } catch (error) {
        console.error('❌ Error cleaning database:', error.message);
    } finally {
        await client.close();
    }
}

cleanDatabase();
