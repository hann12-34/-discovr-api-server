const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

async function investigateMissingCities() {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('discovr');
        const collection = db.collection('events');
        
        console.log('\n=== DEEP INVESTIGATION: CALGARY, MONTREAL, NYC ===\n');
        
        // 1. Check source URLs for clues about city origins
        console.log('🔍 ANALYZING SOURCE URLS FOR CITY CLUES...\n');
        
        const sourceUrlAnalysis = await collection.aggregate([
            {
                $group: {
                    _id: "$sourceURL",
                    count: { $sum: 1 },
                    sampleTitle: { $first: "$title" },
                    sampleAddress: { $first: "$venue.location.address" }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 20
            }
        ]).toArray();
        
        console.log('Top source URLs:');
        sourceUrlAnalysis.forEach((source, index) => {
            console.log(`${index + 1}. ${source._id} (${source.count} events)`);
            console.log(`   Sample: "${source.sampleTitle}"`);
            console.log(`   Address: "${source.sampleAddress}"`);
            console.log('');
        });
        
        // 2. Search for Calgary-specific terms in ALL fields
        console.log('\n🏔️  CALGARY DEEP SEARCH...\n');
        
        const calgaryTerms = [
            'calgary', 'alberta', 'yyc', 'bow', 'elbow', 'stampede', 
            'kensington', 'inglewood', 'mission', 'hillhurst', 'sunnyside',
            'stephen avenue', 'olympic plaza', 'prince island', 'eau claire'
        ];
        
        for (const term of calgaryTerms) {
            console.log(`Searching for "${term}"...`);
            
            // Search in all text fields
            const titleMatches = await collection.countDocuments({
                title: { $regex: term, $options: "i" }
            });
            
            const addressMatches = await collection.countDocuments({
                "venue.location.address": { $regex: term, $options: "i" }
            });
            
            const venueNameMatches = await collection.countDocuments({
                "venue.name": { $regex: term, $options: "i" }
            });
            
            const sourceMatches = await collection.countDocuments({
                "sourceURL": { $regex: term, $options: "i" }
            });
            
            const total = titleMatches + addressMatches + venueNameMatches + sourceMatches;
            
            if (total > 0) {
                console.log(`  📍 Found ${total} matches: title(${titleMatches}) address(${addressMatches}) venue(${venueNameMatches}) source(${sourceMatches})`);
                
                // Get sample events
                const samples = await collection.find({
                    $or: [
                        { title: { $regex: term, $options: "i" } },
                        { "venue.location.address": { $regex: term, $options: "i" } },
                        { "venue.name": { $regex: term, $options: "i" } },
                        { "sourceURL": { $regex: term, $options: "i" } }
                    ]
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`    ${i + 1}. "${event.title}"`);
                    console.log(`       Address: ${event.venue?.location?.address}`);
                    console.log(`       Source: ${event.sourceURL}`);
                });
            }
        }
        
        // 3. Search for Montreal-specific terms
        console.log('\n🍁 MONTREAL DEEP SEARCH...\n');
        
        const montrealTerms = [
            'montreal', 'quebec', 'mtl', 'yul', 'plateau', 'mile end',
            'old montreal', 'vieux-montreal', 'downtown', 'centre-ville',
            'st-laurent', 'boulevard', 'rue ', 'crescent', 'st-denis',
            'notre-dame', 'sherbrooke', 'sainte-catherine'
        ];
        
        for (const term of montrealTerms) {
            console.log(`Searching for "${term}"...`);
            
            const titleMatches = await collection.countDocuments({
                title: { $regex: term, $options: "i" }
            });
            
            const addressMatches = await collection.countDocuments({
                "venue.location.address": { $regex: term, $options: "i" }
            });
            
            const venueNameMatches = await collection.countDocuments({
                "venue.name": { $regex: term, $options: "i" }
            });
            
            const sourceMatches = await collection.countDocuments({
                "sourceURL": { $regex: term, $options: "i" }
            });
            
            const total = titleMatches + addressMatches + venueNameMatches + sourceMatches;
            
            if (total > 0) {
                console.log(`  📍 Found ${total} matches: title(${titleMatches}) address(${addressMatches}) venue(${venueNameMatches}) source(${sourceMatches})`);
                
                const samples = await collection.find({
                    $or: [
                        { title: { $regex: term, $options: "i" } },
                        { "venue.location.address": { $regex: term, $options: "i" } },
                        { "venue.name": { $regex: term, $options: "i" } },
                        { "sourceURL": { $regex: term, $options: "i" } }
                    ]
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`    ${i + 1}. "${event.title}"`);
                    console.log(`       Address: ${event.venue?.location?.address}`);
                    console.log(`       Source: ${event.sourceURL}`);
                });
            }
        }
        
        // 4. Search for New York-specific terms
        console.log('\n🗽 NEW YORK DEEP SEARCH...\n');
        
        const nycTerms = [
            'new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx',
            'staten island', 'broadway', 'times square', 'central park',
            'soho', 'tribeca', 'chelsea', 'greenwich', 'harlem',
            'williamsburg', 'astoria', 'flushing'
        ];
        
        for (const term of nycTerms) {
            console.log(`Searching for "${term}"...`);
            
            const titleMatches = await collection.countDocuments({
                title: { $regex: term, $options: "i" }
            });
            
            const addressMatches = await collection.countDocuments({
                "venue.location.address": { $regex: term, $options: "i" }
            });
            
            const venueNameMatches = await collection.countDocuments({
                "venue.name": { $regex: term, $options: "i" }
            });
            
            const sourceMatches = await collection.countDocuments({
                "sourceURL": { $regex: term, $options: "i" }
            });
            
            const total = titleMatches + addressMatches + venueNameMatches + sourceMatches;
            
            if (total > 0) {
                console.log(`  📍 Found ${total} matches: title(${titleMatches}) address(${addressMatches}) venue(${venueNameMatches}) source(${sourceMatches})`);
                
                const samples = await collection.find({
                    $or: [
                        { title: { $regex: term, $options: "i" } },
                        { "venue.location.address": { $regex: term, $options: "i" } },
                        { "venue.name": { $regex: term, $options: "i" } },
                        { "sourceURL": { $regex: term, $options: "i" } }
                    ]
                }).limit(3).toArray();
                
                samples.forEach((event, i) => {
                    console.log(`    ${i + 1}. "${event.title}"`);
                    console.log(`       Address: ${event.venue?.location?.address}`);
                    console.log(`       Source: ${event.sourceURL}`);
                });
            }
        }
        
        // 5. Check if there are events with missing/generic addresses that might belong to these cities
        console.log('\n🔍 CHECKING GENERIC/MISSING ADDRESSES...\n');
        
        const genericAddresses = await collection.find({
            $or: [
                { "venue.location.address": "Address TBA" },
                { "venue.location.address": "Various locations" },
                { "venue.location.address": "TBA" },
                { "venue.location.address": "" },
                { "venue.location.address": null },
                { "venue.location.address": { $exists: false } }
            ]
        }).limit(10).toArray();
        
        console.log(`Found ${genericAddresses.length} events with generic/missing addresses:`);
        genericAddresses.forEach((event, i) => {
            console.log(`  ${i + 1}. "${event.title}"`);
            console.log(`     Address: "${event.venue?.location?.address}"`);
            console.log(`     Source: ${event.sourceURL}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

investigateMissingCities();
