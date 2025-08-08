const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function checkViewButtons() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('discovr');
    const events = await db.collection('events').find({}).limit(20).toArray();
    
    console.log('📋 ADMIN VIEW BUTTON AUDIT:');
    let missingButtons = 0;
    
    events.forEach((event, i) => {
        const hasUrl = !!(event.url);
        const hasSourceUrl = !!(event.sourceUrl);
        const hasOfficialWebsite = !!(event.officialWebsite);
        
        console.log(`${i+1}. ${event.title || event.name || 'Untitled'}`);
        console.log(`   url: ${hasUrl ? '✅' : '❌'} | sourceUrl: ${hasSourceUrl ? '✅' : '❌'} | officialWebsite: ${hasOfficialWebsite ? '✅' : '❌'}`);
        
        if (!hasUrl && !hasSourceUrl && !hasOfficialWebsite) {
            console.log('   ⚠️  NO URL FIELDS - VIEW BUTTON WILL NOT APPEAR');
            missingButtons++;
        }
        console.log('');
    });
    
    console.log(`\n📊 SUMMARY: ${missingButtons}/${events.length} events missing View button`);
    
    await client.close();
}

checkViewButtons().catch(console.error);
