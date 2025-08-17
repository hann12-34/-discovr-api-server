/**
 * 🚨 EMERGENCY FIX ARROW FUNCTIONS
 * 
 * Fix the regression caused by my automated script that removed
 * necessary parentheses from arrow function parameters
 */

const fs = require('fs');
const path = require('path');

async function emergencyFixArrowFunctions() {
    console.log('🚨 EMERGENCY FIX FOR ARROW FUNCTIONS\n');
    console.log('🔧 Restoring missing parentheses around arrow function parameters\n');
    
    const torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    
    try {
        console.log('📁 Scanning Toronto scrapers directory...');
        const files = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('validate-') && !file.includes('repair'))
            .sort();
        
        console.log(`📊 Found ${files.length} Toronto scraper files to fix`);
        
        let fixedCount = 0;
        let errorCount = 0;
        
        console.log('\n🔧 Processing each scraper file...\n');
        
        for (const file of files) {
            const filePath = path.join(torontoDir, file);
            
            try {
                console.log(`🔍 Checking ${file}...`);
                
                // Read content
                let content = fs.readFileSync(filePath, 'utf8');
                let hasChanges = false;
                
                // SPECIFIC ARROW FUNCTION FIXES
                
                // 1. Fix .each() arrow functions
                if (content.includes('.each(i, el) =>')) {
                    content = content.replace(/\.each\(i,\s*el\)\s*=>/g, '.each((i, el) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .each() arrow function: ${file}`);
                }
                
                // 2. Fix .sort() arrow functions  
                if (content.includes('.sort(a, b) =>')) {
                    content = content.replace(/\.sort\(a,\s*b\)\s*=>/g, '.sort((a, b) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .sort() arrow function: ${file}`);
                }
                
                // 3. Fix .map() arrow functions
                if (content.includes('.map(item, index) =>')) {
                    content = content.replace(/\.map\(item,\s*index\)\s*=>/g, '.map((item, index) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .map() arrow function: ${file}`);
                }
                
                // 4. Fix .filter() arrow functions with multiple params
                if (content.includes('.filter(item, index) =>')) {
                    content = content.replace(/\.filter\(item,\s*index\)\s*=>/g, '.filter((item, index) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .filter() arrow function: ${file}`);
                }
                
                // 5. Fix .forEach() arrow functions
                if (content.includes('.forEach(item, index) =>')) {
                    content = content.replace(/\.forEach\(item,\s*index\)\s*=>/g, '.forEach((item, index) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .forEach() arrow function: ${file}`);
                }
                
                // 6. Fix .some() arrow functions
                if (content.includes('.some(pattern, index) =>') || content.includes('.some(item, index) =>')) {
                    content = content.replace(/\.some\(pattern,\s*index\)\s*=>/g, '.some((pattern, index) =>');
                    content = content.replace(/\.some\(item,\s*index\)\s*=>/g, '.some((item, index) =>');
                    hasChanges = true;
                    console.log(`   🔧 Fixed .some() arrow function: ${file}`);
                }
                
                // 7. Generic fix for common multi-parameter arrow functions
                // Find patterns like "functionName(param1, param2) =>" and add parentheses
                const multiParamArrowRegex = /(\w+)\((\w+),\s*(\w+)\)\s*=>/g;
                const beforeGeneric = content;
                content = content.replace(multiParamArrowRegex, '$1(($2, $3) =>');
                if (content !== beforeGeneric) {
                    hasChanges = true;
                    console.log(`   🔧 Fixed generic multi-parameter arrow functions: ${file}`);
                }
                
                // Save if changes made
                if (hasChanges) {
                    fs.writeFileSync(filePath, content, 'utf8');
                    fixedCount++;
                    console.log(`   ✅ Applied arrow function fixes to: ${file}`);
                } else {
                    console.log(`   ℹ️ No arrow function issues found: ${file}`);
                }
                
            } catch (fileError) {
                console.log(`   ❌ Error processing ${file}: ${fileError.message}`);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🚨 EMERGENCY ARROW FUNCTION FIX RESULTS!');
        console.log('='.repeat(70));
        
        console.log(`\n📊 PROCESSING SUMMARY:`);
        console.log(`📁 Total files processed: ${files.length}`);
        console.log(`🔧 Arrow function fixes applied: ${fixedCount}`);
        console.log(`❌ Processing errors: ${errorCount}`);
        
        const successRate = ((fixedCount / files.length) * 100).toFixed(1);
        console.log(`🏆 Fix rate: ${successRate}%`);
        
        if (fixedCount > 0) {
            console.log('\n🎉 ARROW FUNCTION FIXES APPLIED!');
            console.log('✅ "Malformed arrow function parameter list" errors should be resolved');
            console.log('🧪 Ready for testing individual scrapers');
        } else {
            console.log('\n⚠️ NO FIXES APPLIED');
            console.log('🔍 May need manual inspection of specific files');
        }
        
        console.log('\n🚀 IMMEDIATE NEXT STEPS:');
        console.log('1. 🧪 Test individual scrapers to verify fixes');
        console.log('2. 🔄 Re-run Toronto import');
        console.log('3. 📱 Check for successful event import');
        console.log('4. 🔧 Manual fix any remaining issues');
        
        console.log('\n💡 LESSON LEARNED:');
        console.log('⚠️ Automated regex replacements can break arrow function syntax');
        console.log('🔧 Manual testing is essential after bulk changes');
        console.log('🎯 Focus on individual scraper fixes going forward');
        
    } catch (error) {
        console.error('❌ Emergency fix script error:', error);
    }
}

emergencyFixArrowFunctions();
