const { MongoClient } = require('mongodb');
require('dotenv').config();

async function comprehensiveRepair() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('discovr');
    const events = db.collection('events');
    
    console.log('=== COMPREHENSIVE DATABASE REPAIR ===');
    
    let totalFixed = 0;
    
    // 1. Fix missing ID fields
    console.log('\n1. Fixing missing ID fields...');
    const missingIdCount = await events.countDocuments({ id: { $exists: false } });
    if (missingIdCount > 0) {
      const missingIdEvents = await events.find({ id: { $exists: false } }).toArray();
      for (const event of missingIdEvents) {
        const newId = event._id.toString();
        await events.updateOne(
          { _id: event._id },
          { $set: { id: newId } }
        );
      }
      console.log(`✅ Fixed ${missingIdEvents.length} missing ID fields`);
      totalFixed += missingIdEvents.length;
    }
    
    // Fix null/undefined IDs
    const nullIdResult = await events.updateMany(
      { $or: [{ id: null }, { id: undefined }] },
      [{ $set: { id: { $toString: "$_id" } } }]
    );
    if (nullIdResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${nullIdResult.modifiedCount} null/undefined IDs`);
      totalFixed += nullIdResult.modifiedCount;
    }
    
    // 2. Fix missing Title fields
    console.log('\n2. Fixing missing Title fields...');
    const titleResult = await events.updateMany(
      { $or: [
        { title: { $exists: false } }, 
        { title: null }, 
        { title: undefined }
      ]},
      { $set: { title: "Event Title" } }
    );
    if (titleResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${titleResult.modifiedCount} missing/null titles`);
      totalFixed += titleResult.modifiedCount;
    }
    
    // 3. Fix missing Location fields (CRITICAL!)
    console.log('\n3. Fixing missing Location fields...');
    const locationResult = await events.updateMany(
      { $or: [
        { location: { $exists: false } }, 
        { location: null }, 
        { location: undefined }
      ]},
      { $set: { location: "See venue details" } }
    );
    if (locationResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${locationResult.modifiedCount} missing/null locations`);
      totalFixed += locationResult.modifiedCount;
    }
    
    // 4. Fix missing Categories fields
    console.log('\n4. Fixing missing Categories fields...');
    const categoriesResult = await events.updateMany(
      { $or: [
        { categories: { $exists: false } }, 
        { categories: null }, 
        { categories: undefined }
      ]},
      { $set: { categories: ["event"] } }
    );
    if (categoriesResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${categoriesResult.modifiedCount} missing/null categories`);
      totalFixed += categoriesResult.modifiedCount;
    }
    
    // 5. Fix missing Description fields
    console.log('\n5. Fixing missing Description fields...');
    const descResult = await events.updateMany(
      { $or: [
        { description: { $exists: false } }, 
        { description: null }, 
        { description: undefined }
      ]},
      { $set: { description: "See website for details" } }
    );
    if (descResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${descResult.modifiedCount} missing/null descriptions`);
      totalFixed += descResult.modifiedCount;
    }
    
    // 6. Fix missing Venue fields
    console.log('\n6. Fixing missing Venue fields...');
    const venueResult = await events.updateMany(
      { $or: [
        { venue: { $exists: false } }, 
        { venue: null }, 
        { venue: undefined }
      ]},
      { $set: { 
        venue: {
          name: "Venue TBA",
          id: null,
          location: {
            address: "Address TBA",
            coordinates: [0, 0]
          }
        }
      }}
    );
    if (venueResult.modifiedCount > 0) {
      console.log(`✅ Fixed ${venueResult.modifiedCount} missing/null venues`);
      totalFixed += venueResult.modifiedCount;
    }
    
    // 7. Fix malformed venue structures
    console.log('\n7. Fixing malformed venue structures...');
    const malformedVenues = await events.find({
      $or: [
        { 'venue.location': { $exists: false } },
        { 'venue.location.address': { $exists: false } },
        { 'venue.location.coordinates': { $exists: false } }
      ]
    }).toArray();
    
    for (const event of malformedVenues) {
      const fixedVenue = {
        name: event.venue?.name || "Venue TBA",
        id: event.venue?.id || null,
        location: {
          address: event.venue?.location?.address || event.venue?.address || "Address TBA",
          coordinates: event.venue?.location?.coordinates || [0, 0]
        }
      };
      
      await events.updateOne(
        { _id: event._id },
        { $set: { venue: fixedVenue } }
      );
    }
    
    if (malformedVenues.length > 0) {
      console.log(`✅ Fixed ${malformedVenues.length} malformed venue structures`);
      totalFixed += malformedVenues.length;
    }
    
    // 8. Fix missing dates
    console.log('\n8. Fixing missing dates...');
    const startDateResult = await events.updateMany(
      { $or: [
        { startDate: { $exists: false } }, 
        { startDate: null }, 
        { startDate: undefined }
      ]},
      { $set: { startDate: null } }
    );
    
    const endDateResult = await events.updateMany(
      { $or: [
        { endDate: { $exists: false } }, 
        { endDate: null }, 
        { endDate: undefined }
      ]},
      { $set: { endDate: null } }
    );
    
    console.log(`✅ Ensured startDate exists for all events`);
    console.log(`✅ Ensured endDate exists for all events`);
    
    // 9. Fix missing optional fields
    console.log('\n9. Fixing missing optional fields...');
    await events.updateMany(
      { imageUrl: { $exists: false } },
      { $set: { imageUrl: "" } }
    );
    
    await events.updateMany(
      { officialWebsite: { $exists: false } },
      { $set: { officialWebsite: "" } }
    );
    
    console.log(`✅ Ensured imageUrl and officialWebsite fields exist`);
    
    // VERIFICATION
    console.log('\n=== VERIFICATION ===');
    const totalEvents = await events.countDocuments();
    
    const criticalChecks = [
      { field: 'id', missing: await events.countDocuments({ id: { $exists: false } }) },
      { field: 'title', missing: await events.countDocuments({ title: { $exists: false } }) },
      { field: 'location', missing: await events.countDocuments({ location: { $exists: false } }) },
      { field: 'categories', missing: await events.countDocuments({ categories: { $exists: false } }) },
      { field: 'venue', missing: await events.countDocuments({ venue: { $exists: false } }) },
      { field: 'price', missing: await events.countDocuments({ price: { $exists: false } }) }
    ];
    
    console.log(`Total events: ${totalEvents}`);
    let allGood = true;
    
    for (const check of criticalChecks) {
      console.log(`Missing ${check.field}: ${check.missing}`);
      if (check.missing > 0) allGood = false;
    }
    
    if (allGood) {
      console.log('\n🎉 COMPREHENSIVE REPAIR SUCCESSFUL!');
      console.log(`Fixed ${totalFixed} field issues across all events.`);
      console.log('All events now have required fields for app compatibility.');
    } else {
      console.log('\n⚠️  Some critical fields are still missing. Check output above.');
    }
    
  } catch (error) {
    console.error('Comprehensive repair error:', error);
  } finally {
    await client.close();
  }
}

comprehensiveRepair();
