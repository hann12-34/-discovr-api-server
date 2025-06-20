/**
 * Heroku deployment configuration helper
 * Run this script before deployment to ensure proper Heroku setup
 */

const fs = require('fs');
const path = require('path');

console.log('Setting up Discovr API server for Heroku deployment...');

// Create or update Procfile
const procfilePath = path.join(__dirname, 'Procfile');
const procfileContent = 'web: node server.js';

fs.writeFileSync(procfilePath, procfileContent);
console.log('✅ Created Procfile');

// Ensure we have a .gitignore file with proper entries
const gitignorePath = path.join(__dirname, '.gitignore');
let gitignoreContent = '';

if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
}

// Add required gitignore entries if not present
const requiredEntries = ['.env', 'node_modules', '.DS_Store', 'npm-debug.log', 'logs'];
let updatedGitignore = gitignoreContent;

for (const entry of requiredEntries) {
  if (!gitignoreContent.includes(entry)) {
    updatedGitignore += `\n${entry}`;
  }
}

fs.writeFileSync(gitignorePath, updatedGitignore);
console.log('✅ Updated .gitignore file');

// Check if engines is specified in package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = require(packageJsonPath);

if (!packageJson.engines) {
  packageJson.engines = { 
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Added Node.js engine specification to package.json');
}

console.log('\n🚀 Heroku setup complete!');
console.log('\nNext steps:');
console.log('1. Install the Heroku CLI: brew install heroku/brew/heroku');
console.log('2. Login to Heroku: heroku login');
console.log('3. Create a Heroku app: heroku create discovr-api-server');
console.log('4. Set up MongoDB: heroku addons:create mongolab:sandbox');
console.log('5. Configure environment variables: heroku config:set NODE_ENV=production');
console.log('6. Deploy your app: git push heroku main');
console.log('7. Update your iOS app to use the new API URL');
