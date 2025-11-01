/**
 * DATABASE CLEANUP SCRIPT
 * Clean up old/bad data before running master scrapers with enhanced filtering
 */

const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function cleanupDatabase() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('🗄️ CONNECTED TO DATABASE');
        console.log('=========================\n');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Get initial statistics
        const totalEvents = await collection.countDocuments({});
        console.log(`📊 Initial event count: ${totalEvents}`);
        
        // 1. Remove events with bad venue format (objects instead of strings)
        console.log('\n🧹 CLEANING BAD VENUE FORMATS...');
        const badVenueResult = await collection.deleteMany({
            venue: { $type: "object" }
        });
        console.log(`✅ Removed ${badVenueResult.deletedCount} events with object venues`);
        
        // 2. Remove events older than 1 year
        console.log('\n📅 REMOVING OLD EVENTS...');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const oldEventsResult = await collection.deleteMany({
            $or: [
                { startDate: { $lt: oneYearAgo } },
                { date: { $lt: oneYearAgo } }
            ]
        });
        console.log(`✅ Removed ${oldEventsResult.deletedCount} events older than ${oneYearAgo.toDateString()}`);
        
        // 3. Remove events with invalid/empty titles
        console.log('\n🔤 REMOVING INVALID TITLES...');
        const invalidTitleResult = await collection.deleteMany({
            $or: [
                { title: { $exists: false } },
                { title: null },
                { title: "" },
                { title: /^[\s]*$/ },  // Only whitespace
                { title: /^(home|about|contact|subscribe|buy tickets?)$/i }
            ]
        });
        console.log(`✅ Removed ${invalidTitleResult.deletedCount} events with invalid titles`);
        
        // 4. Remove duplicate events (same title + venue combination)
        console.log('\n🔍 REMOVING DUPLICATES...');
        const pipeline = [
            {
                $group: {
                    _id: { title: "$title", venue: "$venue" },
                    count: { $sum: 1 },
                    docs: { $push: "$_id" }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ];
        
        const duplicates = await collection.aggregate(pipeline).toArray();
        let duplicatesRemoved = 0;
        
        for (const dup of duplicates) {
            // Keep the first document, remove the rest
            const toRemove = dup.docs.slice(1);
            const result = await collection.deleteMany({
                _id: { $in: toRemove }
            });
            duplicatesRemoved += result.deletedCount;
        }
        console.log(`✅ Removed ${duplicatesRemoved} duplicate events`);
        
        // 5. Clean up events with CSS/technical junk in titles
        console.log('\n💻 REMOVING CSS/TECHNICAL JUNK...');
        const techJunkResult = await collection.deleteMany({
            title: {
                $regex: /(\\.css-|fill:|#[0-9a-f]{3,6}|\.st0|width:|height:|font-size:|color:|inherit)/i
            }
        });
        console.log(`✅ Removed ${techJunkResult.deletedCount} events with CSS/technical junk`);
        
        // Get final statistics
        const finalEvents = await collection.countDocuments({});
        const totalCleaned = totalEvents - finalEvents;
        
        console.log('\n📊 CLEANUP SUMMARY:');
        console.log('==================');
        console.log(`🗑️ Total events removed: ${totalCleaned}`);
        console.log(`📈 Events remaining: ${finalEvents}`);
        console.log(`🧹 Database cleanup: ${Math.round((totalCleaned/totalEvents)*100)}% improvement`);
        
        // Show remaining events by city
        console.log('\n🏙️ EVENTS BY CITY (after cleanup):');
        const cityCounts = await collection.aggregate([
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        cityCounts.forEach(city => {
            console.log(`   ${city._id || 'Unknown'}: ${city.count} events`);
        });
        
        console.log('\n✅ DATABASE CLEANUP COMPLETE');
        console.log('🚀 Ready for master scraper runs with enhanced filtering!');
        
    } catch (error) {
        console.error('❌ Database cleanup error:', error.message);
    } finally {
        await client.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run cleanup
cleanupDatabase().catch(console.error);
