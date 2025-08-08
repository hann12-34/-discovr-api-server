const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

async function analyzeAddresses() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        console.log('\n=== TOP 30 VENUE ADDRESSES ===');
        
        // Get top addresses
        const addressPipeline = [
            {
                $group: {
                    _id: "$venue.location.address",
                    count: { $sum: 1 },
                    sampleTitles: { $push: "$title" }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 30
            }
        ];
        
        const addressDistribution = await collection.aggregate(addressPipeline).toArray();
        
        addressDistribution.forEach((addr, index) => {
            console.log(`${index + 1}. "${addr._id}": ${addr.count} events`);
            console.log(`   Sample: ${addr.sampleTitles[0]}`);
        });
        
        console.log('\n=== CALGARY ANALYSIS ===');
        
        // Look for Calgary-related keywords
        const calgaryKeywords = ['whyte', 'calgary', 'alberta', 'edmonton', 'kensington', 'stephen avenue'];
        
        for (const keyword of calgaryKeywords) {
            const count = await collection.countDocuments({
                "venue.location.address": { $regex: keyword, $options: "i" }
            });
            
            if (count > 0) {
                console.log(`Events with "${keyword}" in address: ${count}`);
                
                const samples = await collection.find({
                    "venue.location.address": { $regex: keyword, $options: "i" }
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`  ${i + 1}. ${event.title}`);
                    console.log(`     ${event.venue?.location?.address}`);
                });
            }
        }
        
        console.log('\n=== MONTREAL ANALYSIS ===');
        
        // Look for Montreal-related keywords
        const montrealKeywords = ['montreal', 'quebec', 'rue', 'boulevard', 'st-laurent', 'crescent'];
        
        for (const keyword of montrealKeywords) {
            const count = await collection.countDocuments({
                "venue.location.address": { $regex: keyword, $options: "i" }
            });
            
            if (count > 0) {
                console.log(`Events with "${keyword}" in address: ${count}`);
                
                const samples = await collection.find({
                    "venue.location.address": { $regex: keyword, $options: "i" }
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`  ${i + 1}. ${event.title}`);
                    console.log(`     ${event.venue?.location?.address}`);
                });
            }
        }
        
        console.log('\n=== NEW YORK ANALYSIS ===');
        
        // Look for NYC-related keywords
        const nycKeywords = ['new york', 'brooklyn', 'manhattan', 'queens', 'bronx', 'broadway', 'avenue'];
        
        for (const keyword of nycKeywords) {
            const count = await collection.countDocuments({
                "venue.location.address": { $regex: keyword, $options: "i" }
            });
            
            if (count > 0) {
                console.log(`Events with "${keyword}" in address: ${count}`);
                
                const samples = await collection.find({
                    "venue.location.address": { $regex: keyword, $options: "i" }
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`  ${i + 1}. ${event.title}`);
                    console.log(`     ${event.venue?.location?.address}`);
                });
            }
        }
        
        console.log('\n=== REGIONAL MAPPING CANDIDATES ===');
        
        // Try to identify regions by common address patterns
        const regions = {
            'Alberta/Calgary': ['whyte', 'jasper', 'calgary', 'alberta', 'edmonton'],
            'BC/Vancouver': ['granville', 'hastings', 'robson', 'vancouver', 'richmond', 'burnaby'],
            'Ontario/Toronto': ['queen', 'king', 'yonge', 'toronto', 'ontario'],
            'Quebec/Montreal': ['rue', 'boulevard', 'montreal', 'quebec', 'st-laurent']
        };
        
        for (const [region, keywords] of Object.entries(regions)) {
            let totalCount = 0;
            
            for (const keyword of keywords) {
                const count = await collection.countDocuments({
                    "venue.location.address": { $regex: keyword, $options: "i" }
                });
                totalCount += count;
            }
            
            console.log(`${region}: ~${totalCount} potential events (may have overlaps)`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

analyzeAddresses();
