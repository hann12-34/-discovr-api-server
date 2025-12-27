/**
 * Fetch Real Event Images
 * Only processes events with real event-specific URLs (not venue homepages)
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Patterns for WRONG images - never use these
const WRONG_PATTERNS = [
  'logo', 'icon', 'favicon', 'placeholder', 'loading', 'default',
  'avatar', 'profile', 'badge', 'sprite', 'blank', 'spacer',
  '2021_RN_LOGO', 'RN_LOGO', 'CasaLomaLogo', 'de_theme',
  'georgebrown.*default', 'sinaihealth.*default'
];

function isValidImage(url) {
  if (!url || !url.startsWith('http')) return false;
  const urlLower = url.toLowerCase();
  return !WRONG_PATTERNS.some(p => urlLower.includes(p.toLowerCase()));
}

async function fetchImageFromUrl(url) {
  if (!url || url === 'N/A') return null;
  
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Try Open Graph image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (isValidImage(ogImage)) {
      return ogImage;
    }
    
    // Try Twitter image (both property and name)
    const twitterImage = $('meta[property="twitter:image"]').attr('content') || 
                         $('meta[name="twitter:image"]').attr('content');
    if (isValidImage(twitterImage)) {
      return twitterImage;
    }
    
    // Try Schema.org image
    const schemaScript = $('script[type="application/ld+json"]').first().html();
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript);
        const schemaImage = schema.image || (schema['@graph'] && schema['@graph'][0]?.image);
        if (typeof schemaImage === 'string' && isValidImage(schemaImage)) {
          return schemaImage;
        }
      } catch (e) {}
    }
    
    // Try main event image (large images only)
    const mainImg = $('img.event-image, img.show-image, .event-hero img, .hero img, article img').first();
    const imgSrc = mainImg.attr('src') || mainImg.attr('data-src');
    if (isValidImage(imgSrc)) {
      return imgSrc;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

function isRealEventUrl(url) {
  if (!url) return false;
  
  // Must contain event-specific path patterns
  const eventPatterns = [
    '/event/', '/events/', '/show/', '/shows/', '/tickets/',
    '/performance/', '/concert/', '/gig/', '/listing/'
  ];
  
  // Exclude generic venue homepages
  const genericPatterns = [
    /\/events\/?$/,  // Just /events/ with nothing after
    /\/#/,           // Hash links
  ];
  
  const hasEventPattern = eventPatterns.some(p => url.includes(p));
  const isGeneric = genericPatterns.some(p => p.test(url));
  
  return hasEventPattern && !isGeneric;
}

async function fetchRealEventImages() {
  console.log('🖼️  FETCHING REAL EVENT IMAGES\n');
  console.log('Only processing events with real event-specific URLs...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Target ALL cities
    const targetCities = ['Vancouver', 'Toronto', 'Calgary', 'Montreal', 'Los Angeles', 'Miami', 'Seattle', 'New York'];
    
    // Find events without images
    const eventsWithoutImages = await collection.find({
      city: { $in: targetCities },
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    }).toArray();
    
    console.log(`📊 Found ${eventsWithoutImages.length} events without images\n`);
    
    // Filter to only real event URLs
    const eventsWithRealUrls = eventsWithoutImages.filter(e => {
      const url = e.sourceURL || e.url;
      return isRealEventUrl(url);
    });
    
    console.log(`📊 ${eventsWithRealUrls.length} have real event-specific URLs\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const event of eventsWithRealUrls) {
      const url = event.sourceURL || event.url;
      const title = (event.title || '').substring(0, 40);
      
      console.log(`🔍 ${title}...`);
      
      const imageUrl = await fetchImageFromUrl(url);
      
      if (imageUrl) {
        await collection.updateOne(
          { _id: event._id },
          { $set: { image: imageUrl, imageURL: imageUrl } }
        );
        console.log(`   ✅ Found: ${imageUrl.substring(0, 50)}...`);
        updated++;
      } else {
        console.log(`   ❌ No image`);
        failed++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Added ${updated} real images`);
    console.log(`❌ No image found: ${failed}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

fetchRealEventImages();
