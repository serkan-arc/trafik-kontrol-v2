#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Güvenli secret üretici
function generateSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

// .env dosyasını güncelle
function updateEnvFile(envPath, updates) {
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  return envContent;
}

// Ana fonksiyon
function main() {
  const environment = process.argv[2] || 'production';
  const envFile = environment === 'local' ? '.env.local' : `.env.${environment}`;
  const envPath = path.join(__dirname, '..', envFile);
  
  console.log(`🔐 Generating secure secrets for ${environment} environment...`);
  
  const secrets = {
    JWT_SECRET: generateSecret(64),
    SESSION_SECRET: generateSecret(32),
    DB_PASSWORD: generateSecret(32),
    REDIS_PASSWORD: generateSecret(24),
  };
  
  console.log('\n📋 Generated Secrets:');
  console.log('====================');
  
  for (const [key, value] of Object.entries(secrets)) {
    console.log(`\n${key}:`);
    console.log(`${value}`);
  }
  
  // Opsiyonel: .env dosyasına yaz
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question(`\n💾 Do you want to update ${envFile}? (y/n): `, (answer) => {
    if (answer.toLowerCase() === 'y') {
      const envContent = updateEnvFile(envPath, secrets);
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ ${envFile} updated successfully!`);
    } else {
      console.log('ℹ️  Secrets not saved to file. Copy them manually if needed.');
    }
    
    console.log('\n⚠️  IMPORTANT REMINDERS:');
    console.log('1. Never commit .env files to version control');
    console.log('2. Use a secure password manager for production secrets');
    console.log('3. Rotate secrets regularly');
    console.log('4. Set up proper file permissions (600) for .env files');
    
    readline.close();
  });
}

// Script'i çalıştır
if (require.main === module) {
  main();
}