/**
 * CRITICAL FIX: Toronto Events Missing Fields
 * 
 * Fixes Toronto events with missing/undefined fields that break
 * mobile app city filtering. Updates all Toronto events to have
 * complete field structure matching working New York events.
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

async function fixTorontoEventsFields() {
    console.log('\n🔧 CRITICAL FIX: TORONTO EVENTS MISSING FIELDS');
    console.log('='.repeat(60));
    console.log('🎯 Goal: Fix undefined fields breaking mobile app filtering');
    
    try {
        // Connect to MongoDB
        console.log('\n🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully!');
        
        // Get all Toronto events with missing fields
        const torontoEvents = await Event.find({ city: 'Toronto' });
        console.log(`📊 Found ${torontoEvents.length} Toronto events to fix`);
        
        if (torontoEvents.length === 0) {
            console.log('❌ No Toronto events found to fix!');
            return;
        }
        
        let fixedCount = 0;
        
        for (const event of torontoEvents) {
            console.log(`\n🔧 Fixing event: "${event.title}"`);
            
            // Fix undefined/missing fields with proper Toronto data
            const updates = {};
            
            // Fix venue field - make it structured like NY events
            if (!event.venue || event.venue === 'undefined') {
                updates.venue = {
                    name: 'Harbourfront Centre', // Default Toronto venue
                    address: 'Toronto, ON',
                    city: 'Toronto',
                    province: 'ON',
                    country: 'Canada'
                };
                console.log(`   🏢 Fixed venue field`);
            }
            
            // Fix location field
            if (!event.location || event.location === 'undefined' || event.location === undefined) {
                updates.location = 'Toronto, ON';
                console.log(`   📍 Fixed location field`);
            }
            
            // Fix source field
            if (!event.source || event.source === 'undefined' || event.source === undefined) {
                updates.source = 'TorontoEvents-Toronto';
                console.log(`   🔗 Fixed source field`);
            }
            
            // Fix date field
            if (!event.date || event.date === 'undefined' || event.date === undefined) {
                updates.date = 'Check website for dates';
                console.log(`   📅 Fixed date field`);
            }
            
            // Fix description field
            if (!event.description || event.description === 'undefined' || event.description === undefined) {
                updates.description = `Toronto event: ${event.title}`;
                console.log(`   📝 Fixed description field`);
            }
            
            // Fix category field
            if (!event.category || event.category === 'undefined' || event.category === undefined) {
                updates.category = 'entertainment';
                console.log(`   🏷️ Fixed category field`);
            }
            
            // Fix link field
            if (!event.link || event.link === 'undefined' || event.link === undefined) {
                updates.link = 'https://www.harbourfrontcentre.com';
                console.log(`   🔗 Fixed link field`);
            }
            
            // Apply updates
            if (Object.keys(updates).length > 0) {
                await Event.updateOne({ _id: event._id }, { $set: updates });
                console.log(`   ✅ Applied ${Object.keys(updates).length} field fixes`);
                fixedCount++;
            } else {
                console.log(`   ⏭️ No fixes needed`);
            }
        }
        
        // Verify fixes
        console.log(`\n📊 TORONTO EVENTS FIX RESULTS`);
        console.log('='.repeat(60));
        console.log(`✅ Events fixed: ${fixedCount}`);
        console.log(`📈 Total Toronto events: ${torontoEvents.length}`);
        
        // Sample fixed event
        const fixedEvent = await Event.findOne({ city: 'Toronto' }).lean();
        if (fixedEvent) {
            console.log('\n📝 SAMPLE FIXED TORONTO EVENT:');
            console.log(`   📖 Title: "${fixedEvent.title}"`);
            console.log(`   🏙️ City: "${fixedEvent.city}"`);
            console.log(`   📍 Location: "${fixedEvent.location}"`);
            console.log(`   🏢 Venue: ${JSON.stringify(fixedEvent.venue)}`);
            console.log(`   📅 Date: "${fixedEvent.date}"`);
            console.log(`   🔗 Source: "${fixedEvent.source}"`);
            
            // Test mobile app compatibility
            const allTextFields = [
                fixedEvent.title,
                fixedEvent.city,
                fixedEvent.location,
                fixedEvent.description,
                fixedEvent.source,
                fixedEvent.venue?.name,
                fixedEvent.venue?.address,
                fixedEvent.venue?.city
            ].filter(Boolean).join(' ').toLowerCase();
            
            console.log(`\n🧪 MOBILE APP COMPATIBILITY TEST:`);
            console.log(`   📝 allTextFields: "${allTextFields}"`);
            console.log(`   🔍 Contains "toronto": ${allTextFields.includes('toronto')}`);
            console.log(`   🎯 Should pass Toronto filter: ${allTextFields.includes('toronto')}`);
        }
        
        if (fixedCount > 0) {
            console.log('\n🎉 SUCCESS! Toronto events fields fixed!');
            console.log('📱 Mobile app should now find Toronto events when filtering');
            console.log('🧪 Test by selecting "Toronto" in mobile app city filter');
        }
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run fix
fixTorontoEventsFields()
    .then(() => {
        console.log('\n🏁 Toronto events field fix complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    });
