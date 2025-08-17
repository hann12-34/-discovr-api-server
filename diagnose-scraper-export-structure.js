/**
 * 🔍 DIAGNOSE SCRAPER EXPORT STRUCTURE FAILURE
 * 
 * CRITICAL ISSUE: ALL 158 Toronto scrapers fail with:
 * "No valid scrape function found in module"
 * 
 * This suggests the orchestrator expects one function name,
 * but scrapers export a different function name.
 */

const fs = require('fs');
const path = require('path');

function diagnoseScraperExportStructure() {
    console.log('🔍 DIAGNOSING SCRAPER EXPORT STRUCTURE FAILURE\n');
    console.log('🚨 CRITICAL: ALL 158 Toronto scrapers fail to load\n');
    
    const torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    const orchestratorPath = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto/scrape-all-toronto-clean.js';
    
    console.log('🔍 STEP 1: Check what orchestrator expects...\n');
    
    if (fs.existsSync(orchestratorPath)) {
        console.log('📄 Analyzing orchestrator requirements:');
        const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf8');
        
        // Look for function calls/requirements
        const functionCalls = [
            /scraper\.scrape\(/g,
            /scraper\.scrapeEvents\(/g,
            /module\.scrape\(/g,
            /module\.scrapeEvents\(/g,
            /\.scrape\(/g,
            /\.scrapeEvents\(/g
        ];
        
        functionCalls.forEach((pattern, i) => {
            const matches = orchestratorContent.match(pattern);
            if (matches) {
                console.log(`   Found pattern ${i+1}: ${pattern.source} (${matches.length} matches)`);
            }
        });
        
        // Look for require/import patterns
        const requirePatterns = orchestratorContent.match(/require\([^)]+\)/g) || [];
        console.log(`   Require patterns: ${requirePatterns.length}`);
        requirePatterns.slice(0, 3).forEach(pattern => {
            console.log(`     ${pattern}`);
        });
        
    } else {
        console.log('❌ Orchestrator file not found');
    }
    
    console.log('\n🔍 STEP 2: Check what scrapers actually export...\n');
    
    if (!fs.existsSync(torontoDir)) {
        console.log('❌ Toronto directory not found');
        return;
    }
    
    const files = fs.readdirSync(torontoDir).filter(file => 
        file.endsWith('.js') && 
        file.startsWith('scrape-') &&
        !file.includes('all-toronto')
    );
    
    console.log(`📂 Found ${files.length} scraper files to analyze`);
    
    const exportPatterns = {};
    
    // Check first 10 scrapers for export patterns
    for (let i = 0; i < Math.min(10, files.length); i++) {
        const file = files[i];
        const filePath = path.join(torontoDir, file);
        
        console.log(`\n📄 Analyzing: ${file}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Look for export patterns
            const exports = [
                /module\.exports\s*=\s*\{[^}]*scrape[^}]*\}/g,
                /module\.exports\s*=\s*\{[^}]*scrapeEvents[^}]*\}/g,
                /exports\.scrape\s*=/g,
                /exports\.scrapeEvents\s*=/g,
                /module\.exports\s*=\s*scrape/g,
                /module\.exports\s*=\s*scrapeEvents/g
            ];
            
            let foundExport = false;
            exports.forEach((pattern, j) => {
                const matches = content.match(pattern);
                if (matches) {
                    console.log(`   ✅ Export pattern ${j+1}: ${pattern.source}`);
                    foundExport = true;
                    
                    const patternKey = pattern.source;
                    exportPatterns[patternKey] = (exportPatterns[patternKey] || 0) + 1;
                }
            });
            
            if (!foundExport) {
                // Look for any module.exports
                const anyExports = content.match(/module\.exports\s*=\s*[^;]+/g);
                if (anyExports) {
                    console.log(`   ⚠️ Found exports: ${anyExports[0].substring(0, 50)}...`);
                } else {
                    console.log(`   ❌ No exports found`);
                }
            }
            
            // Check if it can be required
            try {
                delete require.cache[require.resolve(filePath)];
                const module = require(filePath);
                
                console.log(`   📦 Module exports:`, Object.keys(module));
                
                if (typeof module === 'function') {
                    console.log(`   📦 Module is a function`);
                }
                
                if (module.scrape) {
                    console.log(`   ✅ Has .scrape function`);
                }
                
                if (module.scrapeEvents) {
                    console.log(`   ✅ Has .scrapeEvents function`);
                }
                
            } catch (error) {
                console.log(`   ❌ Cannot require: ${error.message}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Cannot read file: ${error.message}`);
        }
    }
    
    console.log('\n📊 EXPORT PATTERN SUMMARY:');
    Object.entries(exportPatterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} files`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DIAGNOSIS COMPLETE!');
    console.log('='.repeat(70));
    console.log('🎯 The orchestrator expects one function name');
    console.log('🎯 But scrapers export a different function name');
    console.log('🔧 Fix: Align orchestrator expectations with scraper exports');
    
    console.log('\n💡 SOLUTION APPROACHES:');
    console.log('1. 🔧 Update orchestrator to use correct function name');
    console.log('2. 🔄 Update all scrapers to export expected function name');
    console.log('3. 🎯 Create wrapper to bridge the gap');
}

diagnoseScraperExportStructure();
