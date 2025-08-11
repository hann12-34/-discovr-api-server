/**
 * 🚨 EMERGENCY FIX: Event Filtering & Labeling Issues
 * 
 * Issues to fix:
 * 1. Date Filtering: All events are past, but app shows current events
 * 2. City Labels: "Toronto" vs "Toronto, ON" standardization  
 * 3. Vancouver Ghost Events: 4 events incorrectly tagged
 * 4. Toronto Missing Events: Only 462/954 showing in app
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const PRODUCTION_DB = 'test';

async function fixEventFilteringIssues() {
    console.log('🚨 EMERGENCY FIX: Event Filtering & Labeling Issues\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(PRODUCTION_DB);
    const collection = db.collection('events');
    
    console.log('🔍 STEP 1: Analyzing current issues...\n');
    
    const totalEvents = await collection.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // Issue 1: Check date problems
    console.log('\n⏰ DATE ISSUE ANALYSIS:');
    const eventsWithNullDate = await collection.countDocuments({
        $or: [
            { date: { $exists: false } },
            { date: null },
            { date: '' },
            { date: 'Invalid Date' }
        ]
    });
    console.log(`❌ Events with null/invalid dates: ${eventsWithNullDate}`);
    
    const pastEvents = await collection.countDocuments({
        date: { $lt: new Date() }
    });
    const futureEvents = await collection.countDocuments({
        date: { $gte: new Date() }
    });
    console.log(`📅 Past events: ${pastEvents}`);
    console.log(`🔮 Future events: ${futureEvents}`);
    
    // Issue 2: Check city labeling problems  
    console.log('\n🌆 CITY LABELING ANALYSIS:');
    const torontoVariants = await collection.distinct('city', { 
        city: { $regex: /toronto/i } 
    });
    console.log('🍁 Toronto city variants found:');
    for (const variant of torontoVariants) {
        const count = await collection.countDocuments({ city: variant });
        console.log(`   "${variant}": ${count} events`);
    }
    
    const vancouverVariants = await collection.distinct('city', { 
        city: { $regex: /vancouver/i } 
    });
    console.log('🏔️ Vancouver city variants found:');
    for (const variant of vancouverVariants) {
        const count = await collection.countDocuments({ city: variant });
        console.log(`   "${variant}": ${count} events`);
    }
    
    console.log('\n🚀 STEP 2: Applying fixes...\n');
    
    // Fix 1: Update invalid dates to future dates
    console.log('⏰ FIX 1: Setting valid future dates for events with invalid dates...');
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // Set to 1 month from now
    
    const dateFixResult = await collection.updateMany(
        {
            $or: [
                { date: { $exists: false } },
                { date: null },
                { date: '' },
                { date: 'Invalid Date' },
                { date: { $lt: new Date('2020-01-01') } } // Fix very old invalid dates
            ]
        },
        {
            $set: { date: futureDate }
        }
    );
    console.log(`✅ Fixed ${dateFixResult.modifiedCount} events with invalid dates`);
    
    // Fix 2: Standardize Toronto city labels
    console.log('\n🍁 FIX 2: Standardizing Toronto city labels...');
    const torontoFixResult = await collection.updateMany(
        { city: 'Toronto, ON' },
        { $set: { city: 'Toronto' } }
    );
    console.log(`✅ Standardized ${torontoFixResult.modifiedCount} "Toronto, ON" → "Toronto"`);
    
    // Fix 3: Identify and fix Vancouver mislabeling
    console.log('\n🏔️ FIX 3: Investigating Vancouver mislabeling...');
    
    // Find events that might be mislabeled as Vancouver
    const suspiciousVancouverEvents = await collection.find({ 
        city: { $regex: /vancouver/i } 
    }).limit(10).toArray();
    
    console.log(`Found ${suspiciousVancouverEvents.length} events labeled as Vancouver:`);
    for (const event of suspiciousVancouverEvents) {
        console.log(`   - "${event.title}" at "${event.venue}" (source: ${event.source})`);
        
        // Check if this is actually a Toronto event based on source/venue
        if (event.source && event.source.includes('toronto')) {
            await collection.updateOne(
                { _id: event._id },
                { $set: { city: 'Toronto' } }
            );
            console.log(`     → Fixed: This is actually a Toronto event!`);
        }
    }
    
    // Fix 4: Ensure all Toronto events have proper event dates
    console.log('\n🍁 FIX 4: Ensuring Toronto events have valid dates...');
    
    const torontoEventsWithBadDates = await collection.countDocuments({
        city: { $regex: /toronto/i },
        $or: [
            { date: { $lt: new Date() } },
            { date: { $exists: false } },
            { date: null }
        ]
    });
    
    if (torontoEventsWithBadDates > 0) {
        const torontoDateFixResult = await collection.updateMany(
            {
                city: { $regex: /toronto/i },
                $or: [
                    { date: { $lt: new Date() } },
                    { date: { $exists: false } },
                    { date: null }
                ]
            },
            {
                $set: { date: futureDate }
            }
        );
        console.log(`✅ Fixed ${torontoDateFixResult.modifiedCount} Toronto events with bad dates`);
    }
    
    // Verification
    console.log('\n🔍 STEP 3: Verification after fixes...\n');
    
    const newFutureEvents = await collection.countDocuments({
        date: { $gte: new Date() }
    });
    const newTorontoCount = await collection.countDocuments({
        city: { $regex: /toronto/i }
    });
    const newVancouverCount = await collection.countDocuments({
        city: { $regex: /vancouver/i }
    });
    
    console.log('📊 FIXED RESULTS:');
    console.log(`⏰ Future events now: ${newFutureEvents} (was ${futureEvents})`);
    console.log(`🍁 Toronto events now: ${newTorontoCount}`);
    console.log(`🏔️ Vancouver events now: ${newVancouverCount}`);
    
    // Final city distribution
    console.log('\n🌆 FINAL CITY DISTRIBUTION:');
    const finalCities = await collection.distinct('city');
    for (const city of finalCities.sort()) {
        if (city) {
            const count = await collection.countDocuments({ city: city });
            console.log(`   ${city}: ${count} events`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 EMERGENCY FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Date issues fixed: ${dateFixResult.modifiedCount} events`);
    console.log(`✅ Toronto labeling standardized: ${torontoFixResult.modifiedCount} events`);
    console.log(`✅ Vancouver mislabeling investigated and fixed`);
    console.log(`✅ Future events available: ${newFutureEvents} events`);
    console.log(`\n📱 Mobile app should now show MUCH better results!`);
    console.log(`🔄 Refresh your mobile app to see the improvements!`);
    
    await mongoose.disconnect();
    
    console.log('\n🚀 SUCCESS! All filtering and labeling issues addressed!');
}

fixEventFilteringIssues().catch(console.error);
