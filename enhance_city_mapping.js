const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

// Enhanced city mapping patterns
const cityMappingPatterns = {
    'Vancouver': [
        // Explicit city names
        /vancouver/i,
        /burnaby/i,
        /richmond/i,
        /north vancouver/i,
        /west vancouver/i,
        // Street patterns specific to Vancouver
        /granville st/i,
        /robson st/i,
        /hastings st/i,
        /pender st/i,
        /main st.*vancouver/i,
        /whyte ave/i,  // Vanier Park, Vancouver
        /pipeline road.*stanley park/i,
        /venables st/i,
        /smithe st/i,
        /mainland st/i,
        /hamilton street/i,
        /seymour st/i,
        /quebec st.*creekside/i,
        // Specific Vancouver venues/areas
        /vanier park/i,
        /stanley park/i,
        /canada place/i,
        /victory ship way/i,  // North Vancouver
        /river rd.*8351/i     // Richmond
    ],
    
    'Toronto': [
        // Explicit city names
        /toronto/i,
        /north york/i,
        /scarborough/i,
        /etobicoke/i,
        // Street patterns specific to Toronto
        /lake shore blvd.*toronto/i,
        /spadina ave.*toronto/i,
        /queens park.*toronto/i,
        /tank house lane.*toronto/i,
        /don mills rd.*north york/i,
        // Ontario patterns
        /toronto.*on/i,
        /ontario.*m[0-9][a-z]/i  // Postal code pattern
    ],
    
    'Calgary': [
        // Explicit city names
        /calgary/i,
        /alberta/i,
        // Would need Calgary-specific street patterns
        // Based on current data, most Calgary events might be misclassified
    ],
    
    'Montreal': [
        // Explicit city names  
        /montreal/i,
        /quebec.*qc/i,
        // French street patterns
        /rue\s/i,
        /boulevard\s/i,
        /st-laurent/i,
        /crescent rd.*montreal/i
    ],
    
    'New York': [
        // Explicit city names
        /new york/i,
        /manhattan/i,
        /brooklyn/i,
        /queens/i,
        /bronx/i,
        /nyc/i,
        // Street patterns
        /broadway/i,
        /\d+th avenue/i,
        /\d+st avenue/i
    ]
};

async function enhanceCityMapping() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        console.log('\n=== ENHANCED CITY MAPPING ANALYSIS ===\n');
        
        const cityResults = {};
        
        for (const [cityName, patterns] of Object.entries(cityMappingPatterns)) {
            console.log(`🏙️  ${cityName.toUpperCase()} ANALYSIS:`);
            
            let totalMatches = 0;
            const matchedEvents = new Set(); // Use Set to avoid double-counting
            
            // Test each pattern
            for (const pattern of patterns) {
                const matches = await collection.find({
                    "venue.location.address": pattern
                }).toArray();
                
                matches.forEach(event => {
                    if (!matchedEvents.has(event._id.toString())) {
                        matchedEvents.add(event._id.toString());
                    }
                });
                
                if (matches.length > 0) {
                    console.log(`   Pattern "${pattern}" matches: ${matches.length} events`);
                    // Show sample
                    if (matches.length > 0) {
                        console.log(`   Sample: "${matches[0].venue?.location?.address}"`);
                    }
                }
            }
            
            totalMatches = matchedEvents.size;
            cityResults[cityName] = totalMatches;
            
            console.log(`   📊 TOTAL ${cityName} events: ${totalMatches}\n`);
        }
        
        console.log('=== CITY MAPPING SUMMARY ===');
        let grandTotal = 0;
        Object.entries(cityResults).forEach(([city, count]) => {
            console.log(`${city}: ${count} events`);
            grandTotal += count;
        });
        console.log(`\nTotal mapped events: ${grandTotal}`);
        
        const totalInDB = await collection.countDocuments();
        const unmapped = totalInDB - grandTotal;
        console.log(`Unmapped events: ${unmapped} (${((unmapped/totalInDB)*100).toFixed(1)}%)`);
        
        // Check for upcoming events in each city
        console.log('\n=== UPCOMING EVENTS BY ENHANCED MAPPING ===');
        const now = new Date();
        
        for (const [cityName, patterns] of Object.entries(cityMappingPatterns)) {
            const orConditions = patterns.map(pattern => ({
                "venue.location.address": pattern
            }));
            
            const upcomingCount = await collection.countDocuments({
                $and: [
                    { $or: orConditions },
                    { "startDate": { $gte: now } }
                ]
            });
            
            console.log(`${cityName} upcoming: ${upcomingCount} events`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

enhanceCityMapping();
