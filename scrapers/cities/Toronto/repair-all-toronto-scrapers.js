/**
 * MASS TORONTO SCRAPER REPAIR SYSTEM
 * 
 * Systematically repairs and validates ALL 129 Toronto scrapers to achieve:
 * - 100% syntax validation
 * - Proper city filtering per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
 * - Production-ready anti-bot features
 * - Clean event extraction
 * 
 * Strategy: Apply proven clean scraper template patterns to all existing scrapers
 */

const fs = require('fs');
const path = require('path');

const TORONTO_SCRAPERS_DIR = __dirname;
const EXPECTED_CITY = 'Toronto';

// Proven anti-bot template patterns from our successful clean scrapers
const ANTI_BOT_TEMPLATE = {
  headers: `
// Enhanced anti-bot headers
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getBrowserHeaders = () => ({
  'User-Agent': getRandomUserAgent(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,en-CA;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.google.com/'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
`,
  
  cityValidation: `
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(\`City mismatch! Expected '\${EXPECTED_CITY}', got '\${city}'\`);
  }
`,

  imports: `const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');`
};

async function repairAllTorontoScrapers() {
  console.log('🔧 MASS TORONTO SCRAPER REPAIR SYSTEM');
  console.log('='.repeat(60));

  // Step 1: Get all Toronto scraper files
  console.log('📂 Step 1: Scanning Toronto scrapers directory...');
  const files = fs.readdirSync(TORONTO_SCRAPERS_DIR)
    .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && !file.includes('repair-all'))
    .sort();

  console.log(`📊 Found ${files.length} Toronto scraper files`);

  // Step 2: Analyze current state
  console.log('\n📊 Step 2: Analyzing current scraper state...');
  const analysis = {
    total: files.length,
    syntaxValid: 0,
    syntaxInvalid: 0,
    hasAntiBot: 0,
    hasCityValidation: 0,
    hasUtilImports: 0,
    corrupted: []
  };

  // Step 3: Quick syntax analysis
  for (const file of files) {
    try {
      const filePath = path.join(TORONTO_SCRAPERS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check syntax by attempting to parse
      try {
        new (require('vm').Script)(content);
        analysis.syntaxValid++;
      } catch (syntaxError) {
        analysis.syntaxInvalid++;
      }

      // Check for modern features
      if (content.includes('getRandomUserAgent') || content.includes('getBrowserHeaders')) {
        analysis.hasAntiBot++;
      }
      
      if (content.includes('City mismatch!') || content.includes('EXPECTED_CITY')) {
        analysis.hasCityValidation++;
      }
      
      if (content.includes('generateEventId') && content.includes('extractCategories')) {
        analysis.hasUtilImports++;
      }

      // Check for heavy corruption
      if (content.length < 500 || !content.includes('function') || !content.includes('module.exports')) {
        analysis.corrupted.push(file);
      }

    } catch (error) {
      analysis.corrupted.push(file);
    }
  }

  // Step 4: Report current state
  console.log('\n📈 CURRENT STATE ANALYSIS:');
  console.log(`📁 Total scrapers: ${analysis.total}`);
  console.log(`✅ Syntax valid: ${analysis.syntaxValid} (${Math.round((analysis.syntaxValid/analysis.total)*100)}%)`);
  console.log(`❌ Syntax invalid: ${analysis.syntaxInvalid} (${Math.round((analysis.syntaxInvalid/analysis.total)*100)}%)`);
  console.log(`🤖 Has anti-bot features: ${analysis.hasAntiBot} (${Math.round((analysis.hasAntiBot/analysis.total)*100)}%)`);
  console.log(`🏙️ Has city validation: ${analysis.hasCityValidation} (${Math.round((analysis.hasCityValidation/analysis.total)*100)}%)`);
  console.log(`🔧 Has util imports: ${analysis.hasUtilImports} (${Math.round((analysis.hasUtilImports/analysis.total)*100)}%)`);
  console.log(`💥 Severely corrupted: ${analysis.corrupted.length}`);

  if (analysis.corrupted.length > 0) {
    console.log('\n💥 SEVERELY CORRUPTED FILES:');
    analysis.corrupted.slice(0, 10).forEach(file => console.log(`   - ${file}`));
    if (analysis.corrupted.length > 10) {
      console.log(`   ... and ${analysis.corrupted.length - 10} more`);
    }
  }

  return analysis;
}

async function createMassRepairPlan(analysis) {
  console.log('\n🎯 CREATING MASS REPAIR STRATEGY...');

  const strategy = {
    phase1: 'Fix severely corrupted files using clean templates',
    phase2: 'Apply systematic syntax fixes to remaining files',
    phase3: 'Add missing modern features (anti-bot, city validation)',
    phase4: 'Validate all scrapers and create master orchestrator',
    
    priorities: [
      { category: 'Clean Templates Ready', count: analysis.hasAntiBot },
      { category: 'Need Anti-Bot Features', count: analysis.total - analysis.hasAntiBot },
      { category: 'Need City Validation', count: analysis.total - analysis.hasCityValidation },
      { category: 'Need Util Imports', count: analysis.total - analysis.hasUtilImports },
      { category: 'Need Complete Rebuild', count: analysis.corrupted.length }
    ]
  };

  console.log('\n📋 REPAIR STRATEGY:');
  console.log(`🔄 Phase 1: ${strategy.phase1}`);
  console.log(`🔧 Phase 2: ${strategy.phase2}`);
  console.log(`🚀 Phase 3: ${strategy.phase3}`);
  console.log(`✅ Phase 4: ${strategy.phase4}`);

  console.log('\n📊 REPAIR PRIORITIES:');
  strategy.priorities.forEach((priority, index) => {
    console.log(`${index + 1}. ${priority.category}: ${priority.count} scrapers`);
  });

  return strategy;
}

// Run analysis if this script is executed directly
if (require.main === module) {
  repairAllTorontoScrapers()
    .then(analysis => createMassRepairPlan(analysis))
    .then(() => {
      console.log('\n🚀 READY TO BEGIN MASS REPAIR!');
      console.log('Next: Execute repair phases systematically');
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  repairAllTorontoScrapers,
  createMassRepairPlan,
  ANTI_BOT_TEMPLATE
};
