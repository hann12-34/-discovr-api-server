require('dotenv').config();
const mongoose = require('mongoose');

async function analyzeVenueLocations() {
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
        
        let eventsWithLocationField = 0;
        let locationStrings = 0;
        let locationObjects = 0;
        let locationOtherTypes = 0;
        
        const stringLocationExamples = [];
        const objectLocationExamples = [];
        
        events.forEach((event, index) => {
            if (event.venue && event.venue.location !== undefined) {
                eventsWithLocationField++;
                
                const locationType = typeof event.venue.location;
                if (locationType === 'string') {
                    locationStrings++;
                    if (stringLocationExamples.length < 5) {
                        stringLocationExamples.push({
                            index,
                            title: event.title,
                            location: event.venue.location
                        });
                    }
                } else if (locationType === 'object') {
                    locationObjects++;
                    if (objectLocationExamples.length < 5) {
                        objectLocationExamples.push({
                            index,
                            title: event.title,
                            location: event.venue.location
                        });
                    }
                } else {
                    locationOtherTypes++;
                }
            }
        });
        
        console.log('\n=== VENUE.LOCATION ANALYSIS ===');
        console.log(`Events with venue.location field: ${eventsWithLocationField}`);
        console.log(`venue.location as string: ${locationStrings}`);
        console.log(`venue.location as object: ${locationObjects}`);
        console.log(`venue.location as other types: ${locationOtherTypes}`);
        
        if (stringLocationExamples.length > 0) {
            console.log('\n=== STRING LOCATION EXAMPLES ===');
            stringLocationExamples.forEach(example => {
                console.log(`Index ${example.index}: ${example.title}`);
                console.log(`  Location: "${example.location}"`);
            });
        }
        
        if (objectLocationExamples.length > 0) {
            console.log('\n=== OBJECT LOCATION EXAMPLES ===');
            objectLocationExamples.forEach(example => {
                console.log(`Index ${example.index}: ${example.title}`);
                console.log(`  Location:`, JSON.stringify(example.location, null, 2));
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

analyzeVenueLocations();
