/**
 * DATABASE SERVER AUDIT REPORT
 * Comprehensive analysis of all master scraper database configurations
 */

const fs = require('fs');
const path = require('path');

// Database URIs found in the system
const DATABASE_SERVERS = {
  PRODUCTION_MAIN: 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
  PRODUCTION_ALT: 'mongodb+srv://materaccount:materaccount123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr', 
  OLD_CLUSTER: 'mongodb+srv://discovrapp:FZNwIj6DXXNJjhDU@cluster0.yfnbe.mongodb.net/test?retryWrites=true&w=majority',
  LOCAL_FALLBACK: 'mongodb://localhost:27017/discovr'
};

// Import files and their database configurations
const DATABASE_USAGE_MAP = {
  // PRODUCTION_MAIN (discovr123 account) - CONSISTENT ✅
  'working-vancouver-import.js': 'PRODUCTION_MAIN',
  'test-toronto-import-fixed.js': 'PRODUCTION_MAIN', 
  'check-massive-import-success-and-next-steps.js': 'PRODUCTION_MAIN',
  'run-full-toronto-import-victory.js': 'PRODUCTION_MAIN',
  'test-fresh-toronto-import.js': 'PRODUCTION_MAIN',
  'import-toronto-to-cloud-server.js': 'PRODUCTION_MAIN',
  'check-import-results-and-continue.js': 'PRODUCTION_MAIN',
  'massive-toronto-import-victory.js': 'PRODUCTION_MAIN',
  'import-working-toronto-scrapers-production.js': 'PRODUCTION_MAIN',
  
  // PRODUCTION_ALT (materaccount) - INCONSISTENT ⚠️
  'scrapers/fortune-sound/import-fortune-events.js': 'PRODUCTION_ALT',
  
  // OLD_CLUSTER (discovrapp) - OUTDATED ❌
  'import-toronto-events.js': 'OLD_CLUSTER',
  
  // ENVIRONMENT VARIABLE (could be any) - VARIABLE 🔄
  'temp-import-script.js': 'ENV_VARIABLE',
  'Import files/import-all-toronto-events.js': 'ENV_VARIABLE'
};

function generateAuditReport() {
  console.log('🔍 DATABASE SERVER AUDIT REPORT');
  console.log('=====================================\n');
  
  console.log('📊 DATABASE SERVERS IDENTIFIED:');
  console.log('--------------------------------');
  console.log('✅ PRODUCTION_MAIN (discovr123): discovr.vzlnmqb.mongodb.net - RECOMMENDED');
  console.log('⚠️  PRODUCTION_ALT (materaccount): discovr.vzlnmqb.mongodb.net - SECONDARY');
  console.log('❌ OLD_CLUSTER (discovrapp): cluster0.yfnbe.mongodb.net - DEPRECATED');
  console.log('🔄 LOCAL_FALLBACK: localhost:27017 - DEVELOPMENT ONLY\n');
  
  console.log('📋 IMPORT FILES BY DATABASE:');
  console.log('-----------------------------');
  
  // Group by database
  const byDatabase = {};
  Object.entries(DATABASE_USAGE_MAP).forEach(([file, db]) => {
    if (!byDatabase[db]) byDatabase[db] = [];
    byDatabase[db].push(file);
  });
  
  Object.entries(byDatabase).forEach(([db, files]) => {
    const icon = db === 'PRODUCTION_MAIN' ? '✅' : 
                 db === 'PRODUCTION_ALT' ? '⚠️' : 
                 db === 'OLD_CLUSTER' ? '❌' : '🔄';
    console.log(`\n${icon} ${db}:`);
    files.forEach(file => console.log(`   • ${file}`));
  });
  
  console.log('\n🚨 ISSUES FOUND:');
  console.log('----------------');
  console.log('1. ❌ import-toronto-events.js uses DEPRECATED old cluster');
  console.log('2. ⚠️  fortune-sound uses different account (materaccount vs discovr123)');
  console.log('3. 🔄 Some files rely on ENV variables (could be inconsistent)');
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-------------------');
  console.log('1. ✅ Standardize ALL imports to use PRODUCTION_MAIN (discovr123)');
  console.log('2. 🔧 Fix fortune-sound to use consistent credentials');
  console.log('3. 🗑️  Remove/update deprecated old cluster references');
  console.log('4. 🔒 Set ENV variable to PRODUCTION_MAIN for consistency');
  
  console.log('\n🎯 CRITICAL ACTION NEEDED:');
  console.log('-------------------------');
  console.log('• Update fortune-sound/import-fortune-events.js');
  console.log('• Update import-toronto-events.js'); 
  console.log('• Verify all ENV variables point to PRODUCTION_MAIN');
  console.log('• Test all imports after standardization');
}

generateAuditReport();
