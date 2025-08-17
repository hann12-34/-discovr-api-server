/**
 * 🔍 DIAGNOSE PRODUCTION ENVIRONMENT ISSUE
 * 
 * CRITICAL INSIGHT: Production server responds but says "No events found"
 * This means server is running but looking in wrong place for events!
 * 
 * Possible issues:
 * 1. Production environment uses different DATABASE_NAME
 * 2. Production environment uses different COLLECTION_NAME  
 * 3. Production environment has different MONGODB_URI
 * 4. Production server has cached old configuration
 */

const mongoose = require('mongoose');

const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function diagnoseProductionEnvironment() {
    console.log('🔍 DIAGNOSING PRODUCTION ENVIRONMENT ISSUE\n');
    console.log('🚨 Production server says "No events found" despite 681 events in discovr database!\n');
    
    await mongoose.connect(PRODUCTION_URI);
    const client = mongoose.connection.client;
    
    console.log('🗂️ STEP 1: Check ALL databases and their events...\n');
    
    // List all databases and their events
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    
    console.log('📊 ALL DATABASES WITH EVENTS:');
    
    for (const dbInfo of dbList.databases) {
        const dbName = dbInfo.name;
        
        if (dbName !== 'admin' && dbName !== 'local' && dbName !== 'config' && dbName !== 'sample_mflix') {
            try {
                const database = client.db(dbName);
                const collections = await database.listCollections().toArray();
                
                for (const collection of collections) {
                    if (collection.name === 'events') {
                        const eventsCount = await database.collection('events').countDocuments();
                        console.log(`   ${dbName}.events: ${eventsCount} events`);
                        
                        if (eventsCount > 0) {
                            // Sample events
                            const sample = await database.collection('events').find({}).limit(2).toArray();
                            sample.forEach((event, i) => {
                                console.log(`     Sample ${i+1}: "${event.title}" in ${event.city}`);
                            });
                        }
                    }
                }
            } catch (error) {
                console.log(`   ${dbName}: Cannot access`);
            }
        }
    }
    
    console.log('\n🔧 STEP 2: Check current server configuration...\n');
    
    const fs = require('fs');
    
    // Check the actual server file for database configuration
    const serverFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/unified-proxy-server.js';
    
    if (fs.existsSync(serverFile)) {
        const content = fs.readFileSync(serverFile, 'utf8');
        
        // Extract database configuration
        const dbMatch = content.match(/cloudClient\.db\(['"`]([^'"`]+)['"`]\)/);
        const mongoUriMatch = content.match(/MONGODB_URI.*=.*['"`]([^'"`]+)['"`]/);
        
        console.log('📄 LOCAL SERVER CONFIGURATION:');
        if (dbMatch) {
            console.log(`   Database: "${dbMatch[1]}"`);
        }
        console.log('   Collection: "events" (hardcoded)');
        
        // Check .env file
        const envFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/.env';
        if (fs.existsSync(envFile)) {
            console.log('\n📄 LOCAL .ENV CONFIGURATION:');
            const envContent = fs.readFileSync(envFile, 'utf8');
            
            const dbNameMatch = envContent.match(/DATABASE_NAME=(.+)/);
            const mongoUriEnvMatch = envContent.match(/MONGODB_URI=(.+)/);
            
            if (dbNameMatch) {
                console.log(`   DATABASE_NAME: "${dbNameMatch[1]}"`);
            }
            if (mongoUriEnvMatch) {
                console.log(`   MONGODB_URI: ${mongoUriEnvMatch[1].substring(0, 50)}...`);
            }
        }
    }
    
    console.log('\n🌐 STEP 3: Test production API endpoint to see what it\'s actually doing...\n');
    
    // Test various potential endpoints
    const endpoints = [
        '/api/v1/venues/events/all',
        '/api/v1/events',
        '/api/v1/events/all',
        '/api/health',
        '/api/v1/health'
    ];
    
    const https = require('https');
    
    for (const endpoint of endpoints) {
        const fullUrl = `https://discovr-proxy-server.onrender.com${endpoint}`;
        console.log(`🌐 Testing: ${fullUrl}`);
        
        try {
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                
                https.get(fullUrl, (res) => {
                    clearTimeout(timeout);
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
                }).on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            console.log(`   Status: ${response.status}`);
            
            if (response.status === 200) {
                try {
                    const jsonData = JSON.parse(response.data);
                    if (Array.isArray(jsonData)) {
                        console.log(`   ✅ SUCCESS: ${jsonData.length} events returned`);
                    } else if (jsonData.events) {
                        console.log(`   ✅ SUCCESS: ${jsonData.events.length} events returned`);
                    } else {
                        console.log(`   📋 Data structure: ${Object.keys(jsonData)}`);
                    }
                } catch (parseError) {
                    console.log(`   📄 Non-JSON response: ${response.data.substring(0, 100)}...`);
                }
            } else if (response.status === 404) {
                console.log(`   ❌ 404: ${response.data}`);
            } else {
                console.log(`   ⚠️ Status ${response.status}: ${response.data.substring(0, 100)}...`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log(''); // Empty line
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DIAGNOSIS COMPLETE!');
    console.log('='.repeat(70));
    console.log('🔍 Check which database actually has events vs what production server uses');
    console.log('🔧 Production server configuration may differ from local configuration');
    console.log('📱 Fix the mismatch to restore mobile app functionality');
    
    console.log('\n💡 LIKELY CAUSES:');
    console.log('1. Production server uses different DATABASE_NAME environment variable');
    console.log('2. Production server has cached old configuration');
    console.log('3. Production server collection name is different');
    console.log('4. Production server MongoDB URI points to different cluster');
}

diagnoseProductionEnvironment().catch(console.error);
