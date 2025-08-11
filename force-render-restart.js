/**
 * 🔄 FORCE RENDER SERVER RESTART
 * 
 * Production server still returns 404 because it hasn't restarted.
 * Need to force Render to deploy/restart the server.
 * 
 * Methods:
 * 1. Make a small code change to trigger redeploy
 * 2. Git commit and push to trigger automatic redeploy
 * 3. Update environment variables if possible
 */

const fs = require('fs');
const path = require('path');

function forceRenderRestart() {
    console.log('🔄 FORCING RENDER SERVER RESTART\n');
    console.log('🚨 Production server still returns 404 - need to restart!\n');
    
    // Method 1: Add a timestamp comment to force redeploy
    const serverFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/unified-proxy-server.js';
    
    if (fs.existsSync(serverFile)) {
        console.log('📝 STEP 1: Adding timestamp to trigger redeploy...\n');
        
        let content = fs.readFileSync(serverFile, 'utf8');
        
        // Add a timestamp comment at the top to force redeployment
        const timestamp = new Date().toISOString();
        const timestampComment = `// Last updated: ${timestamp} - Force restart for database fix\n`;
        
        // Remove any existing timestamp comments
        content = content.replace(/\/\/ Last updated:.*\n/g, '');
        
        // Add new timestamp at the beginning
        content = timestampComment + content;
        
        fs.writeFileSync(serverFile, content);
        console.log(`✅ Added timestamp comment: ${timestamp}`);
        console.log('📝 This change will trigger Render to redeploy the server');
        
        // Also update package.json version to ensure rebuild
        const packageFile = '/Users/seongwoohan/CascadeProjects/discovr-api-server/package.json';
        
        if (fs.existsSync(packageFile)) {
            console.log('\n📦 STEP 2: Updating package.json version...\n');
            
            let packageContent = fs.readFileSync(packageFile, 'utf8');
            let packageJson = JSON.parse(packageContent);
            
            // Increment patch version
            const currentVersion = packageJson.version || '1.0.0';
            const versionParts = currentVersion.split('.');
            const newPatch = (parseInt(versionParts[2]) + 1);
            const newVersion = `${versionParts[0]}.${versionParts[1]}.${newPatch}`;
            
            packageJson.version = newVersion;
            
            fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2));
            console.log(`✅ Updated version: ${currentVersion} → ${newVersion}`);
        }
        
        console.log('\n🚀 STEP 3: Creating deployment commit...\n');
        console.log('Run these commands to trigger Render redeploy:');
        console.log('');
        console.log('cd /Users/seongwoohan/CascadeProjects/discovr-api-server');
        console.log('git add .');
        console.log('git commit -m "Force restart: Fix database connection to discovr"');
        console.log('git push');
        console.log('');
        console.log('📋 This will trigger automatic redeploy on Render');
        console.log('⏱️ Redeploy typically takes 2-3 minutes');
        console.log('✅ After redeploy, mobile app should work!');
        
    } else {
        console.log('❌ Server file not found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RENDER RESTART PREPARATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('📝 Code changes made to trigger redeploy');
    console.log('🚀 Run git commit + push to restart production server');
    console.log('📱 Mobile app will work after Render redeploys');
}

forceRenderRestart();
