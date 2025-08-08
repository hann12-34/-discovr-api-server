const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function checkEmptyUrls() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('discovr');
    const events = await db.collection('events').find({}).limit(30).toArray();
    
    console.log('🔍 CHECKING FOR EMPTY/INVALID URL VALUES:');
    let emptyUrls = 0;
    
    events.forEach((event, i) => {
        const sourceUrl = event.sourceUrl;
        const source_url = event.source_url;
        
        // Check if the values are actually empty strings or invalid
        const hasValidSourceUrl = sourceUrl && sourceUrl.trim() !== '' && sourceUrl !== 'undefined' && sourceUrl !== 'null';
        const hasValidSource_url = source_url && source_url.trim() !== '' && source_url !== 'undefined' && source_url !== 'null';
        
        console.log(`${i+1}. ${event.title || event.name || 'Untitled'}`);
        console.log(`   sourceUrl: "${sourceUrl}" ${hasValidSourceUrl ? '✅' : '❌'}`);
        console.log(`   source_url: "${source_url}" ${hasValidSource_url ? '✅' : '❌'}`);
        
        if (!hasValidSourceUrl && !hasValidSource_url) {
            console.log('   ⚠️  INVALID URLS - VIEW BUTTON WILL NOT APPEAR');
            emptyUrls++;
        }
        console.log('');
    });
    
    console.log(`\n📊 SUMMARY: ${emptyUrls}/${events.length} events have invalid URLs (no View button)`);
    
    await client.close();
}

checkEmptyUrls().catch(console.error);
