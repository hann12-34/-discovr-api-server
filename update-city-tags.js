#!/usr/bin/env node

// Fix null city values for Vancouver events
const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

async function updateVancouverCityTags() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr-api');
        const collection = db.collection('events');
        
        // Update events with Vancouver venue names to have city: "Vancouver"
        const vancouverVenues = [
            'BC Place Stadium',
            'Capilano Suspension Bridge',
            'Grouse Mountain',
            'Vancouver Aquarium',
            'VanDusen Botanical Garden'
        ];
        
        let totalUpdated = 0;
        
        for (const venueName of vancouverVenues) {
            const result = await collection.updateMany(
                { 
                    "venue.name": venueName,
                    "venue.city": { $in: [null, ""] }
                },
                { 
                    $set: { 
                        "venue.city": "Vancouver",
                        "city": "Vancouver"
                    }
                }
            );
            
            console.log(`✅ Updated ${result.modifiedCount} events for ${venueName}`);
            totalUpdated += result.modifiedCount;
        }
        
        // Also update events with venue addresses containing Vancouver keywords
        const addressResult = await collection.updateMany(
            {
                $or: [
                    { "venue.address": { $regex: /vancouver/i } },
                    { "venue.address": { $regex: /burnaby/i } },
                    { "venue.address": { $regex: /richmond/i } },
                    { "venue.address": { $regex: /bc\s+v\d/i } }
                ],
                "venue.city": { $in: [null, ""] }
            },
            { 
                $set: { 
                    "venue.city": "Vancouver",
                    "city": "Vancouver"
                }
            }
        );
        
        console.log(`✅ Updated ${addressResult.modifiedCount} events by address`);
        totalUpdated += addressResult.modifiedCount;
        
        console.log(`\n📊 TOTAL UPDATED: ${totalUpdated} events now tagged as Vancouver`);
        
        // Check results
        const vancouverCount = await collection.countDocuments({ "venue.city": "Vancouver" });
        const nullCityCount = await collection.countDocuments({ "venue.city": { $in: [null, ""] } });
        
        console.log(`📈 Vancouver events: ${vancouverCount}`);
        console.log(`⚠️  Null city events: ${nullCityCount}`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    updateVancouverCityTags();
}

module.exports = { updateVancouverCityTags };
