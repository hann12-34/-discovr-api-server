require('dotenv').config();
const mongoose = require('mongoose');

async function checkTopLevelLocations() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all events 
        const events = await mongoose.connection.db.collection('events').find({}).toArray();
        
        console.log(`Total events found: ${events.length}`);
        
        // Check event #335 specifically
        if (events.length >= 336) {
            const event335 = events[335];
            console.log('\n=== EVENT 335 COMPLETE STRUCTURE ===');
            console.log('ID:', event335._id);
            console.log('Title:', event335.title);
            console.log('All top-level fields:', Object.keys(event335));
            
            // Check if there's a top-level location field
            if ('location' in event335) {
                console.log('\nTop-level location field found!');
                console.log('Type:', typeof event335.location);
                console.log('Value:', JSON.stringify(event335.location, null, 2));
            } else {
                console.log('\nNo top-level location field');
            }
            
            // Check venue structure completely
            console.log('\nVenue structure:');
            console.log(JSON.stringify(event335.venue, null, 2));
        }
        
        // Check for any events with top-level location fields
        let topLevelLocationCount = 0;
        let topLevelLocationStrings = 0;
        let topLevelLocationObjects = 0;
        const examples = [];
        
        events.forEach((event, index) => {
            if ('location' in event) {
                topLevelLocationCount++;
                const locationType = typeof event.location;
                if (locationType === 'string') {
                    topLevelLocationStrings++;
                    if (examples.length < 5) {
                        examples.push({
                            index,
                            title: event.title,
                            locationType: 'string',
                            location: event.location
                        });
                    }
                } else if (locationType === 'object') {
                    topLevelLocationObjects++;
                    if (examples.length < 5) {
                        examples.push({
                            index,
                            title: event.title,
                            locationType: 'object',
                            location: event.location
                        });
                    }
                }
            }
        });
        
        console.log('\n=== TOP-LEVEL LOCATION ANALYSIS ===');
        console.log(`Events with top-level location field: ${topLevelLocationCount}`);
        console.log(`Top-level location as string: ${topLevelLocationStrings}`);
        console.log(`Top-level location as object: ${topLevelLocationObjects}`);
        
        if (examples.length > 0) {
            console.log('\n=== TOP-LEVEL LOCATION EXAMPLES ===');
            examples.forEach(example => {
                console.log(`Index ${example.index}: ${example.title}`);
                console.log(`  Type: ${example.locationType}`);
                console.log(`  Value:`, typeof example.location === 'string' ? 
                    `"${example.location}"` : 
                    JSON.stringify(example.location, null, 2));
                console.log('');
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTopLevelLocations();
