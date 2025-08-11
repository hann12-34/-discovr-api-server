/**
 * CRITICAL DEBUG: Toronto Events Structure Analysis
 * 
 * Investigates the exact structure of imported Toronto events
 * and compares to what mobile app Swift filtering expects.
 * 
 * Mobile app has 316 events but finds 0 Toronto events - major incompatibility!
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority";

// Event model
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  venue: mongoose.Schema.Types.Mixed,
  location: String,
  city: String,
  date: String,
  category: String,
  description: String,
  link: String,
  source: String
}, { 
  collection: 'events',
  timestamps: true 
});

const Event = mongoose.model('Event', eventSchema);

async function debugTorontoEventsStructure() {
    console.log('\n🔍 CRITICAL DEBUG: TORONTO EVENTS STRUCTURE');
    console.log('='.repeat(60));
    console.log('🎯 Goal: Find why mobile app can\'t find our 6 Toronto events');
    
    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        // Get all Toronto events
        const torontoEvents = await Event.find({ city: 'Toronto' }).lean();
        console.log(`📊 Found ${torontoEvents.length} Toronto events in database`);
        
        if (torontoEvents.length === 0) {
            console.log('❌ No Toronto events found! Import failed.');
            return;
        }
        
        // Analyze each Toronto event structure
        console.log('\n📋 DETAILED TORONTO EVENT ANALYSIS:');
        torontoEvents.forEach((event, index) => {
            console.log(`\n📝 Toronto Event ${index + 1}:`);
            console.log(`   📖 Title: "${event.title}"`);
            console.log(`   🏙️ City field: "${event.city}"`);
            console.log(`   📍 Location field: "${event.location}"`);
            console.log(`   🏢 Venue field: ${JSON.stringify(event.venue, null, 2)}`);
            console.log(`   📅 Date: "${event.date}"`);
            console.log(`   🔗 Source: "${event.source}"`);
            console.log(`   🆔 ID: "${event.id}"`);
            
            // Check all text fields for Toronto-related terms
            const allText = [
                event.title,
                event.city,
                event.location,
                event.source,
                event.description,
                JSON.stringify(event.venue)
            ].join(' ').toLowerCase();
            
            console.log(`   🔍 Contains "toronto": ${allText.includes('toronto')}`);
            console.log(`   🔍 Contains "on": ${allText.includes('on')}`);
            console.log(`   🔍 Contains "ontario": ${allText.includes('ontario')}`);
            console.log(`   🔍 All text: "${allText.substring(0, 200)}..."`);
        });
        
        // Test mobile app filtering logic patterns
        console.log('\n🧪 TESTING MOBILE APP FILTERING PATTERNS:');
        
        // Based on DISCOVR_CITY_FILTERING_FIX_README.md, mobile app uses allTextFields
        for (const event of torontoEvents) {
            console.log(`\n🔬 Testing event: "${event.title}"`);
            
            // Simulate mobile app's allTextFields construction
            const allTextFields = [
                event.title,
                event.city,
                event.location,
                event.description,
                event.source,
                event.venue?.name,
                event.venue?.address,
                event.venue?.city
            ].filter(Boolean).join(' ').toLowerCase();
            
            console.log(`   📝 allTextFields: "${allTextFields}"`);
            
            // Test Toronto filtering patterns from Swift code
            const hasTorontoTerms = allTextFields.includes('toronto') || 
                                  allTextFields.includes('ontario') ||
                                  allTextFields.includes(' on ') ||
                                  allTextFields.includes('toronto');
                                  
            const hasExclusionTerms = allTextFields.includes('vancouver') || 
                                    allTextFields.includes('calgary') || 
                                    allTextFields.includes('montreal') || 
                                    allTextFields.includes('ottawa') ||
                                    allTextFields.includes('new york') || 
                                    allTextFields.includes('ny') ||
                                    allTextFields.includes('nyc') || 
                                    allTextFields.includes('manhattan');
            
            console.log(`   ✅ Has Toronto terms: ${hasTorontoTerms}`);
            console.log(`   ❌ Has exclusion terms: ${hasExclusionTerms}`);
            console.log(`   🎯 Would pass Toronto filter: ${hasTorontoTerms && !hasExclusionTerms}`);
        }
        
        // Compare with New York events structure
        console.log('\n🗽 COMPARING WITH NEW YORK EVENTS:');
        const nyEvents = await Event.find({ city: 'New York' }).limit(2).lean();
        
        nyEvents.forEach((event, index) => {
            console.log(`\n📝 NY Event ${index + 1} for comparison:`);
            console.log(`   📖 Title: "${event.title}"`);
            console.log(`   🏙️ City field: "${event.city}"`);
            console.log(`   📍 Location field: "${event.location}"`);
            console.log(`   🏢 Venue: ${JSON.stringify(event.venue)}`);
        });
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run debug
debugTorontoEventsStructure()
    .then(() => {
        console.log('\n📊 TORONTO EVENTS STRUCTURE DEBUG COMPLETE!');
        console.log('🔍 Check results above to identify mobile app compatibility issues');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Debug failed:', error.message);
        process.exit(1);
    });
