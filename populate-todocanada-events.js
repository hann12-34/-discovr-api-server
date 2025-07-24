/**
 * Populate database with TodoCanada Toronto events
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function populateTodoCanadaEvents() {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Define Event schema
    const Event = mongoose.model('Event', {
        name: String,
        title: String,
        description: String,
        startDate: Date,
        endDate: Date,
        venue: {
            name: String,
            address: String,
            city: String,
            province: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        source: String,
        categories: [String],
        createdAt: { type: Date, default: Date.now }
    });
    
    // Clear existing TodoCanada events
    await Event.deleteMany({ source: 'TodoCanada Toronto Events' });
    console.log('🗑️  Cleared existing TodoCanada Toronto events');
    
    // Run TodoCanada scraper
    console.log('🚀 Running TodoCanada Toronto scraper...');
    const scraper = new TodoCanadaTorontoEvents();
    const events = await scraper.fetchEvents();
    
    console.log(`📊 Found ${events.length} events from TodoCanada Toronto`);
    
    // Save events to database
    console.log('💾 Saving events to database...');
    const result = await Event.insertMany(events);
    
    console.log(`✅ Successfully saved ${result.length} events to database`);
    
    // Show sample events
    console.log('\n📍 Sample TodoCanada Toronto events in database:');
    result.slice(0, 3).forEach((event, index) => {
        console.log(`${index + 1}. ${event.name}`);
        console.log(`   📍 ${event.venue.address}`);
        console.log(`   🏢 ${event.venue.city}, ${event.venue.province}`);
        console.log('');
    });
    
    // Final verification - check for any Vancouver addresses
    const vancouverEvents = await Event.find({ 
        'venue.address': { $regex: /vancouver/i } 
    });
    
    console.log('🔍 Checking for Vancouver addresses in database:');
    if (vancouverEvents.length > 0) {
        console.log(`❌ Found ${vancouverEvents.length} events with Vancouver addresses`);
    } else {
        console.log('✅ No Vancouver addresses found - all events have correct locations!');
    }
    
    // Count total events
    const totalEvents = await Event.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    await mongoose.disconnect();
    console.log('✅ Database populated successfully!');
}

populateTodoCanadaEvents().catch(console.error);
