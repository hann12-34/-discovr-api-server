/**
 * MongoDB Network Access Test
 * 
 * This script tests if IP whitelist restrictions are causing MongoDB connection issues
 */

const https = require('https');
const dns = require('dns');
const { promisify } = require('util');
const { exec } = require('child_process');

const dnsLookup = promisify(dns.lookup);
const execPromise = promisify(exec);

// MongoDB Atlas hostname to test
const MONGODB_HOST = 'discovr.vzlnmqb.mongodb.net';

async function checkNetworkAccess() {
  console.log('🔍 MongoDB Network Access Test');
  console.log('=============================');
  
  try {
    // Step 1: DNS resolution
    console.log(`\nStep 1: DNS resolution for ${MONGODB_HOST}`);
    try {
      const dnsResult = await dnsLookup(MONGODB_HOST);
      console.log(`✅ DNS resolution successful: ${MONGODB_HOST} -> ${dnsResult.address}`);
    } catch (error) {
      console.log(`❌ DNS resolution failed: ${error.message}`);
      console.log('This suggests a DNS issue or the MongoDB Atlas cluster URL is incorrect');
      return false;
    }
    
    // Step 2: Basic connectivity test (TCP connection)
    console.log('\nStep 2: Testing MongoDB standard port connectivity');
    try {
      // MongoDB standard port is 27017, but Atlas uses a gateway for SSL connections
      const httpsResponse = await testHttpsConnection(MONGODB_HOST);
      console.log(`✅ HTTPS connection to ${MONGODB_HOST} successful (status ${httpsResponse})`);
    } catch (error) {
      console.log(`❌ HTTPS connection failed: ${error.message}`);
      console.log('This suggests connectivity or IP whitelist issues');
    }
    
    // Step 3: Get current IP address
    console.log('\nStep 3: Determining current public IP address');
    try {
      const ipifyResponse = await new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', (e) => reject(e));
      });
      
      console.log(`Current public IP address: ${ipifyResponse}`);
      console.log('✅ Make sure this IP is allowed in MongoDB Atlas Network Access settings');
      console.log('   For testing, consider allowing all IPs (0.0.0.0/0) temporarily');
    } catch (error) {
      console.log(`❌ Could not determine current IP: ${error.message}`);
    }
    
    // Step 4: Check for firewall or proxy issues
    console.log('\nStep 4: Checking for connection blockages');
    try {
      const tracerouteResult = await execPromise(`traceroute -m 15 ${MONGODB_HOST}`);
      console.log('Traceroute results:');
      console.log(tracerouteResult.stdout.split('\n').slice(0, 10).join('\n') + '...');
    } catch (error) {
      console.log(`Traceroute not available or failed: ${error.message}`);
    }

    console.log('\n📋 Network Access Test Summary:');
    console.log('1. When deploying to Cloud Run, IP whitelist is the most likely issue');
    console.log('2. Cloud Run uses dynamic IPs that change frequently');
    console.log('3. MongoDB Atlas whitelist should allow 0.0.0.0/0 for Cloud Run access');
    console.log('4. To fix: Log into MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere');
    
    return true;
  } catch (error) {
    console.error('Network test failed:', error);
    return false;
  }
}

async function testHttpsConnection(host) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000,
    }, (res) => {
      resolve(res.statusCode);
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });
    
    req.end();
  });
}

checkNetworkAccess().catch(console.error);
