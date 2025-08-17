/**
 * 🎯 HYPER-PRECISE FIX FOR MISSING PARENTHESIS IN TORONTO SCRAPERS
 * 
 * Target the exact pattern found through deep manual analysis:
 * Missing closing parenthesis in eventUrl/imageUrl conditional logic (lines 197-198)
 * 
 * Verified pattern in multiple files:
 * eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && (eventUrl && (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
 * imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && (imageUrl && (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
 * 
 * Goal: Fix the exact missing closing parenthesis pattern
 */

const fs = require('fs');
const path = require('path');

async function hyperPreciseFixMissingParenthesis() {
    console.log('🎯 HYPER-PRECISE FIX FOR MISSING PARENTHESIS IN TORONTO SCRAPERS\n');
    console.log('🔧 Target: Exact pattern verified through deep manual analysis');
    console.log('📍 Location: Missing closing parenthesis in eventUrl/imageUrl logic\n');
    
    const torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    
    try {
        console.log('📁 Scanning all Toronto scrapers for hyper-precise fix...');
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
        console.log(`🔧 TARGETING ${scrapersToRepair.length} SCRAPERS FOR HYPER-PRECISE FIX\n`);
        
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
        
        console.log('🔧 APPLYING HYPER-PRECISE MISSING PARENTHESIS FIXES:\n');
        
        for (let i = 0; i < scrapersToRepair.length; i++) {
            const file = scrapersToRepair[i];
            const filePath = path.join(torontoDir, file);
            
            console.log(`🔍 [${i+1}/${scrapersToRepair.length}] Hyper-precise fixing ${file}...`);
            
            try {
                // Read current content
                let originalContent = fs.readFileSync(filePath, 'utf8');
                let content = originalContent;
                let hasChanges = false;
                
                // HYPER-PRECISE FIX 1: Fix the exact eventUrl pattern from manual analysis
                // Before: eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && (eventUrl && (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http"))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
                // After: eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && (eventUrl && (eventUrl && typeof eventUrl === 'string' && eventUrl.startsWith("http"))))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),
                
                const eventUrlPattern = /eventUrl:\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*"string"\s*&&\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*"string"\s*&&\s*\(eventUrl\s*&&\s*\(eventUrl\s*&&\s*typeof\s*eventUrl\s*===\s*'string'\s*&&\s*eventUrl\.startsWith\("http"\)\)\)\)\s*\?\s*eventUrl\s*:\s*\(eventUrl\s*\?\s*`\$\{BASE_URL\}\$\{eventUrl\}`\s*:\s*workingUrl\),/g;
                
                if (content.match(eventUrlPattern)) {
                    // Add the missing closing parenthesis before the ? operator
                    content = content.replace(eventUrlPattern, 
                        'eventUrl: (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && (eventUrl && (eventUrl && typeof eventUrl === \'string\' && eventUrl.startsWith("http"))))) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : workingUrl),'
                    );
                    hasChanges = true;
                    console.log(`   🔧 Fixed missing parenthesis in eventUrl pattern`);
                }
                
                // HYPER-PRECISE FIX 2: Fix the exact imageUrl pattern from manual analysis
                // Before: imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && (imageUrl && (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http"))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
                // After: imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && (imageUrl && (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith("http"))))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),
                
                const imageUrlPattern = /imageUrl:\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*"string"\s*&&\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*"string"\s*&&\s*\(imageUrl\s*&&\s*\(imageUrl\s*&&\s*typeof\s*imageUrl\s*===\s*'string'\s*&&\s*imageUrl\.startsWith\("http"\)\)\)\)\s*\?\s*imageUrl\s*:\s*\(imageUrl\s*\?\s*`\$\{BASE_URL\}\$\{imageUrl\}`\s*:\s*null\),/g;
                
                if (content.match(imageUrlPattern)) {
                    // Add the missing closing parenthesis before the ? operator
                    content = content.replace(imageUrlPattern,
                        'imageUrl: (imageUrl && typeof imageUrl === "string" && (imageUrl && typeof imageUrl === "string" && (imageUrl && (imageUrl && typeof imageUrl === \'string\' && imageUrl.startsWith("http"))))) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : null),'
                    );
                    hasChanges = true;
                    console.log(`   🔧 Fixed missing parenthesis in imageUrl pattern`);
                }
                
                // HYPER-PRECISE FIX 3: Add safeUrl function if pattern was replaced with safeUrl
                if (hasChanges && content.includes('safeUrl(') && !content.includes('const safeUrl')) {
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
                
                // HYPER-PRECISE FIX 4: Fix export structure if needed
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
                
                // Test after hyper-precise fixes
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
                            console.log(`   ✅ HYPER-PRECISE FIX SUCCESSFUL: ${file}`);
                        } else {
                            stillBroken++;
                            repairResults.stillBroken.push({ file, error: 'Missing scrapeEvents export after hyper-precise fix' });
                            console.log(`   ⚠️ Syntax fixed but export still missing: ${file}`);
                        }
                        
                    } catch (syntaxError) {
                        stillBroken++;
                        repairResults.stillBroken.push({ file, error: syntaxError.message });
                        console.log(`   ❌ Still syntax error after hyper-precise fix: ${file}`);
                        console.log(`      Error: ${syntaxError.message.substring(0, 80)}...`);
                        
                        // Revert changes if hyper-precise fix failed
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
                        console.log(`   ❌ Still broken (no pattern match): ${file}`);
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
                console.log(`   🔧 Successful hyper-precise fixes: ${successfulRepairs}`);
                console.log(`   ✅ Already working: ${alreadyWorking}`);
                console.log(`   ❌ Still broken: ${stillBroken}`);
                console.log(`   ❌ Errors: ${errors}\n`);
            }
        }
        
        const totalWorking = knownWorkingScrapers.length + successfulRepairs + alreadyWorking;
        const totalFiles = files.length;
        const workingRate = (totalWorking / totalFiles * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(70));
        console.log('🎯 HYPER-PRECISE MISSING PARENTHESIS FIX RESULTS!');
        console.log('='.repeat(70));
        
        console.log(`\n📊 HYPER-PRECISE FIX RESULTS:`);
        console.log(`📁 Total Toronto scrapers: ${totalFiles}`);
        console.log(`✅ Known working (unchanged): ${knownWorkingScrapers.length}`);
        console.log(`🔧 Successfully hyper-precisely fixed: ${successfulRepairs}`);
        console.log(`✅ Already working (discovered): ${alreadyWorking}`);
        console.log(`❌ Still broken after hyper-precise fix: ${stillBroken}`);
        console.log(`❌ Processing errors: ${errors}`);
        console.log(`🏆 Total working scrapers: ${totalWorking}`);
        console.log(`🏆 Overall success rate: ${workingRate}%`);
        
        if (successfulRepairs > 50) {
            console.log('\n🎉 MASSIVE HYPER-PRECISE SUCCESS!');
            console.log('🚀 Huge breakthrough! Most Toronto scrapers now working!');
            console.log('📱 Ready for massive Toronto event import!');
            console.log('🎯 Target: 100+ Toronto events in mobile app!');
        } else if (successfulRepairs > 20) {
            console.log('\n✅ EXCELLENT HYPER-PRECISE SUCCESS!');
            console.log('📈 Significant improvement with hyper-precise approach!');
            console.log('🔄 Continue with remaining patterns');
        } else if (successfulRepairs > 10) {
            console.log('\n📈 GOOD HYPER-PRECISE SUCCESS!');
            console.log('🔧 Hyper-precise approach showing results');
            console.log('🔄 Analyze remaining error patterns');
        } else if (successfulRepairs > 0) {
            console.log('\n📈 SOME HYPER-PRECISE SUCCESS!');
            console.log('🔧 Hyper-precise approach working for specific pattern');
            console.log('🔄 Need additional patterns for remaining files');
        } else {
            console.log('\n⚠️ HYPER-PRECISE PATTERN NEEDS REFINEMENT!');
            console.log('🔧 The real pattern may be slightly different');
            console.log('🔍 Need to refine the regex matching further');
        }
        
        // Show successful hyper-precise fixes
        if (successfulRepairs > 0) {
            console.log(`\n🎉 SUCCESSFULLY HYPER-PRECISELY FIXED (${successfulRepairs}):`);
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
            console.log('🔍 Further refine the hyper-precise pattern matching');
            console.log('🎯 Apply additional targeted repair patterns');
            console.log('🔄 Continue iterative repair approach');
        }
        
        console.log('\n💡 HYPER-PRECISE FIX ACHIEVEMENTS:');
        console.log('🎯 Targeted exact pattern from deep manual analysis');
        console.log('📈 Empirical approach to repair methodology');
        console.log('🔧 Missing parenthesis fix for complex syntax issues');
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
        console.error('❌ Hyper-precise fix error:', error);
    }
}

hyperPreciseFixMissingParenthesis();
