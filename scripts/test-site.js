#!/usr/bin/env node

/**
 * Test Site Functionality
 * Tests if a site can be built and run properly
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds
const BUILD_TIMEOUT = 180000; // 3 minutes

async function testSite(sitePath, siteInfo) {
  const results = {
    path: sitePath,
    name: siteInfo.name,
    type: siteInfo.type,
    tests: {
      structure: false,
      dependencies: false,
      build: false,
      start: false,
      port: null
    },
    errors: [],
    logs: [],
    recommendation: 'unknown'
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING: ${siteInfo.name}`);
  console.log(`📂 Path: ${sitePath}`);
  console.log(`🎯 Type: ${siteInfo.type}`);
  console.log(`${'='.repeat(80)}\n`);

  // Test 1: Check project structure
  console.log('📋 Test 1: Checking project structure...');
  try {
    const requiredFiles = {
      nextjs: ['package.json', 'next.config.js'],
      react: ['package.json', 'src'],
      express: ['package.json', 'server.js'],
      static: ['index.html'],
      nodejs: ['package.json']
    };

    const required = requiredFiles[siteInfo.type] || requiredFiles.nodejs;
    let allExist = true;

    for (const file of required) {
      const filePath = path.join(sitePath, file);
      if (!fs.existsSync(filePath)) {
        results.errors.push(`Missing required file: ${file}`);
        allExist = false;
      }
    }

    results.tests.structure = allExist;
    console.log(allExist ? '   ✅ Structure valid' : '   ❌ Structure invalid');
  } catch (error) {
    results.errors.push(`Structure test failed: ${error.message}`);
    console.log('   ❌ Structure test failed');
  }

  // Test 2: Check dependencies
  if (fs.existsSync(path.join(sitePath, 'package.json'))) {
    console.log('📦 Test 2: Checking dependencies...');
    try {
      // Check if node_modules exists
      const nodeModulesPath = path.join(sitePath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('   📥 Installing dependencies...');
        execSync('npm install', { 
          cwd: sitePath, 
          stdio: 'pipe',
          timeout: BUILD_TIMEOUT 
        });
      }

      // Verify key dependencies
      const pkg = JSON.parse(fs.readFileSync(path.join(sitePath, 'package.json'), 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      results.tests.dependencies = true;
      console.log(`   ✅ Dependencies OK (${Object.keys(deps).length} packages)`);
    } catch (error) {
      results.errors.push(`Dependency installation failed: ${error.message}`);
      console.log('   ❌ Dependencies failed');
    }
  }

  // Test 3: Try to build (if applicable)
  if (results.tests.dependencies) {
    console.log('🔨 Test 3: Attempting to build...');
    
    const buildCommands = {
      nextjs: 'npm run build',
      react: 'npm run build',
      vite: 'npm run build',
      express: null,
      static: null,
      nodejs: null
    };

    const buildCmd = buildCommands[siteInfo.type];
    
    if (buildCmd) {
      try {
        const startTime = Date.now();
        execSync(buildCmd, { 
          cwd: sitePath, 
          stdio: 'pipe',
          timeout: BUILD_TIMEOUT 
        });
        const buildTime = Date.now() - startTime;
        
        results.tests.build = true;
        console.log(`   ✅ Build successful (${(buildTime/1000).toFixed(1)}s)`);
        
        // Check build output
        const buildDirs = ['.next', 'dist', 'build', 'out'];
        for (const dir of buildDirs) {
          if (fs.existsSync(path.join(sitePath, dir))) {
            results.logs.push(`Build output found: ${dir}`);
            break;
          }
        }
      } catch (error) {
        results.errors.push(`Build failed: ${error.message?.substring(0, 200)}`);
        console.log('   ❌ Build failed');
      }
    } else {
      results.tests.build = true; // No build needed
      console.log('   ⏭️  No build required');
    }
  }

  // Test 4: Try to start
  console.log('🚀 Test 4: Attempting to start server...');
  
  // Find an available port
  const basePort = 4000 + Math.floor(Math.random() * 1000);
  
  const startCommands = {
    nextjs: `PORT=${basePort} npm run start`,
    react: `PORT=${basePort} npm run preview || PORT=${basePort} npx serve -s build -p ${basePort}`,
    vite: `PORT=${basePort} npm run preview`,
    express: `PORT=${basePort} npm start`,
    nodejs: `PORT=${basePort} npm start`,
    static: `npx http-server -p ${basePort}`
  };

  const startCmd = startCommands[siteInfo.type] || startCommands.nodejs;
  
  try {
    // Start the server in background
    const serverProcess = exec(startCmd, { 
      cwd: sitePath,
      env: { ...process.env, PORT: basePort }
    });

    // Give it time to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if port is open
    try {
      execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${basePort}`, { timeout: 5000 });
      results.tests.start = true;
      results.tests.port = basePort;
      console.log(`   ✅ Server started on port ${basePort}`);
    } catch {
      console.log('   ⚠️  Server started but not responding');
    }

    // Kill the test server
    if (serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch {
        // Try to kill by port
        try {
          execSync(`lsof -ti:${basePort} | xargs kill -9 2>/dev/null || true`);
        } catch {}
      }
    }
  } catch (error) {
    results.errors.push(`Start failed: ${error.message?.substring(0, 200)}`);
    console.log('   ❌ Failed to start');
  }

  // Determine recommendation
  if (results.tests.structure && results.tests.dependencies && results.tests.build && results.tests.start) {
    results.recommendation = 'READY_TO_DEPLOY';
    console.log('\n🎉 RESULT: ✅ Site is ready to deploy!');
  } else if (results.tests.structure && results.tests.dependencies) {
    results.recommendation = 'NEEDS_FIX';
    console.log('\n⚠️  RESULT: Site needs fixes before deployment');
  } else {
    results.recommendation = 'NOT_VIABLE';
    console.log('\n❌ RESULT: Site is not viable');
  }

  return results;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-site.js <site-path> or node test-site.js --all');
    process.exit(1);
  }

  const testResults = [];

  if (args[0] === '--all') {
    // Test all found sites
    const foundSitesPath = '/home/root/webapp/traffic-control-system/found-sites.json';
    
    if (!fs.existsSync(foundSitesPath)) {
      console.log('❌ Run find-all-sites.js first to discover sites');
      process.exit(1);
    }

    const foundSites = JSON.parse(fs.readFileSync(foundSitesPath, 'utf8'));
    
    console.log(`🔬 Testing ${foundSites.length} sites...\n`);

    for (const site of foundSites) {
      const result = await testSite(site.path, site);
      testResults.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    // Test single site
    const sitePath = path.resolve(args[0]);
    
    if (!fs.existsSync(sitePath)) {
      console.log(`❌ Path does not exist: ${sitePath}`);
      process.exit(1);
    }

    const siteInfo = {
      name: path.basename(sitePath),
      type: 'unknown'
    };

    const result = await testSite(sitePath, siteInfo);
    testResults.push(result);
  }

  // Save test results
  const resultsPath = '/home/root/webapp/traffic-control-system/test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const ready = testResults.filter(r => r.recommendation === 'READY_TO_DEPLOY');
  const needsFix = testResults.filter(r => r.recommendation === 'NEEDS_FIX');
  const notViable = testResults.filter(r => r.recommendation === 'NOT_VIABLE');

  console.log(`\n✅ Ready to Deploy: ${ready.length}`);
  ready.forEach(r => console.log(`   • ${r.name} (${r.path})`));

  console.log(`\n⚠️  Needs Fix: ${needsFix.length}`);
  needsFix.forEach(r => console.log(`   • ${r.name} (${r.path})`));

  console.log(`\n❌ Not Viable: ${notViable.length}`);
  notViable.forEach(r => console.log(`   • ${r.name} (${r.path})`));

  console.log('\n💾 Full results saved to: test-results.json');
  console.log('\n✨ Next step: Review results and move viable sites to /sites directory');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});