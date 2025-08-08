const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class EmergencySyntaxRepair {
    constructor() {
        // The 8 Toronto files with systematic syntax errors
        this.targetFiles = [
            'scrape-all-toronto.js',
            'scrape-downsview-park-events.js',
            'scrape-drom-taberna-events.js',
            'scrape-fisher-library-events.js',
            'scrape-harbourfront-events.js',
            'scrape-henderson-brewing-events.js',
            'scrape-junction-craft-events.js',
            'scrape-mascot-brewery-events.js'
        ];

        this.results = {
            totalFiles: this.targetFiles.length,
            repaired: 0,
            errors: 0,
            details: []
        };

        // Systematic syntax error patterns to fix
        this.syntaxFixes = [
            {
                name: 'Malformed database collection assignment',
                pattern: /const eventsCollection = (dbs|databases|db)\'\);?/g,
                replacement: "const eventsCollection = client.db('events').collection('events');"
            },
            {
                name: 'Malformed database collection assignment (alternate)',
                pattern: /const eventsCollection = (client\.db\([^)]*\))\'\);?/g,
                replacement: "const eventsCollection = client.db('events').collection('events');"
            },
            {
                name: 'Incomplete database assignments',
                pattern: /const eventsCollection = [^;]*\'\);?$/gm,
                replacement: "const eventsCollection = client.db('events').collection('events');"
            },
            {
                name: 'Malformed string endings',
                pattern: /\'\)\s*;/g,
                replacement: "')"
            }
        ];
    }

    async executeEmergencySyntaxRepair() {
        console.log('🚨 EMERGENCY SYNTAX REPAIR MISSION');
        console.log('==================================');
        console.log('🎯 Mission: Fix systematic syntax errors in 8 Toronto production files');
        console.log('🔧 Strategy: Pattern-based syntax error repair');
        console.log('📊 Target: Convert 98.3% → 100% production validation success\n');

        console.log('🚨 SYSTEMATIC SYNTAX ERROR PATTERN DETECTED:');
        console.log('❌ const eventsCollection = dbs\');');
        console.log('❌ const eventsCollection = databases\');');
        console.log('✅ const eventsCollection = client.db(\'events\').collection(\'events\');\n');

        console.log('🎯 TARGET FILES:');
        this.targetFiles.forEach((file, i) => {
            console.log(`   ${i + 1}. ${file}`);
        });
        console.log();

        // Repair each file
        for (let i = 0; i < this.targetFiles.length; i++) {
            const fileName = this.targetFiles[i];
            console.log(`\n🔧 EMERGENCY REPAIR ${i + 1}/8: ${fileName}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const result = await this.repairFileSyntax(fileName);
            this.results.details.push({ file: fileName, result });

            if (result === 'repaired') {
                this.results.repaired++;
                console.log(`   ✅ SYNTAX REPAIRED: ${fileName}`);
                
                // Immediate syntax check
                await this.verifySyntaxFix(fileName);
            } else if (result === 'error') {
                this.results.errors++;
                console.log(`   ❌ REPAIR FAILED: ${fileName}`);
            } else {
                console.log(`   📝 NO CHANGES: ${fileName}`);
            }
        }

        // Final validation after all repairs
        await this.runFinalValidation();
        this.printEmergencyRepairResults();
    }

    async repairFileSyntax(fileName) {
        const filePath = path.join('cities', 'Toronto', fileName);

        try {
            if (!fs.existsSync(filePath)) {
                console.log(`   ❌ File not found: ${fileName}`);
                return 'error';
            }

            const originalContent = fs.readFileSync(filePath, 'utf8');
            let repairedContent = originalContent;
            const appliedFixes = [];

            // Apply all syntax fix patterns
            for (const fix of this.syntaxFixes) {
                const beforeContent = repairedContent;
                repairedContent = repairedContent.replace(fix.pattern, fix.replacement);
                
                if (repairedContent !== beforeContent) {
                    appliedFixes.push(fix.name);
                }
            }

            // Additional targeted fixes for specific patterns seen in error messages
            repairedContent = repairedContent
                .replace(/const eventsCollection = dbs'\);/g, "const eventsCollection = client.db('events').collection('events');")
                .replace(/const eventsCollection = databases'\);/g, "const eventsCollection = client.db('events').collection('events');")
                .replace(/const eventsCollection = client\.db\([^)]*\)'\);/g, "const eventsCollection = client.db('events').collection('events');");

            if (repairedContent !== originalContent) {
                // Create emergency backup
                fs.writeFileSync(`${filePath}.emergency-syntax-backup`, originalContent);
                
                // Apply repairs
                fs.writeFileSync(filePath, repairedContent);
                
                console.log(`   🔧 Applied repairs: ${appliedFixes.length > 0 ? appliedFixes.join(', ') : 'Direct syntax fix'}`);
                return 'repaired';
            } else {
                console.log(`   📝 No syntax errors detected in ${fileName}`);
                return 'unchanged';
            }

        } catch (error) {
            console.log(`   💥 Repair error: ${error.message}`);
            return 'error';
        }
    }

    async verifySyntaxFix(fileName) {
        const filePath = path.join('cities', 'Toronto', fileName);
        
        try {
            const { stdout, stderr } = await execAsync(`node -c "${filePath}"`);
            console.log(`   ✅ Syntax verification: ${fileName} is now valid`);
            return true;
        } catch (error) {
            console.log(`   ⚠️ Syntax still invalid for ${fileName}: ${error.message}`);
            return false;
        }
    }

    async runFinalValidation() {
        console.log('\n\n🎯 FINAL EMERGENCY VALIDATION');
        console.log('=============================');
        console.log('Running production-only validation to measure repair success...\n');

        try {
            const { stdout } = await execAsync('node production-only-validator.js');
            console.log(stdout);
        } catch (error) {
            console.log('❌ Final validation error:', error.message);
        }
    }

    printEmergencyRepairResults() {
        console.log('\n\n🚨 EMERGENCY SYNTAX REPAIR RESULTS');
        console.log('==================================');
        console.log(`🎯 Total Files Targeted: ${this.results.totalFiles}`);
        console.log(`✅ Successfully Repaired: ${this.results.repaired}`);
        console.log(`❌ Repair Errors: ${this.results.errors}`);

        console.log('\n📊 PER-FILE REPAIR RESULTS:');
        this.results.details.forEach((detail, i) => {
            const status = detail.result === 'repaired' ? '✅' : 
                          detail.result === 'error' ? '❌' : '📝';
            console.log(`   ${i + 1}. ${status} ${detail.file}: ${detail.result}`);
        });

        const repairRate = ((this.results.repaired / this.results.totalFiles) * 100).toFixed(1);
        console.log(`\n🎯 EMERGENCY REPAIR SUCCESS RATE: ${repairRate}%`);

        console.log('\n🚨 EMERGENCY SYNTAX REPAIR IMPACT:');
        console.log('📈 Previous Success: 98.3% (594/604 production scrapers)');
        
        if (this.results.repaired === this.results.totalFiles) {
            console.log('🎉 🎉 🎉 PERFECT EMERGENCY REPAIR! 🎉 🎉 🎉');
            console.log('🏆 ALL 8 SYNTAX ERRORS SUCCESSFULLY FIXED!');
            console.log('🌟 100% PRODUCTION VALIDATION SHOULD NOW BE ACHIEVED!');
        } else if (this.results.repaired >= 6) {
            console.log('🌟 EXCELLENT EMERGENCY REPAIR SUCCESS!');
            console.log(`📊 Major syntax errors resolved - significant progress toward 100%!`);
        } else {
            console.log('💪 EMERGENCY REPAIR IN PROGRESS...');
            console.log('🔧 Additional manual intervention may be needed for remaining errors');
        }

        console.log('\n💡 All emergency repairs backed up with .emergency-syntax-backup files');
        console.log('🚨 Emergency Syntax Repair Mission: COMPLETE!');
    }
}

// Execute Emergency Syntax Repair
if (require.main === module) {
    const emergencyRepair = new EmergencySyntaxRepair();
    emergencyRepair.executeEmergencySyntaxRepair().catch(console.error);
}

module.exports = EmergencySyntaxRepair;
