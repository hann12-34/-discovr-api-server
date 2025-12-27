/**
 * Remove Wrong/Mismatched Images
 * Removes venue logos, loading GIFs, and other incorrect images
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Patterns for WRONG images that should be removed
const WRONG_IMAGE_PATTERNS = [
  // Calgary venue logos
  '2021_RN_LOGO',           // Calgary Roughnecks logo
  'RN_LOGO',                // Roughnecks logo variants
  'roughnecks.*logo',       // Any roughnecks logo
  'saddledome.*logo',       // Saddledome logos
  
  // Toronto venue/institutional logos
  'CasaLomaLogo',           // Casa Loma logo
  'georgebrown.*default',   // George Brown College default
  'sinaihealth.*default',   // Sinai Health default
  'de_theme',               // Institutional default theme
  
  // Loading/placeholder images
  'tribe-loading.gif',      // Events calendar loading gif
  'loading.gif',
  'placeholder',
  'default-image',
  'no-image',
  
  // Generic venue logos
  'venue-logo',
  'site-logo',
  
  // Very small images (likely icons)
  'favicon',
];

async function removeWrongImages() {
  console.log('🗑️  REMOVING WRONG/MISMATCHED IMAGES\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    let totalRemoved = 0;
    
    for (const pattern of WRONG_IMAGE_PATTERNS) {
      const result = await collection.updateMany(
        { 
          $or: [
            { image: { $regex: pattern, $options: 'i' } },
            { imageURL: { $regex: pattern, $options: 'i' } }
          ]
        },
        { 
          $unset: { image: '', imageURL: '' }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`  🗑️  Removed ${result.modifiedCount} images matching: ${pattern}`);
        totalRemoved += result.modifiedCount;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Removed ${totalRemoved} wrong/mismatched images`);
    console.log('='.repeat(50));
    
    // Show remaining image counts by city
    console.log('\n📊 Remaining images by city:');
    for (const city of ['Calgary', 'Vancouver', 'Toronto']) {
      const withImages = await collection.countDocuments({
        city: city,
        $or: [
          { image: { $exists: true, $ne: null, $ne: '' } },
          { imageURL: { $exists: true, $ne: null, $ne: '' } }
        ]
      });
      const total = await collection.countDocuments({ city: city });
      console.log(`  ${city}: ${withImages}/${total} (${Math.round(withImages*100/total)}%)`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

removeWrongImages();
