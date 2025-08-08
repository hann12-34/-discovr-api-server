const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

async function analyzeCityDistribution() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        console.log('\n=== EVENT CITY DISTRIBUTION ===');
        
        // Get all unique cities from venue.location.address
        const cityPipeline = [
            {
                $group: {
                    _id: "$venue.location.address",
                    count: { $sum: 1 },
                    sampleEvents: { $push: { title: "$title", id: "$id" } }
                }
            },
            {
                $sort: { count: -1 }
            }
        ];
        
        const cityDistribution = await collection.aggregate(cityPipeline).toArray();
        
        console.log('Top cities by venue address:');
        cityDistribution.slice(0, 15).forEach((city, index) => {
            console.log(`${index + 1}. ${city._id}: ${city.count} events`);
        });
        
        console.log('\n=== FOCUS CITIES ANALYSIS ===');
        
        // Check our 5 focus cities specifically
        const focusCities = ['Calgary', 'Montreal', 'New York', 'Toronto', 'Vancouver'];
        
        for (const city of focusCities) {
            // Count events that contain this city name in venue address
            const cityCount = await collection.countDocuments({
                "venue.location.address": { $regex: city, $options: "i" }
            });
            
            console.log(`${city}: ${cityCount} events`);
            
            // Sample a few events for this city
            const sampleEvents = await collection.find({
                "venue.location.address": { $regex: city, $options: "i" }
            }).limit(3).toArray();
            
            sampleEvents.forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.title}`);
                console.log(`     Address: ${event.venue?.location?.address}`);
            });
            console.log('');
        }
        
        console.log('\n=== UPCOMING EVENTS BY CITY ===');
        
        const now = new Date();
        for (const city of focusCities) {
            const upcomingCount = await collection.countDocuments({
                "venue.location.address": { $regex: city, $options: "i" },
                "startDate": { $gte: now }
            });
            
            console.log(`${city} upcoming events: ${upcomingCount}`);
        }
        
        console.log('\n=== TOTAL DATABASE STATS ===');
        const totalEvents = await collection.countDocuments();
        const upcomingEvents = await collection.countDocuments({
            "startDate": { $gte: now }
        });
        
        console.log(`Total events in database: ${totalEvents}`);
        console.log(`Total upcoming events: ${upcomingEvents}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

analyzeCityDistribution();
