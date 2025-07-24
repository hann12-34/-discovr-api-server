require('dotenv').config();
const mongoose = require('mongoose');

async function debugEvent335() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all events to find the 335th one
        const events = await mongoose.connection.db.collection('events').find({}).toArray();
        
        console.log(`Total events found: ${events.length}`);
        
        if (events.length >= 336) {
            const event335 = events[335]; // 0-indexed, so 335 is the 336th event
            console.log('\n=== EVENT AT INDEX 335 ===');
            console.log('ID:', event335._id);
            console.log('Title:', event335.title);
            console.log('Venue structure:');
            console.log(JSON.stringify(event335.venue, null, 2));
            
            if (event335.venue && event335.venue.location) {
                console.log('\nLocation field type:', typeof event335.venue.location);
                console.log('Location value:', event335.venue.location);
            } else {
                console.log('\nNo venue.location field found');
            }

            // Check a few events around 335 too
            console.log('\n=== CHECKING EVENTS 333-337 ===');
            for (let i = 333; i <= 337 && i < events.length; i++) {
                const event = events[i];
                console.log(`\nEvent ${i}:`);
                console.log('Title:', event.title);
                if (event.venue && event.venue.location) {
                    console.log('venue.location type:', typeof event.venue.location);
                    console.log('venue.location value:', JSON.stringify(event.venue.location, null, 2));
                } else {
                    console.log('No venue.location field');
                }
            }
        } else {
            console.log('Not enough events to check index 335');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugEvent335();
