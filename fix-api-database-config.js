/**
 * 🔧 FIX API DATABASE CONFIGURATION
 * 
 * Mobile app shows 404 API error after database cleanup.
 * This means we cleared the database the API was actually using!
 * 
 * Need to:
 * 1. Check what database the API server is configured to use
 * 2. Update it to use 'discovr' (the one with 681 events)
 * 3. Restart API server if needed
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
const TARGET_DB = 'discovr'; // The database with 681 events

async function fixApiDatabaseConfig() {
    console.log('🔧 FIXING API DATABASE CONFIGURATION\n');
    console.log('🚨 Mobile app shows 404 API error - we cleared the wrong database!\n');
    
    // First, verify 'discovr' database has events
    console.log('🔍 STEP 1: Verify "discovr" database has events...\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const db = mongoose.connection.client.db(TARGET_DB);
    const collection = db.collection('events');
    
    const eventCount = await collection.countDocuments();
    console.log(`📊 Database "${TARGET_DB}" has ${eventCount} events`);
    
    if (eventCount === 0) {
        console.log('❌ ERROR: Target database is empty! Need to restore data.');
        await mongoose.disconnect();
        return;
    }
    
    // Check a few sample events
    const sampleEvents = await collection.find({}).limit(3).toArray();
    console.log('\n📋 Sample events in target database:');
    sampleEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. "${event.title}" in ${event.city}`);
    });
    
    await mongoose.disconnect();
    
    console.log('\n🔧 STEP 2: Update API server configuration...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    // Check unified-proxy-server.js configuration
    const serverFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/unified-proxy-server.js';
    
    if (fs.existsSync(serverFile)) {
        console.log('📄 Found unified-proxy-server.js - checking database configuration...');
        
        let content = fs.readFileSync(serverFile, 'utf8');
        
        // Look for the database configuration line
        const dbConfigRegex = /cloudClient\.db\(['"`]([^'"`]+)['"`]\)/;
        const match = content.match(dbConfigRegex);
        
        if (match) {
            const currentDb = match[1];
            console.log(`🔍 Current API server database: "${currentDb}"`);
            
            if (currentDb !== TARGET_DB) {
                console.log(`🔧 Updating database from "${currentDb}" to "${TARGET_DB}"...`);
                
                // Update the database name
                const updatedContent = content.replace(
                    dbConfigRegex,
                    `cloudClient.db('${TARGET_DB}')`
                );
                
                // Also update any comments referencing the old database
                const finalContent = updatedContent.replace(
                    /Use the same database as imports \([^)]+\)/,
                    `Use the same database as imports (${TARGET_DB})`
                );
                
                // Write the updated file
                fs.writeFileSync(serverFile, finalContent);
                console.log(`✅ Updated API server to use "${TARGET_DB}" database`);
                
                // Show the change
                console.log('\n📝 Configuration change made:');
                console.log(`   Before: cloudClient.db('${currentDb}')`);
                console.log(`   After:  cloudClient.db('${TARGET_DB}')`);
                
            } else {
                console.log(`✅ API server already configured for "${TARGET_DB}"`);
            }
        } else {
            console.log('❌ Could not find database configuration in server file');
        }
    } else {
        console.log('❌ unified-proxy-server.js not found');
    }
    
    // Check .env file
    const envFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/.env';
    
    if (fs.existsSync(envFile)) {
        console.log('\n📄 Checking .env file...');
        
        let envContent = fs.readFileSync(envFile, 'utf8');
        
        // Check for DATABASE_NAME
        if (envContent.includes('DATABASE_NAME')) {
            console.log('🔧 Updating DATABASE_NAME in .env...');
            
            const updatedEnvContent = envContent.replace(
                /DATABASE_NAME=.*/,
                `DATABASE_NAME=${TARGET_DB}`
            );
            
            fs.writeFileSync(envFile, updatedEnvContent);
            console.log(`✅ Updated .env DATABASE_NAME to "${TARGET_DB}"`);
        } else {
            // Add DATABASE_NAME if it doesn't exist
            console.log('➕ Adding DATABASE_NAME to .env...');
            envContent += `\nDATABASE_NAME=${TARGET_DB}\n`;
            fs.writeFileSync(envFile, envContent);
            console.log(`✅ Added DATABASE_NAME="${TARGET_DB}" to .env`);
        }
    } else {
        console.log('\n⚠️ .env file not found');
    }
    
    console.log('\n🚀 STEP 3: Test API endpoint...\n');
    
    // Test the API endpoint
    try {
        const https = require('https');
        const apiUrl = 'https://discovr-proxy-server.onrender.com/api/v1/venues/events/all';
        
        console.log(`🌐 Testing API endpoint: ${apiUrl}`);
        
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Request timeout')), 10000);
            
            https.get(apiUrl, (res) => {
                clearTimeout(timeout);
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            }).on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
        
        console.log(`📊 API Response Status: ${response.status}`);
        
        if (response.status === 200) {
            const apiData = JSON.parse(response.data);
            const apiEvents = apiData.events || apiData || [];
            console.log(`✅ API returned ${apiEvents.length} events`);
            
            if (apiEvents.length > 0) {
                console.log('🎉 API is working! Mobile app should now work.');
            } else {
                console.log('⚠️ API returned 0 events - may need server restart');
            }
        } else if (response.status === 404) {
            console.log('❌ Still getting 404 - server may need restart');
        } else {
            console.log(`⚠️ Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.log(`❌ API test failed: ${error.message}`);
        console.log('⚠️ API server may need restart to pick up new configuration');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 API DATABASE CONFIGURATION FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ API server configured to use "${TARGET_DB}" database`);
    console.log(`📊 Target database has ${eventCount} events`);
    console.log(`📱 Mobile app should now work properly`);
    console.log(`\n🔄 If mobile app still shows 404, the API server may need restart`);
    console.log(`🚀 Try refreshing the mobile app now!`);
}

fixApiDatabaseConfig().catch(console.error);
