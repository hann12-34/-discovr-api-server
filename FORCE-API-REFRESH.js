#!/usr/bin/env node

/**
 * FORCE API TO SERVE FRESH DATABASE DATA
 * This will keep hitting the API until it serves clean data
 */

const https = require('https');

function checkAPI() {
  return new Promise((resolve, reject) => {
    const url = 'https://discovr-proxy-server.onrender.com/api/v1/events?city=New%20York&limit=100';
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const events = json.events || [];
          
          // Check for junk
          const hasEcovadis = events.some(e => /ecovadis/i.test(e.title || ''));
          const hasVortxz = events.some(e => /vortxz/i.test(e.title || ''));
          const hasNuovo = events.some(e => /nuovo/i.test(e.title || ''));
          const hasThu = events.some(e => /^thu,/i.test(e.title || ''));
          
          const isClean = !hasEcovadis && !hasVortxz && !hasNuovo && !hasThu;
          
          resolve({
            total: events.length,
            isClean,
            hasJunk: !isClean
          });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function forceRefresh() {
  console.log('🔄 FORCING API REFRESH...\n');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const result = await checkAPI();
      
      console.log(`Attempt ${attempts}: ${result.total} events, Clean: ${result.isClean ? '✅' : '❌'}`);
      
      if (result.isClean && result.total > 400) {
        console.log('\n✅ SUCCESS! API is now serving CLEAN data!');
        console.log(`   Total events: ${result.total}`);
        console.log('\n🎉 Your iOS app should now work!');
        console.log('   Force quit and restart the app.\n');
        return;
      }
      
      if (result.hasJunk) {
        console.log('   ❌ Still has junk - waiting for cache to clear...');
      }
      
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
    
    // Wait 10 seconds between attempts
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log('\n❌ API still not serving clean data after 30 attempts');
  console.log('   The Render deployment may not have completed yet.\n');
}

forceRefresh();
