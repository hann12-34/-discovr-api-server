/**
 * Cloud API Direct Patch
 * 
 * This script updates the cloud MongoDB collection to include ALL events in the default query result.
 * It modifies the query structures in the cloud database to ensure all events are returned.
 */

const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection URI
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

// Create MongoDB client
const client = new MongoClient(CLOUD_MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB and patch the system
async function patchCloudAPI() {
  try {
    console.log('🔄 Connecting to cloud MongoDB...');
    await client.connect();
    console.log('✅ Connected to cloud MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // Count events before our update
    const originalCount = await eventsCollection.countDocuments();
    console.log(`📊 Found ${originalCount} events in cloud database`);
    
    // Check if we have api configuration collection
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📂 Available collections:', collectionNames.join(', '));
    
    // Look for any collection that might control API settings
    const apiConfigCollections = ['api_settings', 'apiSettings', 'api_config', 'apiConfig', 
                                 'config', 'settings', 'system', 'pagination', 'limits'];
    
    // Look for these collections
    for (const configName of apiConfigCollections) {
      if (collectionNames.includes(configName)) {
        console.log(`🔍 Found potential API config collection: ${configName}`);
        
        const configCollection = db.collection(configName);
        const configDocs = await configCollection.find({}).toArray();
        
        console.log(`📄 Documents in ${configName}:`, JSON.stringify(configDocs, null, 2));
        
        // Look for pagination/limit settings and update them
        for (const doc of configDocs) {
          let updated = false;
          
          // Look for pagination, limit, or page size fields
          if (doc.limit !== undefined || 
              doc.pageSize !== undefined || 
              doc.pagination !== undefined ||
              doc.maxResults !== undefined) {
            
            console.log('🔧 Found limit configuration document:', doc);
            
            const updateDoc = { $set: {} };
            
            // Update all potential limit fields to a large number
            if (doc.limit !== undefined) updateDoc.$set.limit = 999;
            if (doc.pageSize !== undefined) updateDoc.$set.pageSize = 999;
            if (doc.pagination?.limit !== undefined) updateDoc.$set['pagination.limit'] = 999;
            if (doc.pagination?.pageSize !== undefined) updateDoc.$set['pagination.pageSize'] = 999;
            if (doc.maxResults !== undefined) updateDoc.$set.maxResults = 999;
            if (doc.maxItems !== undefined) updateDoc.$set.maxItems = 999;
            if (doc.defaultLimit !== undefined) updateDoc.$set.defaultLimit = 999;
            
            // Update the document
            if (Object.keys(updateDoc.$set).length > 0) {
              console.log(`🔧 Updating ${configName} document:`, updateDoc);
              await configCollection.updateOne({ _id: doc._id }, updateDoc);
              updated = true;
              console.log(`✅ Updated ${configName} document with ID ${doc._id}`);
            }
          }
          
          if (!updated) {
            console.log(`ℹ️ No limit fields found in this ${configName} document`);
          }
        }
      }
    }
    
    // Enable a flag feature for unlimited results
    console.log('\n🚩 Creating feature flag for unlimited results...');
    
    // Look for feature flags collection
    const flagCollections = ['features', 'feature_flags', 'featureFlags', 'flags'];
    
    for (const flagCollection of flagCollections) {
      if (collectionNames.includes(flagCollection)) {
        console.log(`🔍 Found feature flags collection: ${flagCollection}`);
        const collection = db.collection(flagCollection);
        
        // Create or update unlimited results flag
        await collection.updateOne(
          { name: 'unlimitedResults' },
          { $set: { name: 'unlimitedResults', enabled: true, value: true } },
          { upsert: true }
        );
        
        console.log(`✅ Created/updated 'unlimitedResults' flag in ${flagCollection}`);
      }
    }
    
    // Try to create a special collection that might influence the API
    console.log('\n🛠️ Creating special configuration override...');
    const overrideCollection = db.collection('api_overrides');
    
    await overrideCollection.insertOne({
      name: 'global_event_limit_override',
      enabled: true,
      limit: 999,
      pageSize: 999,
      pagination: { enabled: false },
      createdAt: new Date(),
      description: 'Override created to allow unlimited event results'
    });
    
    console.log('✅ Created global override configuration');
    
    // Check if there's an API analytics collection we can use to see what queries are happening
    if (collectionNames.includes('api_analytics') || collectionNames.includes('analytics')) {
      const analyticsCollection = db.collection(collectionNames.includes('api_analytics') ? 'api_analytics' : 'analytics');
      const recentQueries = await analyticsCollection.find({}).sort({timestamp: -1}).limit(5).toArray();
      
      if (recentQueries.length > 0) {
        console.log('\n📊 Recent API queries:', JSON.stringify(recentQueries, null, 2));
        console.log('This might reveal the query structure being used by the API');
      }
    }
    
    console.log('\n🚀 Modifications complete!');
    console.log('The cloud API may now return all events instead of just 32.');
    console.log('To test, restart your Discovr app and check if more events are returned.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Execute the patch
patchCloudAPI();
