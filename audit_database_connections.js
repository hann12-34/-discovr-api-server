/**
 * 🚨 URGENT: AUDIT ALL DATABASE CONNECTIONS
 * 
 * Problem: App shows 2,670 events but database has 4,488 events
 * This means multiple databases exist and we're not all using the same one
 * 
 * This script will audit:
 * 1. What database scrapers are writing to
 * 2. What database my scripts connect to  
 * 3. What database the production API uses
 * 4. What database/API the app connects to
 */

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function auditDatabaseConnections() {
  try {
    console.log('🚨 URGENT DATABASE CONNECTION AUDIT\n');
    console.log('❓ Problem: App shows 2,670 events but database has 4,488 events');
    console.log('🎯 Goal: Find all databases and identify which one app uses\n');

    // STEP 1: Check environment variables
    console.log('📋 STEP 1: ENVIRONMENT VARIABLES');
    console.log('=' .repeat(50));
    console.log('Current .env file contents:');
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      console.log(envContent);
    } catch (error) {
      console.log('❌ No .env file found or error reading it');
    }
    
    console.log('\nEnvironment variables in process.env:');
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI || 'NOT SET'}`);
    console.log(`PRODUCTION_MONGODB_URI: ${process.env.PRODUCTION_MONGODB_URI || 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);

    // STEP 2: Test connection to our current database
    console.log('\n🔌 STEP 2: TEST CURRENT DATABASE CONNECTION');
    console.log('=' .repeat(50));
    
    const currentURI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;
    console.log(`Connecting to: ${currentURI?.replace(/\/\/.*@/, '//<credentials>@') || 'NONE'}`);
    
    await mongoose.connect(currentURI);
    const Event = require('./models/Event');
    
    const ourTotal = await Event.countDocuments({});
    console.log(`📊 Our database total: ${ourTotal} events`);
    
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    console.log('\n🏙️ Our database city breakdown:');
    for (const city of cities) {
      const count = await Event.countDocuments({'venue.name': new RegExp(city, 'i')});
      console.log(`   ${city}: ${count} events`);
    }

    // STEP 3: Check if production API server is using a different URI
    console.log('\n🌐 STEP 3: CHECK PRODUCTION SERVER CONFIG');
    console.log('=' .repeat(50));
    
    // Check unified-proxy-server.js for MongoDB connection
    try {
      const serverCode = fs.readFileSync('unified-proxy-server.js', 'utf8');
      const mongooseConnections = serverCode.match(/mongoose\.connect\([^)]+\)/g);
      console.log('Production server MongoDB connections found:');
      if (mongooseConnections) {
        mongooseConnections.forEach((conn, i) => {
          console.log(`${i + 1}. ${conn}`);
        });
      } else {
        console.log('❌ No mongoose.connect found in unified-proxy-server.js');
      }
    } catch (error) {
      console.log('❌ Could not read unified-proxy-server.js');
    }

    // STEP 4: Check what the app is actually connecting to
    console.log('\n📱 STEP 4: APP CONNECTION ANALYSIS');
    console.log('=' .repeat(50));
    console.log('App is connecting to: https://discovr-proxy-server.onrender.com');
    console.log('Expected app results based on our data:');
    console.log(`   Total: ${ourTotal} events`);
    console.log('Actual app results:');
    console.log('   Total: 2,670 events');
    console.log('   Montreal: 158 events');
    console.log('   New York: 208 events');
    
    if (ourTotal === 2670) {
      console.log('✅ SAME TOTAL - but city breakdowns dont match (filtering issue)');
    } else {
      console.log('❌ DIFFERENT TOTAL - completely different databases!');
    }

    // STEP 5: Compare with user's scraper results
    console.log('\n🏗️ STEP 5: SCRAPER VS OUR DATABASE COMPARISON');
    console.log('=' .repeat(50));
    console.log('User\'s fresh scraper results:');
    console.log('   Total: 4,488 events');
    console.log('   Toronto: 932 events');
    console.log('   New York: 761 events');
    
    console.log('\nOur database results:');
    console.log(`   Total: ${ourTotal} events`);
    
    if (ourTotal === 4488) {
      console.log('✅ SCRAPERS ARE WRITING TO OUR DATABASE');
    } else {
      console.log('❌ SCRAPERS ARE WRITING TO A DIFFERENT DATABASE!');
    }

    console.log('\n🚨 CRITICAL CONCLUSIONS:');
    console.log('=' .repeat(50));
    
    if (ourTotal !== 4488 && ourTotal !== 2670) {
      console.log('❌ THREE DIFFERENT DATABASES CONFIRMED:');
      console.log(`   1. Scrapers database: 4,488 events`);
      console.log(`   2. Our scripts database: ${ourTotal} events`);
      console.log(`   3. App/Render database: 2,670 events`);
    } else if (ourTotal === 4488) {
      console.log('✅ We connect to same DB as scrapers');
      console.log('❌ But app connects to different DB (Render production)');
    } else if (ourTotal === 2670) {
      console.log('✅ We connect to same DB as app');
      console.log('❌ But scrapers write to different DB');
    }
    
    console.log('\n💡 IMMEDIATE ACTIONS NEEDED:');
    console.log('1. 🎯 Identify which database the app actually uses');
    console.log('2. 🔄 Point all scripts to the same database');
    console.log('3. 🚀 Apply fixes to the correct production database');
    console.log('4. 📊 Verify all systems use the same data source');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

// Run the audit
auditDatabaseConnections().catch(console.error);
