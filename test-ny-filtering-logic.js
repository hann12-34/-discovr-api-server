const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

// Replicate the EXACT Swift filtering logic I added
function simulateNewYorkFiltering(event, filterCity) {
    const normalizedFilterCity = filterCity.toLowerCase();
    
    // Create the same allTextFields as Swift app
    const allTextFields = [
        event.location || '',
        event.venue?.name || '',
        event.streetAddress || '',
        event.name || '',
        event.description || ''
    ].join(' ').toLowerCase();
    
    console.log(`\n🔍 Testing: "${event.name || event.title}"`);
    console.log(`   📝 Combined text: "${allTextFields.substring(0, 100)}..."`);
    
    if (normalizedFilterCity === "new york") {
        // 🚨 STRICT EXCLUSION: Absolutely exclude events from other major cities
        if (allTextFields.includes("vancouver") ||
           allTextFields.includes("toronto") ||
           allTextFields.includes("calgary") ||
           allTextFields.includes("montreal") ||
           allTextFields.includes("ottawa") ||
           allTextFields.includes("british columbia") ||
           allTextFields.includes("bc") ||
           allTextFields.includes("ontario") ||
           allTextFields.includes("quebec") ||
           allTextFields.includes("alberta")) {
            console.log(`   ❌ EXCLUDED: Contains other city/province name`);
            return false;
        }
        
        // ✅ INCLUSIVE: Accept New York metro area and related terms
        if (allTextFields.includes("new york") ||
           allTextFields.includes("ny") ||
           allTextFields.includes("nyc") ||
           allTextFields.includes("manhattan") ||
           allTextFields.includes("brooklyn") ||
           allTextFields.includes("queens") ||
           allTextFields.includes("bronx") ||
           allTextFields.includes("staten island") ||
           allTextFields.includes("long island") ||
           allTextFields.includes("madison square garden") ||
           allTextFields.includes("lincoln center") ||
           allTextFields.includes("penn & teller") ||
           allTextFields.includes("billy idol") ||
           allTextFields.includes("hugh jackman") ||
           allTextFields.includes("lady gaga")) {
            console.log(`   ✅ INCLUDED: Contains New York identifier`);
            return true;
        }
        
        // Check for New York zip codes (common NYC patterns)
        const nyZipCodePatterns = [
            /100[0-9][0-9]/,  // Manhattan
            /101[0-9][0-9]/,  // Manhattan
            /102[0-9][0-9]/,  // Manhattan
            /103[0-9][0-9]/,  // Manhattan
            /104[0-9][0-9]/,  // Bronx
            /112[0-9][0-9]/,  // Queens
            /113[0-9][0-9]/,  // Queens
            /114[0-9][0-9]/,  // Queens
            /115[0-9][0-9]/,  // Queens
            /116[0-9][0-9]/,  // Queens
            /117[0-9][0-9]/,  // Queens
        ];
        
        for (const pattern of nyZipCodePatterns) {
            if (pattern.test(allTextFields)) {
                console.log(`   ✅ INCLUDED: Contains NYC zip code pattern`);
                return true;
            }
        }
        
        console.log(`   ❌ EXCLUDED: No New York identifiers found`);
        return false;
    }
    
    return false;
}

async function testNewYorkFiltering() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('discovr');
    
    console.log('🧪 COMPREHENSIVE NEW YORK FILTERING TEST\n');
    
    // Get all events
    const allEvents = await db.collection('events').find({}).toArray();
    console.log(`📊 Testing against ${allEvents.length} total events\n`);
    
    // Test New York filtering
    console.log('=== TESTING NEW YORK FILTERING LOGIC ===');
    
    let nyMatches = 0;
    let potentialNyEvents = [];
    
    allEvents.forEach(event => {
        const isNewYork = simulateNewYorkFiltering(event, 'New York');
        if (isNewYork) {
            nyMatches++;
            potentialNyEvents.push(event);
        }
    });
    
    console.log(`\n📈 RESULTS:`);
    console.log(`   New York matches: ${nyMatches} events`);
    
    console.log(`\n📋 NEW YORK EVENTS THAT WILL SHOW:`);
    potentialNyEvents.forEach((event, i) => {
        console.log(`   ${i+1}. ${event.name || event.title}`);
        console.log(`      Location: ${event.location || 'N/A'}`);
        console.log(`      Venue: ${event.venue?.name || 'N/A'}`);
    });
    
    // CRITICAL: Test for cross-contamination - check if any Toronto events would show up under New York
    console.log(`\n🚨 CROSS-CONTAMINATION TEST - Looking for Toronto events that might leak into New York:`);
    
    let contamination = 0;
    allEvents.forEach(event => {
        const allText = [
            event.location || '',
            event.venue?.name || '',
            event.streetAddress || '',
            event.name || '',
            event.description || ''
        ].join(' ').toLowerCase();
        
        // If event contains "toronto" but ALSO matches New York filtering, that's contamination
        if (allText.includes('toronto') && simulateNewYorkFiltering(event, 'New York')) {
            console.log(`   ⚠️  CONTAMINATION: "${event.name}" contains Toronto but matches NY filter`);
            contamination++;
        }
    });
    
    if (contamination === 0) {
        console.log(`   ✅ NO CONTAMINATION: No Toronto events will leak into New York category`);
    } else {
        console.log(`   ❌ CONTAMINATION DETECTED: ${contamination} Toronto events may leak into New York`);
    }
    
    await client.close();
}

testNewYorkFiltering().catch(console.error);
