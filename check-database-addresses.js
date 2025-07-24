/**
 * Check database for Vancouver addresses in Toronto events
 * This script connects to the database and checks stored events
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkDatabaseAddresses() {
    console.log('🔍 Checking database for Vancouver addresses in Toronto events...\n');
    
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
        
        // Check for events with Vancouver addresses
        const vancouverEvents = await eventsCollection.find({
            $or: [
                { 'venue.address': { $regex: /vancouver/i } },
                { 'venue.address': { $regex: /\bbc\b/i } },
                { 'venue.city': { $regex: /vancouver/i } },
                { 'venue.address': { $regex: /downtown vancouver/i } }
            ]
        }).toArray();
        
        console.log(`📊 Found ${vancouverEvents.length} events with Vancouver addresses in database`);
        
        if (vancouverEvents.length > 0) {
            console.log('\n❌ Events with Vancouver addresses:');
            vancouverEvents.forEach((event, index) => {
                console.log(`${index + 1}. ${event.name || event.title}`);
                console.log(`   📍 Address: ${event.venue?.address || 'No address'}`);
                console.log(`   🏢 City: ${event.venue?.city || 'No city'}, ${event.venue?.province || 'No province'}`);
                console.log(`   🔖 Source: ${event.source || 'No source'}`);
                console.log(`   📅 Created: ${event.createdAt || 'No date'}`);
                console.log('');
            });
        }
        
        // Check for "Learn More" events
        const learnMoreEvents = await eventsCollection.find({
            $or: [
                { 'name': { $regex: /learn more/i } },
                { 'title': { $regex: /learn more/i } }
            ]
        }).toArray();
        
        console.log(`📊 Found ${learnMoreEvents.length} "Learn More" events in database`);
        
        if (learnMoreEvents.length > 0) {
            console.log('\n⚠️  "Learn More" events in database:');
            learnMoreEvents.forEach((event, index) => {
                console.log(`${index + 1}. ${event.name || event.title}`);
                console.log(`   🔖 Source: ${event.source || 'No source'}`);
                console.log(`   📅 Created: ${event.createdAt || 'No date'}`);
                console.log('');
            });
        }
        
        // Check recent TodoCanada Toronto events
        const recentTodoEvents = await eventsCollection.find({
            source: 'TodoCanada Toronto Events'
        }).sort({ createdAt: -1 }).limit(5).toArray();
        
        console.log(`📊 Found ${recentTodoEvents.length} recent TodoCanada Toronto events in database`);
        
        if (recentTodoEvents.length > 0) {
            console.log('\n📍 Recent TodoCanada Toronto events:');
            recentTodoEvents.forEach((event, index) => {
                console.log(`${index + 1}. ${event.name || event.title}`);
                console.log(`   📍 Address: ${event.venue?.address || 'No address'}`);
                console.log(`   🏢 City: ${event.venue?.city || 'No city'}, ${event.venue?.province || 'No province'}`);
                console.log(`   📅 Created: ${event.createdAt || 'No date'}`);
                console.log('');
            });
        }
        
        console.log('\n🛠️  Database check complete!');
        
    } catch (error) {
        console.error('❌ Error checking database:', error.message);
    } finally {
        await client.close();
    }
}

checkDatabaseAddresses();
