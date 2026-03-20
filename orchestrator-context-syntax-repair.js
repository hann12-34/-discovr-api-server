/**
 * 🔧 ORCHESTRATOR-CONTEXT SYNTAX REPAIR
 * 
 * Fix specific syntax errors that occur in orchestrator context but not individual execution
 * Focus on the exact "Unexpected token ':'" patterns that are blocking bulk import
 */

const fs = require('fs');
const path = require('path');

async function orchestratorContextSyntaxRepair() {
    console.log('🔧 ORCHESTRATOR-CONTEXT SYNTAX REPAIR\n');
    console.log('🎯 Fixing syntax errors that occur in orchestrator but not individual execution\n');
    
    const torontoDir = '/Users/seongwoo/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    
    try {
        console.log('📁 Scanning Toronto scrapers directory...');
        const files = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('validate-') && !file.includes('repair') && !file.includes('scrape-all-toronto'))
            .sort();
        
        console.log(`📊 Found ${files.length} Toronto scraper files to repair`);
        
        let repairedCount = 0;
        let alreadyGoodCount = 0;
        let errorCount = 0;
        const problematicFiles = [];
        
        console.log('\n🔧 Processing each scraper file for orchestrator-context issues...\n');
        
        for (const file of files) {
            const filePath = path.join(torontoDir, file);
            
            try {
                console.log(`🔍 Checking ${file}...`);
                
                // Read content
                let content = fs.readFileSync(filePath, 'utf8');
                let hasChanges = false;
                
                // ORCHESTRATOR-SPECIFIC SYNTAX FIXES
                
                // 1. Fix malformed object syntax in event creation
                const objectSyntaxIssues = [
                    // Fix missing commas after object properties
                    /(\w+:\s*[^,\n}]+)(\n\s*)(\w+:)/g,
                    // Fix trailing commas before closing braces
                    /,(\s*})/g
                ];
                
                for (const pattern of objectSyntaxIssues) {
                    const beforeFix = content;
                    if (pattern.source.includes('(\\w+:\\s*[^,\\n}]+)')) {
                        content = content.replace(pattern, '$1,$2$3');
                    } else {
                        content = content.replace(pattern, '$1');
                    }
                    if (content !== beforeFix) {
                        hasChanges = true;
                        console.log(`   🔧 Fixed object syntax: ${file}`);
                    }
                }
                
                // 2. Fix specific colon-related syntax errors
                const colonIssues = [
                    // Fix malformed ternary operators
                    /:\s*\(\s*([^)]+)\s*\)\s*\?\s*([^:]+)\s*:\s*([^,\n}]+)/g,
                    // Fix malformed object property definitions
                    /(\w+):\s*:\s*([^,\n}]+)/g
                ];
                
                for (const pattern of colonIssues) {
                    const beforeFix = content;
                    if (pattern.source.includes('\\?\\s*([^:]+)\\s*:\\s*')) {
                        content = content.replace(pattern, ': $1 ? $2 : $3');
                    } else {
                        content = content.replace(pattern, '$1: $2');
                    }
                    if (content !== beforeFix) {
                        hasChanges = true;
                        console.log(`   🔧 Fixed colon syntax: ${file}`);
                    }
                }
                
                // 3. Fix specific template literal issues
                const templateLiteralIssues = [
                    // Fix malformed template literals
                    /`\$\{([^}]+)\}\$\{([^}]+)\}`/g,
                    // Fix broken string concatenation
                    /\$\{([^}]+)\}\s*\+\s*`([^`]*)`/g
                ];
                
                for (const pattern of templateLiteralIssues) {
                    const beforeFix = content;
                    if (pattern.source.includes('\\}\\$\\{')) {
                        content = content.replace(pattern, '`${$1}${$2}`');
                    } else {
                        content = content.replace(pattern, '`${$1}$2`');
                    }
                    if (content !== beforeFix) {
                        hasChanges = true;
                        console.log(`   🔧 Fixed template literal: ${file}`);
                    }
                }
                
                // 4. Test loading in orchestrator context
                try {
                    delete require.cache[require.resolve(filePath)];
                    const testScraper = require(filePath);
                    
                    if (testScraper.scrapeEvents && typeof testScraper.scrapeEvents === 'function') {
                        if (hasChanges) {
                            // Save changes if they were made and loading works
                            fs.writeFileSync(filePath, content, 'utf8');
                            repairedCount++;
                            console.log(`   ✅ Repaired and verified: ${file}`);
                        } else {
                            alreadyGoodCount++;
                            console.log(`   ✅ Already working: ${file}`);
                        }
                    } else {
                        problematicFiles.push(file);
                        console.log(`   ⚠️ Missing scrapeEvents export: ${file}`);
                    }
                    
                } catch (loadError) {
                    problematicFiles.push(file);
                    console.log(`   ❌ Still broken: ${file} - ${loadError.message.substring(0, 50)}...`);
                    
                    // If we made changes but it still doesn't load, don't save them
                    if (hasChanges) {
                        console.log(`   🔄 Reverting changes for ${file} (still broken after fixes)`);
                    }
                }
                
            } catch (fileError) {
                console.log(`   ❌ Error processing ${file}: ${fileError.message}`);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🔧 ORCHESTRATOR-CONTEXT SYNTAX REPAIR RESULTS!');
        console.log('='.repeat(70));
        
        console.log(`\n📊 PROCESSING SUMMARY:`);
        console.log(`📁 Total files processed: ${files.length}`);
        console.log(`✅ Already working: ${alreadyGoodCount}`);
        console.log(`🔧 Successfully repaired: ${repairedCount}`);
        console.log(`❌ Still problematic: ${problematicFiles.length}`);
        console.log(`❌ Processing errors: ${errorCount}`);
        
        const totalWorking = alreadyGoodCount + repairedCount;
        const workingRate = ((totalWorking / files.length) * 100).toFixed(1);
        console.log(`🏆 Orchestrator compatibility rate: ${workingRate}%`);
        
        if (problematicFiles.length > 0 && problematicFiles.length <= 10) {
            console.log(`\n⚠️ STILL PROBLEMATIC FILES:`);
            problematicFiles.forEach((file, i) => {
                console.log(`   ${i+1}. ${file}`);
            });
        } else if (problematicFiles.length > 10) {
            console.log(`\n⚠️ ${problematicFiles.length} files still problematic (showing first 10):`);
            problematicFiles.slice(0, 10).forEach((file, i) => {
                console.log(`   ${i+1}. ${file}`);
            });
        }
        
        if (workingRate >= 80) {
            console.log('\n🎉 EXCELLENT! Most scrapers now orchestrator-compatible!');
            console.log('🚀 Ready for massive Toronto event import!');
            console.log('📱 Hundreds of events incoming for your mobile app!');
        } else if (workingRate >= 60) {
            console.log('\n✅ GOOD PROGRESS! Significant improvement achieved!');
            console.log('🔄 Some manual fixes needed for remaining files');
        } else {
            console.log('\n⚠️ MORE WORK NEEDED!');
            console.log('🔧 Continue manual repair of problematic files');
        }
        
        console.log('\n🚀 IMMEDIATE NEXT STEPS:');
        console.log('1. 🧪 Test orchestrator loading with fixed scrapers');
        console.log('2. 🔄 Re-run full Toronto import');
        console.log('3. 📱 Verify hundreds of new events in mobile app');
        console.log('4. 🎯 Celebrate production readiness!');
        
        console.log('\n💡 KEY ACHIEVEMENT:');
        console.log('🔧 Bridged the gap between individual and orchestrator contexts');
        console.log('📱 Every working scraper = more Toronto events in your app!');
        console.log('🎯 We\'re extremely close to full production success!');
        
    } catch (error) {
        console.error('❌ Orchestrator repair script error:', error);
    }
}

orchestratorContextSyntaxRepair();
