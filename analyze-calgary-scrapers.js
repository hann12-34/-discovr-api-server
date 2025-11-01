/**
 * ANALYZE CALGARY SCRAPERS
 * Separate real scrapers from stubs/templates
 */

const fs = require('fs');
const path = require('path');

const calgaryDir = 'scrapers/cities/Calgary';
const files = fs.readdirSync(calgaryDir).filter(f => 
  f.endsWith('.js') && !f.includes('test') && !f.includes('backup')
);

console.log('🔍 ANALYZING CALGARY SCRAPERS\n');
console.log('='.repeat(80));

const categories = {
  real: [],
  stubs: [],
  templates: [],
  needsDateExtraction: []
};

files.forEach(file => {
  const filePath = path.join(calgaryDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  
  // Categorize based on content
  const isTemplate = file.includes('template') || file.includes('boilerplate');
  const isIndex = file === 'index.js';
  const isStub = content.includes('TODO') && lines < 50;
  const isEmpty = lines < 20;
  const hasScrapingLogic = content.includes('axios') || content.includes('cheerio') || content.includes('puppeteer');
  const hasDateExtraction = content.includes('dateText') || content.includes('dateSelectors') || content.includes('parseDate');
  const hasEventsReturn = content.includes('events.push') || content.includes('return events');
  
  const info = {
    file,
    lines,
    hasScrapingLogic,
    hasDateExtraction,
    hasEventsReturn,
    isEmpty
  };
  
  if (isTemplate || isIndex) {
    categories.templates.push(info);
  } else if (isEmpty || isStub || !hasScrapingLogic) {
    categories.stubs.push(info);
  } else if (hasScrapingLogic && !hasDateExtraction) {
    categories.needsDateExtraction.push(info);
  } else {
    categories.real.push(info);
  }
});

console.log(`📊 CALGARY SCRAPERS BREAKDOWN:\n`);
console.log(`✅ Real scrapers with date extraction: ${categories.real.length}`);
console.log(`🔧 Need date extraction added: ${categories.needsDateExtraction.length}`);
console.log(`📝 Stub files (minimal/incomplete): ${categories.stubs.length}`);
console.log(`📄 Templates/Index files: ${categories.templates.length}`);
console.log(`📊 TOTAL: ${files.length}`);

console.log(`\n${'='.repeat(80)}`);

console.log(`\n🔧 SCRAPERS THAT NEED DATE EXTRACTION (${categories.needsDateExtraction.length}):\n`);
categories.needsDateExtraction.forEach(s => {
  console.log(`   ${s.file} (${s.lines} lines, ${s.hasEventsReturn ? 'returns events' : 'no events'})`);
});

console.log(`\n📝 STUB FILES (${categories.stubs.length}):\n`);
categories.stubs.slice(0, 20).forEach(s => {
  console.log(`   ${s.file} (${s.lines} lines)`);
});
if (categories.stubs.length > 20) {
  console.log(`   ... and ${categories.stubs.length - 20} more`);
}

// Save for processing
fs.writeFileSync('calgary-analysis.json', JSON.stringify(categories, null, 2));

console.log(`\n${'='.repeat(80)}`);
console.log('\n💡 RECOMMENDATION:');
console.log(`1. Fix ${categories.needsDateExtraction.length} scrapers that need date extraction`);
console.log(`2. Clean up ${categories.stubs.length} stub files (delete or complete them)`);
console.log('\n✅ Saved to calgary-analysis.json');
