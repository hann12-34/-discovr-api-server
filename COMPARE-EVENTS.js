#!/usr/bin/env node

require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI);
  await client.connect();
  const events = client.db('discovr').collection('events');
  
  // Get the 2 events that ARE showing
  const showing = await events.find({ 
    title: { $in: ['NO BROKE BOYS, NO NEW FRIENDS - NYE 2026', 'THIS NEVER HAPPENED - oCULA, mYRNE & ROBBY EAST'] }
  }).toArray();
  
  // Get one that's NOT showing
  const notShowing = await events.findOne({ 
    source: 'Celebrities Nightclub',
    title: 'KETTAMA'
  });
  
  console.log('🔍 COMPARING EVENTS THAT SHOW vs DON\'T SHOW:\n');
  
  console.log('✅ SHOWING (example):');
  const s = showing[0];
  console.log(`  Title: ${s.title}`);
  console.log(`  Date: ${s.date} (type: ${typeof s.date})`);
  console.log(`  StartDate: ${s.startDate} (type: ${typeof s.startDate})`);
  console.log(`  City: ${s.city}`);
  console.log(`  Category: ${s.category}`);
  console.log(`  Source: ${s.source}`);
  console.log(`  ID: ${s.id}`);
  console.log(`  Title length: ${s.title.length}`);
  
  console.log('\n❌ NOT SHOWING:');
  console.log(`  Title: ${notShowing.title}`);
  console.log(`  Date: ${notShowing.date} (type: ${typeof notShowing.date})`);
  console.log(`  StartDate: ${notShowing.startDate} (type: ${typeof notShowing.startDate})`);
  console.log(`  City: ${notShowing.city}`);
  console.log(`  Category: ${notShowing.category}`);
  console.log(`  Source: ${notShowing.source}`);
  console.log(`  ID: ${notShowing.id}`);
  console.log(`  Title length: ${notShowing.title.length}`);
  
  console.log('\n🔑 ANALYZING DIFFERENCES:');
  
  // Check if there are field differences
  const showingKeys = new Set(Object.keys(showing[0]));
  const notShowingKeys = new Set(Object.keys(notShowing));
  
  const onlyInShowing = [...showingKeys].filter(k => !notShowingKeys.has(k));
  const onlyInNotShowing = [...notShowingKeys].filter(k => !showingKeys.has(k));
  
  if (onlyInShowing.length > 0) {
    console.log(`  Fields ONLY in showing event: ${onlyInShowing.join(', ')}`);
  }
  if (onlyInNotShowing.length > 0) {
    console.log(`  Fields ONLY in NOT showing event: ${onlyInNotShowing.join(', ')}`);
  }
  
  // Check if showing events have older timestamps
  console.log(`\n  Showing _id timestamp: ${showing[0]._id.getTimestamp()}`);
  console.log(`  Not showing _id timestamp: ${notShowing._id.getTimestamp()}`);
  
  // Compare ALL 31 events creation times
  const allCelebs = await events.find({ source: 'Celebrities Nightclub' }).toArray();
  console.log('\n📅 ALL CELEBRITIES EVENTS BY CREATION TIME:');
  allCelebs.sort((a, b) => a._id.getTimestamp() - b._id.getTimestamp()).forEach((e, i) => {
    const isShowing = showing.some(s => s._id.equals(e._id));
    console.log(`  ${isShowing ? '✅' : '❌'} ${e.title.substring(0, 40)} - Created: ${e._id.getTimestamp().toISOString().split('T')[0]}`);
  });
  
  await client.close();
})();
