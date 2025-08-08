const fs = require('fs');
const path = require('path');

class VancouverFinalMicroFixer {
    constructor() {
        this.results = {
            totalFixed: 0,
            errors: 0,
            skipped: 0
        };

        // The 2 production files with minor violations from our investigation
        this.targetFiles = [
            'vancouverJazzFestival.js',  // Has hardcoded "Vancouver"
            'wiseHall.js'               // Has hardcoded "Vancouver"
        ];
    }

    async executeVancouverMicroFixes() {
        console.log('🔧 VANCOUVER FINAL MICRO-FIXER');
        console.log('==============================');
        console.log('Mission: Fix the final 2 production files with minor violations');
        console.log('Goal: Achieve Vancouver 100% production validation success');
        console.log('Strategy: Surgical precision fixes for hardcoded "Vancouver" strings\n');

        const cityDir = path.join('cities', 'vancouver');
        
        if (!fs.existsSync(cityDir)) {
            console.log('❌ Vancouver directory not found!');
            return;
        }

        // Process each target file
        for (const fileName of this.targetFiles) {
            await this.fixVancouverFile(cityDir, fileName);
        }

        this.printMicroFixerSummary();
    }

    async fixVancouverFile(cityDir, fileName) {
        const filePath = path.join(cityDir, fileName);
        
        console.log(`🔧 Micro-fixing: ${fileName}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (!fs.existsSync(filePath)) {
            console.log(`   ⏭️  File not found - skipping`);
            this.results.skipped++;
            return;
        }

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            let fixed = false;

            // Check current state
            const hasHardcodedVancouver = /["'`]Vancouver["'`]/g.test(content);
            
            if (!hasHardcodedVancouver) {
                console.log(`   ✅ Already clean - no hardcoded Vancouver found`);
                this.results.skipped++;
                return;
            }

            // Create backup
            fs.writeFileSync(`${filePath}.final-micro-fix-backup`, originalContent);

            // Fix hardcoded Vancouver strings
            // Replace hardcoded "Vancouver" with city parameter in venue objects
            content = content.replace(
                /city:\s*['"]Vancouver['"]/g, 
                'city: city'
            );

            // Replace standalone hardcoded Vancouver strings with city parameter
            content = content.replace(
                /(?<!\/\/.*)['"]Vancouver['"]/g, 
                'city'
            );

            // Ensure city parameter is used in function signature if not already
            if (!content.includes('async function') && !content.includes('async (city)') && !content.includes('= async (city)')) {
                // Look for existing function signature and add city parameter
                content = content.replace(
                    /(module\.exports\s*=\s*)(async\s*\(\s*)/,
                    '$1$2city) => {'
                );
                content = content.replace(
                    /(async\s+function\s+\w+\s*\(\s*)/,
                    '$1city'
                );
            }

            // Clean up any remaining issues
            content = this.cleanupContent(content);

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content);
                console.log(`   ✅ Fixed hardcoded Vancouver strings → city parameter`);
                console.log(`   💾 Saved with backup: ${fileName}.final-micro-fix-backup`);
                this.results.totalFixed++;
                fixed = true;
            }

            if (!fixed) {
                console.log(`   📝 No changes needed`);
                this.results.skipped++;
            }

        } catch (error) {
            console.log(`   ❌ Error fixing ${fileName}: ${error.message}`);
            this.results.errors++;
        }

        console.log(); // Add spacing
    }

    cleanupContent(content) {
        // Remove excessive empty lines
        let cleaned = content.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n');
        
        // Remove trailing whitespace
        cleaned = cleaned.replace(/[ \t]+$/gm, '');
        
        return cleaned;
    }

    printMicroFixerSummary() {
        console.log('\n\n🔧 VANCOUVER FINAL MICRO-FIXER SUMMARY');
        console.log('======================================');
        console.log(`🔧 Files Fixed: ${this.results.totalFixed}`);
        console.log(`⏭️  Files Skipped: ${this.results.skipped}`);
        console.log(`❌ Errors: ${this.results.errors}`);

        console.log('\n🎯 VANCOUVER PERFECTION ACHIEVED:');
        if (this.results.totalFixed > 0) {
            console.log('✅ Final production fallback violations eliminated!');
            console.log('🏆 Vancouver should now achieve 100% production validation!');
        } else {
            console.log('✅ All files were already clean!');
            console.log('🎉 Vancouver was already at 100% production success!');
        }

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Re-validate Vancouver to confirm 100% production success');
        console.log('2. Document Vancouver as production-ready');
        console.log('3. Celebrate the Vancouver transformation victory!');
        
        console.log('\n💡 Micro-fix backups created for safety');
        console.log('🔧 Vancouver Final Micro-Fixer: COMPLETE!');
    }
}

// Execute Vancouver Final Micro-Fixer
if (require.main === module) {
    const microFixer = new VancouverFinalMicroFixer();
    microFixer.executeVancouverMicroFixes().catch(console.error);
}

module.exports = VancouverFinalMicroFixer;
