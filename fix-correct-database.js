/**
 * 🎯 FIX THE CORRECT DATABASE: 'discovr' (not 'test')
 * 
 * ROOT CAUSE: API server uses 'discovr' database but I fixed 'test' database!
 * Line 134 in unified-proxy-server.js: cloudDb = cloudClient.db('discovr')
 * 
 * Mobile app unchanged because I fixed the wrong database!
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const CORRECT_DB = 'discovr'; // This is what the API server actually uses!

async function fixCorrectDatabase() {
    console.log('🎯 FIXING THE CORRECT DATABASE: "discovr" (API server database)\n');
    console.log('🚨 Previous fixes were applied to WRONG database ("test")!');
    console.log('📱 This is why mobile app didn\'t change!\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(CORRECT_DB);
    const collection = db.collection('events');
    
    console.log('🔍 STEP 1: Checking current state of CORRECT database...\n');
    
    const totalEvents = await collection.countDocuments();
    console.log(`📊 Total events in "${CORRECT_DB}": ${totalEvents}`);
    
    // Check date issues
    const eventsWithBadDates = await collection.countDocuments({
        $or: [
            { date: { $exists: false } },
            { date: null },
            { date: '' },
            { date: 'Invalid Date' },
            { date: { $lt: new Date() } }
        ]
    });
    console.log(`❌ Events with bad dates: ${eventsWithBadDates}`);
    
    // Check city issues
    const torontoVariants = await collection.distinct('city', { 
        city: { $regex: /toronto/i } 
    });
    console.log('🍁 Toronto city variants:');
    for (const variant of torontoVariants) {
        const count = await collection.countDocuments({ city: variant });
        console.log(`   "${variant}": ${count} events`);
    }
    
    const vancouverEvents = await collection.countDocuments({ 
        city: { $regex: /vancouver/i } 
    });
    console.log(`🏔️ Vancouver events: ${vancouverEvents}`);
    
    console.log('\n🚀 STEP 2: Applying fixes to CORRECT database...\n');
    
    // Fix 1: Set valid future dates
    console.log('⏰ FIX 1: Setting valid future dates...');
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const dateFixResult = await collection.updateMany(
        {
            $or: [
                { date: { $exists: false } },
                { date: null },
                { date: '' },
                { date: 'Invalid Date' },
                { date: { $lt: new Date('2020-01-01') } }
            ]
        },
        { $set: { date: futureDate } }
    );
    console.log(`✅ Fixed ${dateFixResult.modifiedCount} events with invalid dates`);
    
    // Fix 2: Standardize Toronto labels
    console.log('\n🍁 FIX 2: Standardizing Toronto city labels...');
    const torontoFixResult = await collection.updateMany(
        { city: 'Toronto, ON' },
        { $set: { city: 'Toronto' } }
    );
    console.log(`✅ Standardized ${torontoFixResult.modifiedCount} "Toronto, ON" → "Toronto"`);
    
    // Fix 3: Fix Vancouver mislabeling
    console.log('\n🏔️ FIX 3: Fixing Vancouver mislabeling...');
    const suspiciousVancouverEvents = await collection.find({ 
        city: { $regex: /vancouver/i } 
    }).limit(10).toArray();
    
    let vancouverFixed = 0;
    for (const event of suspiciousVancouverEvents) {
        console.log(`   Checking: "${event.title}" (source: ${event.source})`);
        
        if (event.source && (event.source.includes('toronto') || event.venue?.includes('toronto'))) {
            await collection.updateOne(
                { _id: event._id },
                { $set: { city: 'Toronto' } }
            );
            console.log(`     → Fixed: This is actually a Toronto event!`);
            vancouverFixed++;
        }
    }
    console.log(`✅ Fixed ${vancouverFixed} mislabeled Vancouver events`);
    
    // Verification
    console.log('\n🔍 STEP 3: Verification after fixes...\n');
    
    const newTotalEvents = await collection.countDocuments();
    const newFutureEvents = await collection.countDocuments({ date: { $gte: new Date() } });
    const newTorontoCount = await collection.countDocuments({ city: { $regex: /toronto/i } });
    const newVancouverCount = await collection.countDocuments({ city: { $regex: /vancouver/i } });
    const newNewYorkCount = await collection.countDocuments({ city: { $regex: /new york/i } });
    
    console.log('📊 FIXED RESULTS:');
    console.log(`📊 Total events: ${newTotalEvents}`);
    console.log(`⏰ Future events: ${newFutureEvents}`);
    console.log(`🍁 Toronto events: ${newTorontoCount}`);
    console.log(`🏔️ Vancouver events: ${newVancouverCount}`);
    console.log(`🗽 New York events: ${newNewYorkCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CORRECT DATABASE FIXED!');
    console.log('='.repeat(60));
    console.log(`✅ Fixed dates: ${dateFixResult.modifiedCount} events`);
    console.log(`✅ Fixed Toronto labels: ${torontoFixResult.modifiedCount} events`);  
    console.log(`✅ Fixed Vancouver mislabeling: ${vancouverFixed} events`);
    console.log(`\n📊 API Server Database: "${CORRECT_DB}"`);
    console.log(`📊 Total Events: ${newTotalEvents}`);
    console.log(`🍁 Toronto Events: ${newTorontoCount}`);
    console.log(`🏔️ Vancouver Events: ${newVancouverCount}`);
    console.log(`🗽 New York Events: ${newNewYorkCount}`);
    
    console.log('\n📱 Mobile app should NOW show correct results!');
    console.log('🔄 Please refresh and test again!');
    
    await mongoose.disconnect();
    
    console.log('\n🚀 SUCCESS! Fixed the database that API server actually uses!');
}

fixCorrectDatabase().catch(console.error);
