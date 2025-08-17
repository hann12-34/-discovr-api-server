/**
 * INVESTIGATE MISSING NYC EVENTS - Find out why imports failed
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

async function investigateMissingNYCEvents() {
  console.log('🔍 INVESTIGATING MISSING NYC EVENTS');
  console.log('=' .repeat(50));
  console.log('🎯 Goal: Find out why NYC events are missing from production DB');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Check what events ARE in the database
    console.log('\n📊 CURRENT DATABASE CONTENTS:');
    console.log('=' .repeat(35));
    
    const totalEvents = await collection.countDocuments({});
    console.log(`📊 Total events: ${totalEvents}`);
    
    // Check by source field to see what scrapers contributed
    const sourceGroups = await collection.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n📈 Events by Source:');
    sourceGroups.forEach(group => {
      console.log(`   ${group._id || 'Unknown'}: ${group.count} events`);
    });
    
    // Check by city field to see what cities are represented
    const cityGroups = await collection.aggregate([
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n🌆 Events by City Field:');
    cityGroups.forEach(group => {
      console.log(`   "${group._id || 'Unknown'}": ${group.count} events`);
    });
    
    // Check by venue.city field
    const venueCityGroups = await collection.aggregate([
      {
        $group: {
          _id: "$venue.city",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n🏢 Events by Venue.City Field:');
    venueCityGroups.forEach(group => {
      console.log(`   "${group._id || 'Unknown'}": ${group.count} events`);
    });
    
    // Look for any events that might be NYC-related but not properly tagged
    console.log('\n🔍 SEARCHING FOR POTENTIAL NYC EVENTS...');
    console.log('=' .repeat(45));
    
    const possibleNYCTerms = ['york', 'nyc', 'manhattan', 'brooklyn', 'bronx', 'queens', 'staten'];
    
    for (const term of possibleNYCTerms) {
      const titleMatches = await collection.countDocuments({
        title: { $regex: term, $options: 'i' }
      });
      const descMatches = await collection.countDocuments({
        description: { $regex: term, $options: 'i' }
      });
      const urlMatches = await collection.countDocuments({
        url: { $regex: term, $options: 'i' }
      });
      
      if (titleMatches > 0 || descMatches > 0 || urlMatches > 0) {
        console.log(`🔎 "${term}": ${titleMatches} titles, ${descMatches} descriptions, ${urlMatches} URLs`);
      }
    }
    
    // Check recent events (maybe NYC events were imported but are old?)
    console.log('\n📅 RECENT EVENTS CHECK:');
    console.log('=' .repeat(25));
    
    const recentEvents = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
      
    console.log('📋 5 Most Recent Events:');
    recentEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. "${event.title}" (${event.city || 'No city'}) - ${event.createdAt || 'No date'}`);
    });
    
    // Check if there's a separate NYC database
    console.log('\n🔍 CHECKING FOR SEPARATE NYC DATABASE...');
    console.log('=' .repeat(40));
    
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    
    console.log('📂 Available databases:');
    databases.databases.forEach(database => {
      console.log(`   - ${database.name} (${database.sizeOnDisk} bytes)`);
    });
    
    // Check other potential database names
    const otherDBNames = ['test', 'events', 'discovr-prod', 'newyork'];
    for (const dbName of otherDBNames) {
      try {
        const otherDb = client.db(dbName);
        const otherEvents = otherDb.collection('events');
        const count = await otherEvents.countDocuments({});
        
        if (count > 0) {
          console.log(`\n🔍 Database "${dbName}": ${count} events found!`);
          
          // Check if NYC events are in this database
          const nycCount = await otherEvents.countDocuments({
            $or: [
              { 'venue.city': { $regex: 'new york', $options: 'i' } },
              { city: { $regex: 'new york', $options: 'i' } }
            ]
          });
          
          if (nycCount > 0) {
            console.log(`🗽 FOUND ${nycCount} NYC EVENTS IN DATABASE "${dbName}"!`);
            console.log('🎯 This is where our NYC events went!');
          }
        }
      } catch (error) {
        // Database doesn't exist or no access
        console.log(`   ${dbName}: Not accessible`);
      }
    }
    
    console.log('\n🎯 INVESTIGATION COMPLETE');
    console.log('📊 Summary: This shows where NYC events went or why they never arrived');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await client.close();
  }
}

// Run the investigation
investigateMissingNYCEvents();
