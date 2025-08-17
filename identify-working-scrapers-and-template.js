/**
 * 🔍 IDENTIFY WORKING SCRAPERS AND CREATE TEMPLATE
 * 
 * Find the 5 Toronto scrapers that work in orchestrator context
 * Analyze their structure and create a template for manual repair
 */

const fs = require('fs');
const path = require('path');

async function identifyWorkingScrapersAndTemplate() {
    console.log('🔍 IDENTIFYING WORKING SCRAPERS AND CREATING TEMPLATE\n');
    
    const torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    
    try {
        console.log('📁 Scanning for orchestrator-compatible scrapers...');
        const files = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('validate-') && !file.includes('repair') && !file.includes('scrape-all-toronto'))
            .sort();
        
        console.log(`📊 Testing ${files.length} Toronto scraper files for orchestrator compatibility...\n`);
        
        const workingScrapers = [];
        const brokenScrapers = [];
        
        for (const file of files) {
            const filePath = path.join(torontoDir, file);
            
            try {
                // Clear require cache
                delete require.cache[require.resolve(filePath)];
                
                // Try to load the scraper
                const scraper = require(filePath);
                
                if (scraper.scrapeEvents && typeof scraper.scrapeEvents === 'function') {
                    workingScrapers.push({
                        file,
                        path: filePath,
                        scraper
                    });
                    console.log(`✅ WORKING: ${file}`);
                } else {
                    brokenScrapers.push({ file, error: 'Missing scrapeEvents export' });
                    console.log(`⚠️ Missing export: ${file}`);
                }
                
            } catch (error) {
                brokenScrapers.push({ file, error: error.message });
                console.log(`❌ BROKEN: ${file} - ${error.message.substring(0, 50)}...`);
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🔍 ORCHESTRATOR COMPATIBILITY ANALYSIS!');
        console.log('='.repeat(70));
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`✅ Working scrapers: ${workingScrapers.length}`);
        console.log(`❌ Broken scrapers: ${brokenScrapers.length}`);
        console.log(`🏆 Success rate: ${((workingScrapers.length / files.length) * 100).toFixed(1)}%`);
        
        if (workingScrapers.length > 0) {
            console.log(`\n🎉 WORKING SCRAPERS (${workingScrapers.length}):`);
            workingScrapers.forEach((scraper, i) => {
                console.log(`   ${i+1}. ${scraper.file}`);
            });
            
            // Analyze the first working scraper as a template
            console.log(`\n🔍 ANALYZING TEMPLATE: ${workingScrapers[0].file}`);
            const templateContent = fs.readFileSync(workingScrapers[0].path, 'utf8');
            
            console.log('\n📋 TEMPLATE STRUCTURE ANALYSIS:');
            
            // Check key patterns
            const patterns = {
                'Arrow functions': /=>\s*{/g,
                'Async/await': /async\s+function|await\s+/g,
                'Template literals': /`[^`]*\$\{[^}]+\}[^`]*`/g,
                'Object destructuring': /const\s*{\s*[^}]+\s*}\s*=/g,
                'Export structure': /module\.exports\s*=\s*{\s*scrapeEvents:/g,
                'Error handling': /try\s*{|catch\s*\(/g
            };
            
            for (const [pattern, regex] of Object.entries(patterns)) {
                const matches = templateContent.match(regex);
                console.log(`   ${pattern}: ${matches ? matches.length : 0} instances`);
            }
            
            // Save template content for reference
            const templatePath = '/Users/seongwoohan/CascadeProjects/working-scraper-template.js';
            fs.writeFileSync(templatePath, templateContent, 'utf8');
            console.log(`\n💾 Template saved to: working-scraper-template.js`);
            
            // Show key structural elements
            console.log('\n🔑 KEY TEMPLATE ELEMENTS:');
            
            // Extract key lines
            const lines = templateContent.split('\n');
            const keyLines = [];
            
            lines.forEach((line, i) => {
                if (line.includes('module.exports') || 
                    line.includes('scrapeEvents') ||
                    line.includes('const mongoose') ||
                    line.includes('async function') ||
                    line.includes('puppeteer') ||
                    line.includes('return events')) {
                    keyLines.push(`   Line ${i+1}: ${line.trim()}`);
                }
            });
            
            keyLines.forEach(line => console.log(line));
            
        } else {
            console.log('\n❌ NO WORKING SCRAPERS FOUND!');
            console.log('🔧 All scrapers need structural repair');
        }
        
        // Analyze common error patterns
        console.log('\n🚨 COMMON ERROR PATTERNS:');
        const errorCounts = {};
        brokenScrapers.forEach(scraper => {
            const errorType = scraper.error.split(':')[0] || scraper.error.substring(0, 30);
            errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        });
        
        Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([error, count]) => {
                console.log(`   "${error}": ${count} files`);
            });
        
        if (workingScrapers.length >= 3) {
            console.log('\n🚀 STRATEGIC APPROACH:');
            console.log('✅ Use working scrapers as templates for manual repair');
            console.log('🎯 Focus on fixing high-priority venues first');
            console.log('🔄 Build critical mass incrementally');
            console.log('📱 Each fixed scraper = more events in mobile app');
            
            console.log('\n🎯 PRIORITY REPAIR TARGETS:');
            console.log('1. Major Toronto venues (ROM, AGO, CN Tower, etc.)');
            console.log('2. Popular event categories (concerts, museums, theaters)');
            console.log('3. High-traffic venues with frequent events');
            
            console.log('\n🔧 MANUAL REPAIR PROCESS:');
            console.log('1. Copy working scraper structure');
            console.log('2. Replace URL and venue-specific content');
            console.log('3. Test in orchestrator context');
            console.log('4. Validate with full import');
            
        } else {
            console.log('\n⚠️ INSUFFICIENT WORKING TEMPLATES!');
            console.log('🔧 Need to manually create working scrapers first');
        }
        
        console.log('\n💡 IMMEDIATE NEXT STEPS:');
        console.log('1. 🔧 Use working scrapers to manually repair priority venues');
        console.log('2. 🧪 Test each repair in orchestrator context');
        console.log('3. 🔄 Gradually build up working scraper count');
        console.log('4. 📱 Monitor event growth in mobile app');
        
        return workingScrapers;
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
    }
}

identifyWorkingScrapersAndTemplate();
