#!/usr/bin/env node

/**
 * Organize Sites - Move working sites to organized structure
 * Creates a clean /sites directory with all working projects
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Target directory structure
const SITES_ROOT = '/home/root/sites';
const CATEGORIES = {
  'nextjs': 'nextjs-apps',
  'react': 'react-apps', 
  'express': 'express-apis',
  'static': 'static-sites',
  'nodejs': 'nodejs-apps',
  'vite': 'vite-apps',
  'unknown': 'other'
};

// Sites to always keep (system sites)
const PROTECTED_SITES = [
  'traffic-control-system',
  'garantor360',
  'filebrowser'
];

function ensureDirectoryStructure() {
  console.log('📁 Creating organized directory structure...\n');

  // Create main sites directory
  if (!fs.existsSync(SITES_ROOT)) {
    fs.mkdirSync(SITES_ROOT, { recursive: true });
    console.log(`✅ Created: ${SITES_ROOT}`);
  }

  // Create category directories
  for (const [type, dir] of Object.entries(CATEGORIES)) {
    const categoryPath = path.join(SITES_ROOT, dir);
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
      console.log(`✅ Created: ${categoryPath}`);
    }
  }

  // Create additional directories
  const additionalDirs = ['backups', 'archives', 'templates'];
  for (const dir of additionalDirs) {
    const dirPath = path.join(SITES_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created: ${dirPath}`);
    }
  }
}

function generateUniqueName(baseName, targetDir) {
  let name = baseName;
  let counter = 1;
  
  while (fs.existsSync(path.join(targetDir, name))) {
    name = `${baseName}-v${counter}`;
    counter++;
  }
  
  return name;
}

function copySite(sourcePath, targetPath) {
  console.log(`📦 Copying site from ${sourcePath} to ${targetPath}...`);
  
  try {
    // Use rsync for efficient copying (excludes node_modules, .git, etc.)
    execSync(`rsync -av --exclude=node_modules --exclude=.next --exclude=dist --exclude=build --exclude=.git "${sourcePath}/" "${targetPath}/"`, {
      stdio: 'pipe'
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Copy failed: ${error.message}`);
    return false;
  }
}

function createSiteInfo(site, targetPath) {
  const info = {
    originalPath: site.path,
    movedAt: new Date().toISOString(),
    type: site.type,
    name: site.name,
    version: site.version,
    description: site.description,
    lastModified: site.lastModified,
    size: site.size,
    testResults: site.testResults || {},
    dependencies: site.dependencies || []
  };

  const infoPath = path.join(targetPath, '.site-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
}

async function main() {
  console.log('🚀 Starting site organization process...\n');

  // Step 1: Create directory structure
  ensureDirectoryStructure();

  // Step 2: Load test results
  const testResultsPath = '/home/root/webapp/traffic-control-system/test-results.json';
  const foundSitesPath = '/home/root/webapp/traffic-control-system/found-sites.json';

  if (!fs.existsSync(testResultsPath) || !fs.existsSync(foundSitesPath)) {
    console.log('❌ Please run find-all-sites.js and test-site.js first');
    process.exit(1);
  }

  const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
  const foundSites = JSON.parse(fs.readFileSync(foundSitesPath, 'utf8'));

  // Merge test results with site info
  const sitesWithTests = foundSites.map(site => {
    const testResult = testResults.find(t => t.path === site.path);
    return {
      ...site,
      testResults: testResult || {}
    };
  });

  // Step 3: Categorize sites
  const readyToDeploy = sitesWithTests.filter(s => 
    s.testResults.recommendation === 'READY_TO_DEPLOY'
  );
  const needsFix = sitesWithTests.filter(s => 
    s.testResults.recommendation === 'NEEDS_FIX'
  );
  const notViable = sitesWithTests.filter(s => 
    s.testResults.recommendation === 'NOT_VIABLE' || !s.testResults.recommendation
  );

  console.log('\n📊 Site Status:');
  console.log(`   ✅ Ready to deploy: ${readyToDeploy.length}`);
  console.log(`   ⚠️  Needs fixing: ${needsFix.length}`);
  console.log(`   ❌ Not viable: ${notViable.length}`);

  // Step 4: Move ready sites
  console.log('\n📦 Moving ready-to-deploy sites...\n');
  
  const moved = [];
  const failed = [];

  for (const site of readyToDeploy) {
    // Skip protected sites
    if (PROTECTED_SITES.some(p => site.name.includes(p))) {
      console.log(`⏭️  Skipping protected site: ${site.name}`);
      continue;
    }

    const categoryDir = CATEGORIES[site.type] || CATEGORIES.unknown;
    const targetDir = path.join(SITES_ROOT, categoryDir);
    const siteName = generateUniqueName(site.name, targetDir);
    const targetPath = path.join(targetDir, siteName);

    console.log(`\n🔄 Processing: ${site.name}`);
    console.log(`   From: ${site.path}`);
    console.log(`   To: ${targetPath}`);

    if (copySite(site.path, targetPath)) {
      createSiteInfo(site, targetPath);
      moved.push({ ...site, newPath: targetPath });
      console.log(`   ✅ Successfully moved`);
    } else {
      failed.push(site);
      console.log(`   ❌ Failed to move`);
    }
  }

  // Step 5: Archive sites that need fixes
  console.log('\n📦 Archiving sites that need fixes...\n');
  
  for (const site of needsFix) {
    const archivePath = path.join(SITES_ROOT, 'archives', `${site.name}-${Date.now()}`);
    
    console.log(`📁 Archiving: ${site.name}`);
    
    if (copySite(site.path, archivePath)) {
      createSiteInfo(site, archivePath);
      console.log(`   ✅ Archived to: ${archivePath}`);
    }
  }

  // Step 6: Create removal list for not viable sites
  const removalList = notViable.map(s => ({
    path: s.path,
    name: s.name,
    reason: s.testResults.errors || ['Not viable']
  }));

  const removalPath = path.join(SITES_ROOT, 'removal-candidates.json');
  fs.writeFileSync(removalPath, JSON.stringify(removalList, null, 2));

  // Step 7: Create summary report
  const summary = {
    timestamp: new Date().toISOString(),
    statistics: {
      total: foundSites.length,
      moved: moved.length,
      archived: needsFix.length,
      failed: failed.length,
      notViable: notViable.length
    },
    movedSites: moved.map(s => ({
      name: s.name,
      type: s.type,
      originalPath: s.path,
      newPath: s.newPath
    })),
    archivedSites: needsFix.map(s => ({
      name: s.name,
      type: s.type,
      path: s.path,
      issues: s.testResults.errors || []
    })),
    removalCandidates: removalList
  };

  const summaryPath = path.join(SITES_ROOT, 'organization-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Step 8: Create README
  const readme = `# Organized Sites Directory

## Structure
- **nextjs-apps/** - Next.js applications
- **react-apps/** - React applications  
- **express-apis/** - Express APIs and servers
- **static-sites/** - Static HTML sites
- **nodejs-apps/** - Node.js applications
- **vite-apps/** - Vite-based applications
- **other/** - Uncategorized projects
- **archives/** - Sites that need fixes
- **backups/** - Backup copies
- **templates/** - Template projects

## Statistics
- Total sites found: ${summary.statistics.total}
- Successfully organized: ${summary.statistics.moved}
- Archived for fixes: ${summary.statistics.archived}
- Not viable: ${summary.statistics.notViable}

## Ready to Deploy Sites
${moved.map(s => `- **${s.name}** (${s.type}): ${s.newPath}`).join('\n')}

## Sites Needing Fixes
${needsFix.map(s => `- **${s.name}** (${s.type}): ${s.testResults.errors?.[0] || 'Unknown issue'}`).join('\n')}

## Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync(path.join(SITES_ROOT, 'README.md'), readme);

  // Final report
  console.log('\n' + '='.repeat(80));
  console.log('✨ ORGANIZATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Moved: ${moved.length} sites`);
  console.log(`   📦 Archived: ${needsFix.length} sites`);
  console.log(`   ❌ Failed: ${failed.length} sites`);
  console.log(`   🗑️  Removal candidates: ${notViable.length} sites`);
  console.log(`\n📁 Organized sites location: ${SITES_ROOT}`);
  console.log(`📄 Summary saved to: ${summaryPath}`);
  console.log(`📝 Removal list saved to: ${removalPath}`);
  
  console.log('\n✨ Next steps:');
  console.log('   1. Review organized sites in /home/root/sites');
  console.log('   2. Test deployment of moved sites');
  console.log('   3. Review and delete removal-candidates.json sites');
  console.log('   4. Update Traffic Control System to use /home/root/sites');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});