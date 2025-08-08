const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ComprehensiveSyntaxHunter {
    constructor() {
        // All 10 stubborn files that need comprehensive syntax repair
        this.targetFiles = [
            // Toronto (9)
            { city: 'Toronto', file: 'scrape-all-toronto.js' },
            { city: 'Toronto', file: 'scrape-downsview-park-events.js' },
            { city: 'Toronto', file: 'scrape-drom-taberna-events.js' },
            { city: 'Toronto', file: 'scrape-fisher-library-events.js' },
            { city: 'Toronto', file: 'scrape-harbourfront-events.js' },
            { city: 'Toronto', file: 'scrape-henderson-brewing-events.js' },
            { city: 'Toronto', file: 'scrape-junction-craft-events.js' },
            { city: 'Toronto', file: 'scrape-mascot-brewery-events.js' },
            { city: 'Toronto', file: 'scrape-todocanada-toronto-events.js' },
            // Vancouver (1)
            { city: 'vancouver', file: 'scrape-todocanada-vancouver-events.js' }
        ];

        this.results = {
            totalFiles: this.targetFiles.length,
            syntaxFixed: 0,
            stillBroken: 0,
            errors: 0,
            details: []
        };

        // Comprehensive syntax error patterns discovered
        this.syntaxPatterns = [
            // Missing closing parentheses
            {
                name: 'Missing closing parenthesis in findOne',
                pattern: /\.findOne\(\s*{[^}]*}\s*;/g,
                fix: (match) => match.replace(';', ')')
            },
            {
                name: 'Missing closing parenthesis in function calls',
                pattern: /await\s+[a-zA-Z_][a-zA-Z0-9_.]*\([^)]*;(?=\s*$)/gm,
                fix: (match) => match.replace(';', ')')
            },
            // Malformed database collections
            {
                name: 'Malformed database collection',
                pattern: /const eventsCollection = (dbs|databases|client\.db\([^)]*\))'\);?/g,
                fix: () => "const eventsCollection = client.db('events').collection('events');"
            },
            // Incomplete string literals
            {
                name: 'Incomplete string literals',
                pattern: /'\);$/gm,
                fix: (match) => match.replace(/'\);$/, "')")
            },
            // Extra semicolons in object access
            {
                name: 'Extra semicolons in object access',
                pattern: /\.\w+\s*;\s*}/g,
                fix: (match) => match.replace(/;\s*}/, ' }')
            },
            // Malformed await expressions
            {
                name: 'Malformed await expressions',
                pattern: /await\s+[^;]+;\s*(?=\s*[)}])/g,
                fix: (match) => match.replace(/;\s*$/, '')
            },
            // Missing quotes in object keys
            {
                name: 'Missing quotes around object keys',
                pattern: /{\s*sourceId:\s*event\.sourceId\s*;/g,
                fix: () => '{ sourceId: event.sourceId }'
            }
        ];
    }

    async executeComprehensiveSyntaxHunt() {
        console.log('🔍 COMPREHENSIVE SYNTAX HUNTER MISSION');
        console.log('====================================');
        console.log('🎯 Mission: Hunt and eliminate ALL syntax errors in stubborn files');
        console.log('🔧 Strategy: Multi-layer syntax pattern detection and repair');
        console.log('📊 Target: Achieve 100% syntax validity for ultimate validation success\n');

        console.log('🔍 DISCOVERED SYNTAX ERROR LAYERS:');
        console.log('   Layer 1: ❌ const eventsCollection = dbs\'); (FIXED)');
        console.log('   Layer 2: ❌ const existing = await collection.findOne({ ... };');
        console.log('   Layer 3: ❌ Missing parentheses, quotes, semicolons');
        console.log('   Layer 4: ❌ Malformed await expressions');
        console.log('   Target:  ✅ Complete syntax validity\n');

        // Hunt and repair each file comprehensively
        for (let i = 0; i < this.targetFiles.length; i++) {
            const target = this.targetFiles[i];
            console.log(`\n🔍 SYNTAX HUNT ${i + 1}/10: ${target.city}/${target.file}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const result = await this.huntAndRepairSyntax(target);
            this.results.details.push({ ...target, result });

            if (result.status === 'fixed') {
                this.results.syntaxFixed++;
                console.log(`   ✅ SYNTAX REPAIRED: ${target.file} (${result.fixesApplied} fixes)`);
            } else if (result.status === 'broken') {
                this.results.stillBroken++;
                console.log(`   🔧 STILL BROKEN: ${target.file} - ${result.error}`);
            } else if (result.status === 'error') {
                this.results.errors++;
                console.log(`   ❌ HUNT ERROR: ${target.file} - ${result.error}`);
            }
        }

        // Final comprehensive validation
        await this.runComprehensiveValidation();
        this.printSyntaxHuntResults();
    }

    async huntAndRepairSyntax(target) {
        const cityDirName = target.city === 'New York' ? 'New York' : target.city;
        const filePath = path.join('cities', cityDirName, target.file);

        try {
            if (!fs.existsSync(filePath)) {
                return { status: 'error', error: 'File not found' };
            }

            const originalContent = fs.readFileSync(filePath, 'utf8');
            let repairedContent = originalContent;
            let fixesApplied = 0;
            const appliedFixes = [];

            // Apply all comprehensive syntax patterns
            for (const pattern of this.syntaxPatterns) {
                const beforeContent = repairedContent;
                
                if (pattern.pattern.global) {
                    repairedContent = repairedContent.replace(pattern.pattern, pattern.fix);
                } else {
                    const matches = repairedContent.match(pattern.pattern);
                    if (matches) {
                        for (const match of matches) {
                            repairedContent = repairedContent.replace(match, pattern.fix(match));
                        }
                    }
                }
                
                if (repairedContent !== beforeContent) {
                    fixesApplied++;
                    appliedFixes.push(pattern.name);
                }
            }

            // Additional manual fixes for specific patterns
            repairedContent = this.applyManualSyntaxFixes(repairedContent);

            // Count additional manual fixes
            if (repairedContent !== originalContent && fixesApplied === 0) {
                fixesApplied = 1;
                appliedFixes.push('Manual syntax repair');
            }

            if (repairedContent !== originalContent) {
                // Create backup
                fs.writeFileSync(`${filePath}.comprehensive-backup`, originalContent);
                
                // Apply repairs
                fs.writeFileSync(filePath, repairedContent);
                
                // Test syntax validity
                const syntaxValid = await this.testSyntaxValidity(filePath);
                
                if (syntaxValid) {
                    console.log(`   🔧 Applied fixes: ${appliedFixes.join(', ')}`);
                    return { status: 'fixed', fixesApplied, appliedFixes };
                } else {
                    const syntaxError = await this.getSyntaxError(filePath);
                    console.log(`   ⚠️ Still has syntax errors: ${syntaxError}`);
                    return { status: 'broken', error: syntaxError, fixesApplied };
                }
            } else {
                // Test existing syntax
                const syntaxValid = await this.testSyntaxValidity(filePath);
                if (syntaxValid) {
                    return { status: 'already-valid' };
                } else {
                    const syntaxError = await this.getSyntaxError(filePath);
                    return { status: 'broken', error: syntaxError };
                }
            }

        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }

    applyManualSyntaxFixes(content) {
        return content
            // Fix specific patterns discovered in manual testing
            .replace(/\.findOne\(\s*{\s*sourceId:\s*event\.sourceId\s*;\s*}/g, '.findOne({ sourceId: event.sourceId })')
            .replace(/\.findOne\(\s*{\s*([^}]+)\s*;\s*}/g, '.findOne({ $1 })')
            .replace(/await\s+([^;]+);\s*(?=\s*[)}])/g, 'await $1')
            .replace(/const eventsCollection = [^;]*'\);?/g, "const eventsCollection = client.db('events').collection('events');")
            .replace(/'\)\s*;(?=\s*$)/gm, "')")
            .replace(/;\s*}\s*(?=\s*[,)])/g, ' }')
            // Clean up multiple whitespace
            .replace(/\n\s*\n\s*\n\s*\n/g, '\n\n')
            .replace(/[ \t]+$/gm, '')
            .trim();
    }

    async testSyntaxValidity(filePath) {
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
            // Extract meaningful error message
            const errorLines = error.stderr.split('\n');
            for (const line of errorLines) {
                if (line.includes('SyntaxError:')) {
                    return line.replace(/^.*SyntaxError:\s*/, '');
                }
            }
            return error.stderr.substring(0, 100);
        }
    }

    async runComprehensiveValidation() {
        console.log('\n\n🎯 COMPREHENSIVE FINAL VALIDATION');
        console.log('=================================');
        console.log('Running production-only validation after comprehensive syntax repair...\n');

        try {
            const { stdout } = await execAsync('node production-only-validator.js');
            console.log(stdout);
        } catch (error) {
            console.log('❌ Comprehensive validation error:', error.message);
        }
    }

    printSyntaxHuntResults() {
        console.log('\n\n🔍 COMPREHENSIVE SYNTAX HUNT RESULTS');
        console.log('===================================');
        console.log(`🎯 Total Files Hunted: ${this.results.totalFiles}`);
        console.log(`✅ Syntax Successfully Fixed: ${this.results.syntaxFixed}`);
        console.log(`🔧 Still Syntax Broken: ${this.results.stillBroken}`);
        console.log(`❌ Hunt Errors: ${this.results.errors}`);

        console.log('\n📊 PER-FILE HUNT RESULTS:');
        this.results.details.forEach((detail, i) => {
            let status, message;
            if (detail.result.status === 'fixed') {
                status = '✅';
                message = `fixed (${detail.result.fixesApplied} repairs)`;
            } else if (detail.result.status === 'already-valid') {
                status = '🟢';
                message = 'already valid';
            } else if (detail.result.status === 'broken') {
                status = '🔧';
                message = `broken: ${detail.result.error}`;
            } else {
                status = '❌';
                message = `error: ${detail.result.error}`;
            }
            
            console.log(`   ${i + 1}. ${status} ${detail.city}/${detail.file}: ${message}`);
        });

        const huntSuccessRate = ((this.results.syntaxFixed / this.results.totalFiles) * 100).toFixed(1);
        console.log(`\n🎯 SYNTAX HUNT SUCCESS RATE: ${huntSuccessRate}%`);

        console.log('\n🔍 COMPREHENSIVE SYNTAX HUNT IMPACT:');
        console.log('📈 Previous Success: 98.3% (594/604 production scrapers)');
        
        if (this.results.syntaxFixed === this.results.totalFiles) {
            console.log('🎉 🎉 🎉 PERFECT COMPREHENSIVE SYNTAX HUNT! 🎉 🎉 🎉');
            console.log('🏆 ALL 10 STUBBORN FILES HAVE VALID SYNTAX!');
            console.log('🌟 100% PRODUCTION VALIDATION SHOULD NOW BE ACHIEVED!');
        } else if (this.results.syntaxFixed >= 8) {
            console.log('🌟 EXCELLENT SYNTAX HUNT SUCCESS!');
            console.log(`📊 Major syntax repairs achieved - significant progress!`);
        } else if (this.results.syntaxFixed >= 5) {
            console.log('🚀 GOOD SYNTAX HUNT PROGRESS!');
            console.log(`📈 Substantial syntax improvements made!`);
        } else {
            console.log('🔧 SYNTAX HUNT CONTINUES...');
            console.log('💪 These are the most stubborn syntax errors - deep manual intervention needed');
        }

        console.log('\n💡 All syntax repairs backed up with .comprehensive-backup files');
        console.log('🔍 Comprehensive Syntax Hunt Mission: COMPLETE!');
    }
}

// Execute Comprehensive Syntax Hunter
if (require.main === module) {
    const syntaxHunter = new ComprehensiveSyntaxHunter();
    syntaxHunter.executeComprehensiveSyntaxHunt().catch(console.error);
}

module.exports = ComprehensiveSyntaxHunter;
