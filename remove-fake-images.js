/**
 * Remove Fake/Fallback Images
 * Removes all Unsplash and other non-official images
 * Only keeps images from actual event source URLs
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Patterns that indicate fake/stock images (NOT from official sources)
const FAKE_IMAGE_PATTERNS = [
  'unsplash.com',           // Stock photos
  'images.unsplash.com',    // Stock photos
  'squarespace-cdn.com/content/v1/5a8e7d7f',  // Generic template images
  'placeholder',
  'stock',
  'generic'
];

async function removeFakeImages() {
  console.log('🗑️  REMOVING FAKE/STOCK IMAGES\n');
  console.log('This will remove images from Unsplash and other stock sources.\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    let removed = 0;
    
    for (const pattern of FAKE_IMAGE_PATTERNS) {
      // Remove image field where it matches fake pattern
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
        removed += result.modifiedCount;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Removed ${removed} fake/stock images`);
    console.log('='.repeat(50));
    
    // Now count remaining real images
    const withImages = await collection.countDocuments({
      $or: [
        { image: { $exists: true, $ne: null, $ne: '' } },
        { imageURL: { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    const total = await collection.countDocuments({});
    
    console.log(`\n📊 Remaining real images: ${withImages}/${total} events`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

removeFakeImages();
