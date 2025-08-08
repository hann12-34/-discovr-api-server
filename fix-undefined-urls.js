const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function fixUndefinedUrls() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('discovr');
    
    console.log('🔧 FIXING INVALID URL VALUES TO RESTORE VIEW BUTTONS...');
    
    // Find events with invalid URL values
    const eventsWithInvalidUrls = await db.collection('events').find({
        $or: [
            { sourceUrl: "undefined" },
            { sourceUrl: "null" },
            { sourceUrl: "" },
            { source_url: "undefined" },
            { source_url: "null" },
            { source_url: "" }
        ]
    }).toArray();
    
    console.log(`📊 Found ${eventsWithInvalidUrls.length} events with invalid URL values`);
    
    if (eventsWithInvalidUrls.length === 0) {
        console.log('✅ No invalid URLs found to fix!');
        await client.close();
        return;
    }
    
    // Show examples before fixing
    console.log('\n📋 EXAMPLES OF INVALID URLs TO FIX:');
    eventsWithInvalidUrls.slice(0, 5).forEach((event, i) => {
        console.log(`${i+1}. ${event.title || event.name}`);
        console.log(`   sourceUrl: "${event.sourceUrl}"`);
        console.log(`   source_url: "${event.source_url}"`);
    });
    
    // Fix sourceUrl field - set invalid values to null
    const result1 = await db.collection('events').updateMany(
        {
            $or: [
                { sourceUrl: "undefined" },
                { sourceUrl: "null" },
                { sourceUrl: "" }
            ]
        },
        {
            $unset: { sourceUrl: "" }
        }
    );
    
    // Fix source_url field - set invalid values to null
    const result2 = await db.collection('events').updateMany(
        {
            $or: [
                { source_url: "undefined" },
                { source_url: "null" },
                { source_url: "" }
            ]
        },
        {
            $unset: { source_url: "" }
        }
    );
    
    console.log(`\n✅ FIXED INVALID URLS:`);
    console.log(`   - Fixed ${result1.modifiedCount} events with invalid sourceUrl`);
    console.log(`   - Fixed ${result2.modifiedCount} events with invalid source_url`);
    console.log(`\n🎯 All View buttons should now appear correctly in the admin interface!`);
    
    await client.close();
}

fixUndefinedUrls().catch(console.error);
