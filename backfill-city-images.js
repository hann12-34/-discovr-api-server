/**
 * Backfill Images for Low-Coverage Cities
 * Fetches images from event source URLs for Miami, Seattle, Calgary, Montreal
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Image patterns to reject
const BAD_PATTERNS = [
  'logo', 'icon', 'favicon', 'placeholder', 'loading', 'default',
  'avatar', 'profile', 'badge', 'sprite', 'blank', 'spacer',
  'social', 'share', 'twitter', 'facebook', 'instagram',
  '1x1', '2x2', 'pixel', 'tracking'
];

function isValidImage(url) {
  if (!url || !url.startsWith('http')) return false;
  const urlLower = url.toLowerCase();
  return !BAD_PATTERNS.some(p => urlLower.includes(p));
}

async function fetchImageFromUrl(url) {
  if (!url || url === 'N/A' || !url.startsWith('http')) return null;
  
  // Skip generic listing pages
  if (url.endsWith('/events') || url.endsWith('/events/') || 
      url.endsWith('/calendar') || url.endsWith('/shows')) {
    return null;
  }
  
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000,
      maxRedirects: 3
    });
    
    const $ = cheerio.load(response.data);
    
    // Try Open Graph image
    let img = $('meta[property="og:image"]').attr('content');
    if (isValidImage(img)) return img;
    
    // Try Twitter image
    img = $('meta[name="twitter:image"]').attr('content') || $('meta[property="twitter:image"]').attr('content');
    if (isValidImage(img)) return img;
    
    // Try Schema.org
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json.image) {
          img = Array.isArray(json.image) ? json.image[0] : json.image;
          if (typeof img === 'object') img = img.url;
        }
      } catch (e) {}
    });
    if (isValidImage(img)) return img;
    
    // Try main content image
    const mainImg = $('article img, .event img, .content img, main img').first().attr('src');
    if (isValidImage(mainImg)) {
      return mainImg.startsWith('http') ? mainImg : new URL(mainImg, url).href;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function backfillCityImages() {
  console.log('🖼️  BACKFILLING IMAGES FOR LOW-COVERAGE CITIES\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    const targetCities = ['Miami', 'Seattle', 'Calgary', 'Montreal'];
    
    for (const city of targetCities) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📍 Processing ${city}`);
      console.log('='.repeat(50));
      
      // Get events without images that have valid URLs
      const events = await collection.find({
        city: city,
        $or: [
          { image: { $exists: false } },
          { image: null },
          { image: '' }
        ],
        $and: [
          { url: { $exists: true } },
          { url: { $ne: null } },
          { url: { $ne: 'N/A' } },
          { url: { $regex: /^https?:\/\// } }
        ]
      }).limit(150).toArray();
      
      console.log(`Found ${events.length} events to process\n`);
      
      let updated = 0;
      let noImage = 0;
      
      for (const event of events) {
        const url = event.sourceURL || event.url;
        const title = (event.title || '').substring(0, 35);
        
        // Skip generic venue URLs
        if (!url || url.endsWith('/events') || url.endsWith('/events/') || 
            url.endsWith('/calendar') || url.includes('/events/?')) {
          continue;
        }
        
        process.stdout.write(`🔍 ${title}...`);
        
        const imageUrl = await fetchImageFromUrl(url);
        
        if (imageUrl) {
          await collection.updateOne(
            { _id: event._id },
            { $set: { image: imageUrl, imageURL: imageUrl } }
          );
          console.log(` ✅`);
          updated++;
        } else {
          console.log(` ❌`);
          noImage++;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
      
      console.log(`\n${city}: Updated ${updated}, No image: ${noImage}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Backfill complete!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

backfillCityImages();
