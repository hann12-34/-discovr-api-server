#!/usr/bin/env node

// Clean contaminated NYC events tagged as Vancouver
const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

async function cleanContaminatedData() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        // Find events with NYC references but tagged as Vancouver
        const nycKeywords = [
            'New York', 'NYC', 'Manhattan', 'Brooklyn', 'Queens', 
            'Bronx', 'Staten Island', 'Lincoln Center', 'Central Park',
            'Village Vanguard', 'Radio City', 'Stonewall'
        ];
        
        let totalCleaned = 0;
        
        for (const keyword of nycKeywords) {
            // Remove Vancouver city tag from events with NYC keywords
            const result = await collection.updateMany(
                {
                    $and: [
                        {
                            $or: [
                                { "title": { $regex: keyword, $options: "i" } },
                                { "description": { $regex: keyword, $options: "i" } },
                                { "venue.name": { $regex: keyword, $options: "i" } },
                                { "venue.address": { $regex: keyword, $options: "i" } }
                            ]
                        },
                        {
                            $or: [
                                { "venue.city": "Vancouver" },
                                { "city": "Vancouver" }
                            ]
                        }
                    ]
                },
                {
                    $set: {
                        "venue.city": "New York",
                        "city": "New York"
                    }
                }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`🧹 Fixed ${result.modifiedCount} contaminated events containing "${keyword}"`);
                totalCleaned += result.modifiedCount;
            }
        }
        
        // Remove events that are clearly not Vancouver venues
        const nonVancouverVenues = [
            'Apollo Theater', 'Village Vanguard', 'Radio City', 'Lincoln Center',
            'Central Park', 'Brooklyn Bridge', 'Statue of Liberty', 'Ellis Island'
        ];
        
        for (const venue of nonVancouverVenues) {
            const result = await collection.updateMany(
                {
                    $and: [
                        { "venue.name": { $regex: venue, $options: "i" } },
                        {
                            $or: [
                                { "venue.city": "Vancouver" },
                                { "city": "Vancouver" }
                            ]
                        }
                    ]
                },
                {
                    $set: {
                        "venue.city": "New York",
                        "city": "New York"
                    }
                }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`🏢 Fixed ${result.modifiedCount} events at non-Vancouver venue "${venue}"`);
                totalCleaned += result.modifiedCount;
            }
        }
        
        console.log(`\n🧹 TOTAL CLEANED: ${totalCleaned} contaminated events fixed`);
        
        // Check final counts
        const vancouverCount = await collection.countDocuments({ "venue.city": "Vancouver" });
        const newYorkCount = await collection.countDocuments({ "venue.city": "New York" });
        const nullCityCount = await collection.countDocuments({ "venue.city": { $in: [null, ""] } });
        
        console.log(`📈 Vancouver events: ${vancouverCount}`);
        console.log(`🗽 New York events: ${newYorkCount}`);
        console.log(`⚠️  Null city events: ${nullCityCount}`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    cleanContaminatedData();
}

module.exports = { cleanContaminatedData };
