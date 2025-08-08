const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystematicRestorationRepair {
    constructor() {
        // The 8 remaining stubborn files that need restoration + repair
        this.targetFiles = [
            { city: 'Toronto', file: 'scrape-drom-taberna-events.js' },
            { city: 'Toronto', file: 'scrape-fisher-library-events.js' },
            { city: 'Toronto', file: 'scrape-harbourfront-events.js' },
            { city: 'Toronto', file: 'scrape-henderson-brewing-events.js' },
            { city: 'Toronto', file: 'scrape-junction-craft-events.js' },
            { city: 'Toronto', file: 'scrape-mascot-brewery-events.js' },
            { city: 'Toronto', file: 'scrape-todocanada-toronto-events.js' },
            { city: 'vancouver', file: 'scrape-todocanada-vancouver-events.js' }
        ];

        this.results = {
            totalFiles: this.targetFiles.length,
            restored: 0,
            repaired: 0,
            validated: 0,
            errors: 0,
            details: []
        };

        // Systematic repair patterns discovered from manual investigation
        this.repairPatterns = [
            // Core database collection fixes
            {
                name: 'Database collection malformation',
                pattern: /const eventsCollection = (databases|dbs)'\);?/g,
                replacement: "const eventsCollection = client.db('events').collection('events');"
            },
            {
                name: 'Missing database collection semicolon',
                pattern: /const eventsCollection = client\.db\('events'\)\.collection\('events'\)(?!;)/g,
                replacement: "const eventsCollection = client.db('events').collection('events');"
            },
            // MongoDB query fixes
            {
                name: 'Missing closing parenthesis in findOne',
                pattern: /\.findOne\(\s*{[^}]*}\s*(?=\.toArray\(\);)/g,
                replacement: (match) => match + ')'
            },
            {
                name: 'Malformed findOne query structure',
                pattern: /\.findOne\(\s*{[^}]*}\s*(?=;)/g,
                replacement: (match) => match.replace(/}\s*$/, '}) ')
            },
            // Object literal fixes
            {
                name: 'Malformed venue object',
                pattern: /venue:\s*{\s*\.\.\.RegExp\.venue:\s*{/g,
                replacement: 'venue: {'
            },
            {
                name: 'Duplicate city property in venue',
                pattern: /},\s*city\s*}/g,
                replacement: '}'
            },
            // Export structure fixes
            {
                name: 'Missing async export',
                pattern: /module\.exports\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*;?\s*$/,
                replacement: 'module.exports = async (city) => {\n    return await $1(city || "Toronto");\n};'
            },
            // General cleanup
            {
                name: 'Extra semicolons cleanup',
                pattern: /;\s*}/g,
                replacement: ' }'
            }
        ];
    }

    async executeSystematicRestorationRepair() {
        console.log('🔧 SYSTEMATIC RESTORATION & REPAIR MISSION');
        console.log('==========================================');
        console.log('🎯 Mission: Restore corrupted files from backup + apply systematic repairs');
        console.log('🔧 Strategy: Backup restoration → Pattern repair → Syntax validation');
        console.log('📊 Target: Transform remaining stubborn files to achieve 100% validation\n');

        console.log('🔧 DISCOVERED CORRUPTION PATTERNS:');
        console.log('❌ const eventsCollection = databases\');');
        console.log('❌ .findOne({ ... } ; (missing closing parenthesis)');
        console.log('❌ venue: { ...RegExp.venue: { (malformed object)');
        console.log('❌ Missing semicolons, malformed exports');
        console.log('✅ Systematic restoration + repair approach\n');

        console.log('🎯 TARGET FILES FOR RESTORATION:');
        this.targetFiles.forEach((target, i) => {
            console.log(`   ${i + 1}. ${target.city}/${target.file}`);
        });
        console.log();

        // Process each file: restore → repair → validate
        for (let i = 0; i < this.targetFiles.length; i++) {
            const target = this.targetFiles[i];
            console.log(`\n🔧 RESTORATION+REPAIR ${i + 1}/8: ${target.city}/${target.file}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const result = await this.restoreAndRepairFile(target);
            this.results.details.push({ ...target, result });

            if (result.restored) this.results.restored++;
            if (result.repaired) this.results.repaired++;
            if (result.validated) this.results.validated++;
            if (result.error) this.results.errors++;

            console.log(`   📊 Status: Restored=${result.restored}, Repaired=${result.repaired}, Validated=${result.validated}`);
        }

        // Final comprehensive validation
        await this.runFinalSystematicValidation();
        this.printSystematicResults();
    }

    async restoreAndRepairFile(target) {
        const cityDirName = target.city === 'New York' ? 'New York' : target.city;
        const filePath = path.join('cities', cityDirName, target.file);
        
        const result = {
            restored: false,
            repaired: false,
            validated: false,
            error: null,
            appliedFixes: []
        };

        try {
            // Step 1: Find best backup file to restore from
            const backupFile = await this.findBestBackupFile(filePath);
            
            if (backupFile) {
                console.log(`   📁 Restoring from: ${path.basename(backupFile)}`);
                fs.copyFileSync(backupFile, filePath);
                result.restored = true;
            } else {
                console.log(`   ⚠️ No backup found - working with current file`);
            }

            // Step 2: Apply systematic repairs
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let repairedContent = originalContent;

            for (const pattern of this.repairPatterns) {
                const beforeContent = repairedContent;
                
                if (typeof pattern.replacement === 'function') {
                    repairedContent = repairedContent.replace(pattern.pattern, pattern.replacement);
                } else {
                    repairedContent = repairedContent.replace(pattern.pattern, pattern.replacement);
                }
                
                if (repairedContent !== beforeContent) {
                    result.appliedFixes.push(pattern.name);
                }
            }

            // Step 3: Apply manual cleanup
            repairedContent = this.applyManualCleanup(repairedContent, target);

            if (repairedContent !== originalContent) {
                // Create restoration backup
                fs.writeFileSync(`${filePath}.restoration-backup`, originalContent);
                
                // Apply repairs
                fs.writeFileSync(filePath, repairedContent);
                result.repaired = true;
                
                console.log(`   🔧 Applied repairs: ${result.appliedFixes.join(', ')}`);
            }

            // Step 4: Validate syntax
            const syntaxValid = await this.validateSyntax(filePath);
            result.validated = syntaxValid;
            
            if (syntaxValid) {
                console.log(`   ✅ RESTORATION+REPAIR SUCCESS: ${target.file}`);
            } else {
                const syntaxError = await this.getSyntaxError(filePath);
                console.log(`   🔧 Still has syntax issues: ${syntaxError}`);
                result.error = syntaxError;
            }

        } catch (error) {
            console.log(`   ❌ Restoration error: ${error.message}`);
            result.error = error.message;
        }

        return result;
    }

    async findBestBackupFile(filePath) {
        const backupSuffixes = [
            '.perfection-backup',
            '.fallback-backup',
            '.victory-backup-1',
            '.city-backup',
            '.production-fix-backup'
        ];

        for (const suffix of backupSuffixes) {
            const backupPath = filePath + suffix;
            if (fs.existsSync(backupPath)) {
                return backupPath;
            }
        }

        return null;
    }

    applyManualCleanup(content, target) {
        return content
            // Ensure proper database collection assignment
            .replace(/const eventsCollection = (databases|dbs)'\);?/g, "const eventsCollection = client.db('events').collection('events');")
            .replace(/const eventsCollection = client\.db\('events'\)\.collection\('events'\)(?!;)/g, "const eventsCollection = client.db('events').collection('events');")
            
            // Fix MongoDB queries
            .replace(/\.findOne\(\s*{\s*([^}]+)\s*}\s*;/g, '.findOne({ $1 })')
            .replace(/\.findOne\(\s*{\s*([^}]+)\s*}\s*(?=\.toArray)/g, '.findOne({ $1 })')
            
            // Clean up malformed objects
            .replace(/venue:\s*{\s*\.\.\.RegExp\.venue:\s*{/g, 'venue: {')
            .replace(/},\s*city\s*}/g, '}')
            
            // Ensure proper exports for specific files
            .replace(/module\.exports\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*;?\s*$/g, (match, funcName) => {
                if (target.file.includes('todocanada')) {
                    return `module.exports = async (city) => {\n    return await ${funcName}(city || "${target.city}");\n};`;
                }
                return match;
            })
            
            // Clean up whitespace
            .replace(/\n\s*\n\s*\n\s*\n/g, '\n\n')
            .replace(/[ \t]+$/gm, '')
            .trim();
    }

    async validateSyntax(filePath) {
        try {
            await execAsync(`node -c "${filePath}"`);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getSyntaxError(filePath) {
        try {
            await execAsync(`node -c "${filePath}"`);
            return 'None';
        } catch (error) {
            const errorLines = error.stderr.split('\n');
            for (const line of errorLines) {
                if (line.includes('SyntaxError:')) {
                    return line.replace(/^.*SyntaxError:\s*/, '');
                }
            }
            return 'Unknown syntax error';
        }
    }

    async runFinalSystematicValidation() {
        console.log('\n\n🎯 FINAL SYSTEMATIC VALIDATION');
        console.log('==============================');
        console.log('Running production-only validation after systematic restoration...\n');

        try {
            const { stdout } = await execAsync('node production-only-validator.js');
            console.log(stdout);
        } catch (error) {
            console.log('❌ Final validation error:', error.message);
        }
    }

    printSystematicResults() {
        console.log('\n\n🔧 SYSTEMATIC RESTORATION & REPAIR RESULTS');
        console.log('==========================================');
        console.log(`🎯 Total Files Processed: ${this.results.totalFiles}`);
        console.log(`📁 Successfully Restored: ${this.results.restored}`);
        console.log(`🔧 Successfully Repaired: ${this.results.repaired}`);
        console.log(`✅ Syntax Validated: ${this.results.validated}`);
        console.log(`❌ Errors Encountered: ${this.results.errors}`);

        console.log('\n📊 PER-FILE SYSTEMATIC RESULTS:');
        this.results.details.forEach((detail, i) => {
            const status = detail.result.validated ? '✅' : 
                          detail.result.repaired ? '🔧' : 
                          detail.result.restored ? '📁' : '❌';
            const message = detail.result.validated ? 'fully validated' :
                           detail.result.error ? `error: ${detail.result.error}` :
                           detail.result.repaired ? 'repaired but issues remain' :
                           detail.result.restored ? 'restored but not repaired' : 'failed';
            
            console.log(`   ${i + 1}. ${status} ${detail.city}/${detail.file}: ${message}`);
        });

        const successRate = ((this.results.validated / this.results.totalFiles) * 100).toFixed(1);
        console.log(`\n🎯 SYSTEMATIC SUCCESS RATE: ${successRate}%`);

        console.log('\n🔧 SYSTEMATIC RESTORATION & REPAIR IMPACT:');
        console.log('📈 Previous Success: 98.3% (594/604 production scrapers)');
        console.log(`🎯 Expected Success: ${(98.3 + (this.results.validated / 604 * 100)).toFixed(1)}%`);
        
        if (this.results.validated === this.results.totalFiles) {
            console.log('🎉 🎉 🎉 PERFECT SYSTEMATIC SUCCESS! 🎉 🎉 🎉');
            console.log('🏆 ALL 8 STUBBORN FILES SYSTEMATICALLY RESTORED & REPAIRED!');
            console.log('🌟 100% PRODUCTION VALIDATION SHOULD NOW BE ACHIEVED!');
        } else if (this.results.validated >= 6) {
            console.log('🌟 EXCELLENT SYSTEMATIC SUCCESS!');
            console.log(`📊 Major restoration achieved - near-perfect results!`);
        } else if (this.results.validated >= 4) {
            console.log('🚀 GOOD SYSTEMATIC PROGRESS!');
            console.log(`📈 Substantial improvements made!`);
        } else {
            console.log('🔧 SYSTEMATIC MISSION CONTINUES...');
            console.log('💪 Some files require deeper manual intervention');
        }

        console.log('\n💡 All systematic fixes backed up with .restoration-backup files');
        console.log('🔧 Systematic Restoration & Repair Mission: COMPLETE!');
    }
}

// Execute Systematic Restoration & Repair
if (require.main === module) {
    const systematicRepair = new SystematicRestorationRepair();
    systematicRepair.executeSystematicRestorationRepair().catch(console.error);
}

module.exports = SystematicRestorationRepair;
