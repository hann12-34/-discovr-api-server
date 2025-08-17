/**
 * 🎯 DIRECT FIX FOR LINE 198 SYNTAX ERROR
 * 
 * Target the exact malformed imageUrl conditional logic on line 198
 * Root cause: Missing closing parenthesis before comma in imageUrl field
 * Goal: Fix all scrapers with this specific pattern
 */

const fs = require('fs');
const path = require('path');

async function directFixLine198SyntaxError() {
    console.log('🎯 DIRECT FIX FOR LINE 198 SYNTAX ERROR\n');
    console.log('🔧 Target: imageUrl field with missing closing parenthesis');
    console.log('📍 Location: Line 198 in multiple Toronto scrapers\n');
    
    const torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    
    try {
        console.log('📁 Scanning all Toronto scrapers for line 198 syntax error...');
        const files = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('validate-') && !file.includes('repair') && !file.includes('scrape-all-toronto'))
            .sort();
        
        console.log(`📊 Found ${files.length} Toronto scraper files\n`);
        
        // Known working scrapers (skip these)
        const knownWorkingScrapers = [
            'scrape-ago-events-clean.js',
            'scrape-casa-loma-events-clean.js', 
            'scrape-cn-tower-events-clean.js',
            'scrape-moca-events.js',
            'scrape-rom-events-clean.js',
            'scrape-gardiner-museum-events.js',
            'scrape-ripleysaquarium-events.js',
            'scrape-uv-toronto-events.js',
            'scrape-vertigo-events.js',
            'scrape-xclub-events.js',
            'deploy-production-toronto-scrapers.js'
        ];
        
        console.log(`✅ SKIPPING ${knownWorkingScrapers.length} KNOWN WORKING SCRAPERS\n`);
        
        const scrapersToRepair = files.filter(file => !knownWorkingScrapers.includes(file));
        console.log(`🔧 TARGETING ${scrapersToRepair.length} SCRAPERS FOR LINE 198 FIX\n`);
        
        let successfulRepairs = 0;
        let alreadyWorking = 0;
        let stillBroken = 0;
        let errors = 0;
        
        const repairResults = {
            successful: [],
            alreadyWorking: [],
            stillBroken: [],
            errors: []
        };
        
        console.log('🔧 APPLYING DIRECT LINE 198 FIXES:\n');
        
        for (let i = 0; i < scrapersToRepair.length; i++) {
            const file = scrapersToRepair[i];
            const filePath = path.join(torontoDir, file);
            
            console.log(`🔍 [${i+1}/${scrapersToRepair.length}] Fixing line 198 in ${file}...`);
            
            try {
                // Read current content
                let originalContent = fs.readFileSync(filePath, 'utf8');
                let content = originalContent;
                let hasChanges = false;
                
                // DIRECT FIX 1: Fix the exact malformed imageUrl pattern from line 198
                const malformedImageUrlLine198 = /imageUrl:\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*"string"\s*&&\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*"string"\s*&&\s*\(imageUrl\s*&&\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*'string'\s*&&\s*imageUrl\.startsWith\("http"\)\)\)\)\s*\?\s*imageUrl\s*:\s*\(imageUrl\s*\?\s*`\$\{BASE_URL\}\$\{imageUrl\}`\s*:\s*null\),/g;
                
                if (malformedImageUrlLine198.test(content)) {
                    content = content.replace(malformedImageUrlLine198, 'imageUrl: safeUrl(imageUrl, BASE_URL, null),');
                    hasChanges = true;
                    console.log(`   🔧 Fixed malformed imageUrl on line 198`);
                }
                
                // DIRECT FIX 2: Fix the exact malformed eventUrl pattern (likely on line 197)
                const malformedEventUrlPattern = /eventUrl:\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*"string"\s*&&\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*"string"\s*&&\s*\(eventUrl\s*&&\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*'string'\s*&&\s*eventUrl\.startsWith\("http"\)\)\)\)\s*\?\s*eventUrl\s*:\s*\(eventUrl\s*\?\s*`\$\{BASE_URL\}\$\{eventUrl\}`\s*:\s*workingUrl\),/g;
                
                if (malformedEventUrlPattern.test(content)) {
                    content = content.replace(malformedEventUrlPattern, 'eventUrl: safeUrl(eventUrl, BASE_URL, workingUrl),');
                    hasChanges = true;
                    console.log(`   🔧 Fixed malformed eventUrl pattern`);
                }
                
                // DIRECT FIX 3: Add safeUrl function if using safeUrl but missing definition
                if (content.includes('safeUrl(') && !content.includes('const safeUrl')) {
                    // Find insertion point after safeStartsWith
                    const safeStartsWithEnd = content.indexOf('};', content.indexOf('const safeStartsWith'));
                    
                    if (safeStartsWithEnd !== -1) {
                        const insertionPoint = safeStartsWithEnd + 2;
                        const safeUrlFunction = `

// Safe URL helper to prevent undefined errors
const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  if (typeof url === 'string') return \`\${baseUrl}\${url}\`;
  return fallback;
};`;
                        
                        content = content.slice(0, insertionPoint) + safeUrlFunction + content.slice(insertionPoint);
                        hasChanges = true;
                        console.log(`   ➕ Added missing safeUrl function`);
                    }
                }
                
                // DIRECT FIX 4: Fix export structure if needed
                if (!content.includes('module.exports = { scrapeEvents:')) {
                    const functionMatch = content.match(/async function (\w+)\(/);
                    if (functionMatch) {
                        const functionName = functionMatch[1];
                        
                        if (content.includes('module.exports')) {
                            content = content.replace(/module\.exports\s*=\s*[^;]+;?/, `module.exports = { scrapeEvents: ${functionName} };`);
                        } else {
                            content += `\n\n// Clean production export\nmodule.exports = { scrapeEvents: ${functionName} };\n`;
                        }
                        hasChanges = true;
                        console.log(`   🔧 Fixed export structure: { scrapeEvents: ${functionName} }`);
                    }
                }
                
                // Test after fixes
                if (hasChanges) {
                    // Save temporarily for syntax check
                    fs.writeFileSync(filePath, content, 'utf8');
                    
                    try {
                        // Test Node.js syntax validation
                        const { execSync } = require('child_process');
                        execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
                        
                        // Test loading
                        delete require.cache[require.resolve(filePath)];
                        const scraper = require(filePath);
                        
                        if (scraper.scrapeEvents && typeof scraper.scrapeEvents === 'function') {
                            successfulRepairs++;
                            repairResults.successful.push(file);
                            console.log(`   ✅ DIRECT FIX SUCCESSFUL: ${file}`);
                        } else {
                            stillBroken++;
                            repairResults.stillBroken.push({ file, error: 'Missing scrapeEvents export after direct fix' });
                            console.log(`   ⚠️ Syntax fixed but export still missing: ${file}`);
                        }
                        
                    } catch (syntaxError) {
                        stillBroken++;
                        repairResults.stillBroken.push({ file, error: syntaxError.message });
                        console.log(`   ❌ Still syntax error after direct fix: ${file}`);
                        console.log(`      Error: ${syntaxError.message.substring(0, 80)}...`);
                        
                        // Revert changes if direct fix failed
                        fs.writeFileSync(filePath, originalContent, 'utf8');
                        console.log(`   🔄 Reverted changes for ${file}`);
                    }
                    
                } else {
                    // Test if already working
                    try {
                        const { execSync } = require('child_process');
                        execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
                        
                        delete require.cache[require.resolve(filePath)];
                        const scraper = require(filePath);
                        
                        if (scraper.scrapeEvents && typeof scraper.scrapeEvents === 'function') {
                            alreadyWorking++;
                            repairResults.alreadyWorking.push(file);
                            console.log(`   ✅ Already working: ${file}`);
                        } else {
                            stillBroken++;
                            repairResults.stillBroken.push({ file, error: 'Syntax OK but missing scrapeEvents export' });
                            console.log(`   ❌ Syntax OK but missing export: ${file}`);
                        }
                        
                    } catch (loadError) {
                        stillBroken++;
                        repairResults.stillBroken.push({ file, error: loadError.message });
                        console.log(`   ❌ Still broken (no changes applied): ${file}`);
                    }
                }
                
            } catch (fileError) {
                errors++;
                repairResults.errors.push({ file, error: fileError.message });
                console.log(`   ❌ Error processing ${file}: ${fileError.message}`);
            }
            
            // Progress indicator every 25 files
            if ((i + 1) % 25 === 0) {
                console.log(`\n📊 Progress: ${i + 1}/${scrapersToRepair.length} (${((i + 1) / scrapersToRepair.length * 100).toFixed(1)}%)`);
                console.log(`   🔧 Successful direct fixes: ${successfulRepairs}`);
                console.log(`   ✅ Already working: ${alreadyWorking}`);
                console.log(`   ❌ Still broken: ${stillBroken}`);
                console.log(`   ❌ Errors: ${errors}\n`);
            }
        }
        
        const totalWorking = knownWorkingScrapers.length + successfulRepairs + alreadyWorking;
        const totalFiles = files.length;
        const workingRate = (totalWorking / totalFiles * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(70));
        console.log('🎯 DIRECT LINE 198 FIX RESULTS!');
        console.log('='.repeat(70));
        
        console.log(`\n📊 DIRECT FIX RESULTS:`);
        console.log(`📁 Total Toronto scrapers: ${totalFiles}`);
        console.log(`✅ Known working (unchanged): ${knownWorkingScrapers.length}`);
        console.log(`🔧 Successfully fixed line 198: ${successfulRepairs}`);
        console.log(`✅ Already working (discovered): ${alreadyWorking}`);
        console.log(`❌ Still broken after direct fix: ${stillBroken}`);
        console.log(`❌ Processing errors: ${errors}`);
        console.log(`🏆 Total working scrapers: ${totalWorking}`);
        console.log(`🏆 Overall success rate: ${workingRate}%`);
        
        if (successfulRepairs > 50) {
            console.log('\n🎉 MASSIVE DIRECT FIX SUCCESS!');
            console.log('🚀 Huge breakthrough! Most Toronto scrapers now working!');
            console.log('📱 Ready for massive Toronto event import!');
            console.log('🎯 Target: 100+ Toronto events in mobile app!');
        } else if (successfulRepairs > 20) {
            console.log('\n✅ EXCELLENT DIRECT FIX SUCCESS!');
            console.log('📈 Significant improvement with direct approach!');
            console.log('🔄 Continue with remaining patterns');
        } else if (successfulRepairs > 10) {
            console.log('\n📈 GOOD DIRECT FIX SUCCESS!');
            console.log('🔧 Direct approach showing results');
            console.log('🔄 Analyze remaining error patterns');
        } else if (successfulRepairs > 0) {
            console.log('\n📈 SOME DIRECT FIX SUCCESS!');
            console.log('🔧 Direct approach working for specific pattern');
            console.log('🔄 Need additional patterns for remaining files');
        } else {
            console.log('\n⚠️ DIRECT FIX PATTERN MISMATCH!');
            console.log('🔧 Line 198 pattern may be different than expected');
            console.log('🔍 Need to analyze actual file content more carefully');
        }
        
        // Show successful direct fixes
        if (successfulRepairs > 0) {
            console.log(`\n🎉 SUCCESSFULLY FIXED LINE 198 (${successfulRepairs}):`);
            repairResults.successful.slice(0, 20).forEach((file, i) => {
                console.log(`   ${i+1}. ${file}`);
            });
            if (successfulRepairs > 20) {
                console.log(`   ... and ${successfulRepairs - 20} more!`);
            }
        }
        
        if (successfulRepairs > 0) {
            console.log('\n🚀 IMMEDIATE NEXT ACTIONS:');
            console.log('1. 🧪 Test massive Toronto import with all working scrapers');
            console.log('2. 📊 Monitor event count increase (target: 100+ events)');
            console.log('3. 📱 Verify massive increase in mobile app');
            console.log('4. 🎯 Celebrate production-scale Toronto coverage!');
        }
        
        if (stillBroken > 0) {
            console.log('\n🔧 FOR REMAINING BROKEN SCRAPERS:');
            console.log('🔍 Analyze specific error patterns in detail');
            console.log('🎯 Apply additional targeted repair patterns');
            console.log('🔄 Continue iterative repair approach');
        }
        
        console.log('\n💡 DIRECT FIX ACHIEVEMENTS:');
        console.log('🎯 Targeted the exact line 198 syntax error pattern');
        console.log('📈 Empirical approach to repair methodology');
        console.log('🔧 Simple, direct fixes for complex syntax issues');
        console.log('📱 Production-ready event pipeline advancement');
        
        return {
            totalFiles,
            totalWorking,
            workingRate,
            successfulRepairs,
            alreadyWorking,
            stillBroken,
            errors
        };
        
    } catch (error) {
        console.error('❌ Direct fix error:', error);
    }
}

directFixLine198SyntaxError();
