const fs = require('fs');
const path = require('path');

class VancouverFallbackHunter {
    constructor() {
        this.results = {
            totalAnalyzed: 0,
            fallbacksFound: 0,
            patternAnalysis: new Map(),
            complexCases: [],
            fixablePatterns: [],
            manualReviewNeeded: [],
            errors: 0
        };

        // Enhanced fallback patterns discovered from validation failures
        this.detailedFallbackPatterns = [
            // Direct validation failures patterns
            { name: 'Sample event', pattern: /sample\s+event/gi, severity: 'high' },
            { name: 'First event fallback', pattern: /first\s+event/gi, severity: 'high' },
            { name: 'Fallback event', pattern: /fallback\s+event/gi, severity: 'critical' },
            { name: 'Test script pattern', pattern: /test\s+script\s+for/gi, severity: 'high' },
            { name: 'teString issues', pattern: /teString/gi, severity: 'critical' },
            { name: 'sampleEvent variable', pattern: /sampleEvent/gi, severity: 'high' },
            { name: 'Mock event pattern', pattern: /mock\s+event/gi, severity: 'medium' },
            { name: 'Placeholder event', pattern: /placeholder\s+event/gi, severity: 'medium' },
            { name: 'Demo event', pattern: /demo\s+event/gi, severity: 'medium' },
            
            // Complex patterns from validation
            { name: 'Event array creation', pattern: /Array\(\d+\)\.fill\(/gi, severity: 'critical' },
            { name: 'Loop-based events', pattern: /for\s*\(\s*let\s+i\s*=\s*0.*events/gi, severity: 'critical' },
            { name: 'Hardcoded event titles', pattern: /title:\s*["'`](Sample|Test|Mock|Demo|Example)/gi, severity: 'high' },
            { name: 'Return sample arrays', pattern: /return\s*\[[^\]]*sample[^\]]*\]/gi, severity: 'critical' },
            
            // Subtle patterns
            { name: 'Event object literals', pattern: /{\s*title:\s*["'`][^"'`]*sample[^"'`]*["'`]/gi, severity: 'medium' },
            { name: 'Conditional fallbacks', pattern: /if\s*\([^)]*length.*===?\s*0[^}]*{[^}]*sample/gi, severity: 'critical' },
            { name: 'Empty events fallback', pattern: /if\s*\(!\s*events.*length[^}]*{[^}]*return\s*\[[^\]]*sample/gi, severity: 'critical' },
            
            // Vancouver-specific patterns
            { name: 'Vancouver hardcoded', pattern: /["'`]Vancouver["'`]/gi, severity: 'medium' },
            { name: 'BC hardcoded', pattern: /["'`]British\s+Columbia["'`]/gi, severity: 'low' },
            
            // Development artifacts
            { name: 'Console.log samples', pattern: /console\.log\([^)]*sample/gi, severity: 'low' },
            { name: 'TODO comments', pattern: /\/\/\s*TODO.*sample/gi, severity: 'low' },
            { name: 'Debug statements', pattern: /debug.*sample/gi, severity: 'low' },
        ];
    }

    async executeVancouverFallbackAnalysis() {
        console.log('🔍 VANCOUVER FALLBACK HUNTER');
        console.log('============================');
        console.log('Mission: Hunt down 93 stubborn fallback violations');
        console.log('Goal: Identify patterns and create targeted fixes');
        console.log('Target: Push Vancouver to 80%+ success rate\n');

        const cityDir = path.join('cities', 'vancouver');
        
        if (!fs.existsSync(cityDir)) {
            console.log('❌ Vancouver directory not found!');
            return;
        }

        // Get all Vancouver scraper files (excluding backups and tests)
        const scraperFiles = fs.readdirSync(cityDir)
            .filter(file => 
                file.endsWith('.js') && 
                !file.includes('backup') && 
                !file.includes('test-') &&
                !file.includes('verify-') &&
                !file.includes('validate') &&
                !file.includes('index')
            )
            .sort();

        console.log(`🔍 Analyzing ${scraperFiles.length} Vancouver scrapers for stubborn fallbacks\n`);

        // Phase 1: Deep analysis of each file
        for (const fileName of scraperFiles) {
            await this.analyzeVancouverFile(cityDir, fileName);
        }

        // Phase 2: Pattern analysis and recommendations
        this.analyzePatternsAndRecommendations();

        this.printVancouverFallbackSummary();
    }

    async analyzeVancouverFile(cityDir, fileName) {
        const filePath = path.join(cityDir, fileName);
        
        this.results.totalAnalyzed++;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const foundPatterns = [];
            let hasFallbacks = false;

            console.log(`🔍 Analyzing: ${fileName}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // Check each detailed pattern
            for (const patternConfig of this.detailedFallbackPatterns) {
                const matches = [...content.matchAll(patternConfig.pattern)];
                if (matches.length > 0) {
                    hasFallbacks = true;
                    foundPatterns.push({
                        name: patternConfig.name,
                        severity: patternConfig.severity,
                        matches: matches.length,
                        examples: matches.slice(0, 3).map(m => m[0])
                    });

                    // Update pattern analysis
                    const key = patternConfig.name;
                    if (!this.results.patternAnalysis.has(key)) {
                        this.results.patternAnalysis.set(key, {
                            count: 0,
                            severity: patternConfig.severity,
                            files: []
                        });
                    }
                    const existing = this.results.patternAnalysis.get(key);
                    existing.count += matches.length;
                    existing.files.push(fileName);
                }
            }

            if (hasFallbacks) {
                this.results.fallbacksFound++;
                console.log(`   🚨 FALLBACK VIOLATIONS DETECTED:`);
                
                foundPatterns.forEach(pattern => {
                    const severity = pattern.severity === 'critical' ? '🔴' : 
                                   pattern.severity === 'high' ? '🟠' : 
                                   pattern.severity === 'medium' ? '🟡' : '🟢';
                    console.log(`      ${severity} ${pattern.name}: ${pattern.matches} matches`);
                    if (pattern.examples.length > 0) {
                        console.log(`         Examples: ${pattern.examples.join(', ')}`);
                    }
                });

                // Categorize for fixing
                const criticalPatterns = foundPatterns.filter(p => p.severity === 'critical');
                const highPatterns = foundPatterns.filter(p => p.severity === 'high');
                
                if (criticalPatterns.length > 0 || highPatterns.length > 0) {
                    this.results.fixablePatterns.push({
                        fileName,
                        patterns: foundPatterns,
                        priority: criticalPatterns.length > 0 ? 'critical' : 'high'
                    });
                } else {
                    this.results.manualReviewNeeded.push({
                        fileName,
                        patterns: foundPatterns,
                        reason: 'Complex patterns requiring manual review'
                    });
                }
            } else {
                console.log(`   ✅ Clean - no fallbacks detected`);
            }

        } catch (error) {
            console.log(`   ❌ Error analyzing ${fileName}: ${error.message}`);
            this.results.errors++;
        }

        console.log(); // Add spacing
    }

    analyzePatternsAndRecommendations() {
        console.log('\n🔍 PATTERN ANALYSIS & RECOMMENDATIONS');
        console.log('=====================================');

        // Sort patterns by frequency
        const sortedPatterns = Array.from(this.results.patternAnalysis.entries())
            .sort((a, b) => b[1].count - a[1].count);

        console.log('\n📊 TOP FALLBACK PATTERNS FOUND:');
        sortedPatterns.slice(0, 10).forEach(([pattern, data], index) => {
            const severity = data.severity === 'critical' ? '🔴' : 
                           data.severity === 'high' ? '🟠' : 
                           data.severity === 'medium' ? '🟡' : '🟢';
            console.log(`   ${index + 1}. ${severity} ${pattern}: ${data.count} occurrences in ${data.files.length} files`);
        });

        // Categorize files by fixability
        console.log('\n🎯 FIXABILITY ANALYSIS:');
        console.log(`   🔧 Fixable with automation: ${this.results.fixablePatterns.length} files`);
        console.log(`   📝 Manual review needed: ${this.results.manualReviewNeeded.length} files`);

        console.log('\n🛠️ RECOMMENDED FIXING STRATEGY:');
        console.log('   1. Target CRITICAL patterns first (immediate impact)');
        console.log('   2. Apply HIGH severity pattern fixes (major impact)');
        console.log('   3. Review MEDIUM patterns for context (safety check)');
        console.log('   4. Manual review of complex cases');
    }

    printVancouverFallbackSummary() {
        console.log('\n\n🔍 VANCOUVER FALLBACK HUNTER SUMMARY');
        console.log('====================================');
        console.log(`🔍 Files Analyzed: ${this.results.totalAnalyzed}`);
        console.log(`🚨 Files with Fallbacks: ${this.results.fallbacksFound}`);
        console.log(`🔧 Fixable Files: ${this.results.fixablePatterns.length}`);
        console.log(`📝 Manual Review Needed: ${this.results.manualReviewNeeded.length}`);
        console.log(`❌ Analysis Errors: ${this.results.errors}`);

        console.log('\n🎯 TARGET ANALYSIS:');
        const potentialFixes = this.results.fixablePatterns.length;
        const currentPassing = 162;
        const projectedPassing = currentPassing + potentialFixes;
        const projectedRate = ((projectedPassing / 275) * 100).toFixed(1);
        
        console.log(`Current Vancouver Success: 162/275 (58.9%)`);
        console.log(`Potential Fixes Available: ${potentialFixes} files`);
        console.log(`Projected Success: ${projectedPassing}/275 (${projectedRate}%)`);
        
        if (parseFloat(projectedRate) >= 70.0) {
            console.log('🎉 TARGET ACHIEVABLE! 70%+ success rate within reach!');
        } else if (parseFloat(projectedRate) >= 65.0) {
            console.log('🚀 GOOD PROGRESS! Additional targeted fixes may reach 70%+');
        } else {
            console.log('📝 MANUAL REVIEW REQUIRED for remaining complex cases');
        }

        console.log('\n🚀 NEXT PHASE:');
        console.log('1. Create Vancouver Fallback Eliminator script');
        console.log('2. Target critical and high-severity patterns');
        console.log('3. Run automated fixes with safety backups');
        console.log('4. Validate results and measure success');
        
        console.log('\n🔍 Vancouver Fallback Hunter Analysis: COMPLETE!');
    }
}

// Execute Vancouver Fallback Hunter
if (require.main === module) {
    const hunter = new VancouverFallbackHunter();
    hunter.executeVancouverFallbackAnalysis().catch(console.error);
}

module.exports = VancouverFallbackHunter;
