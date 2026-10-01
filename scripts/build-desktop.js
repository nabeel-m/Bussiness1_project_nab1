import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('==================================================');
console.log('  SMART TECH Desktop Application Build Pipeline');
console.log('==================================================\n');

// 0. Close any running instances if open
try {
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM "SMART TECH Billing & Quotation.exe" 2>nul || exit 0', { shell: 'cmd.exe', stdio: 'ignore' });
  }
} catch (e) {}

console.log('[1/3] Building Vite frontend production assets...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('\n[2/3] Packaging with Electron & SQLite runtime...');
const tempOut = path.join(os.homedir(), 'smarttech_release');
execSync(`npx electron-builder --dir --config.directories.output="${tempOut}"`, { stdio: 'inherit' });

console.log('\n[3/3] Syncing distribution into ./dist_desktop ...');
const targetDir = path.join(process.cwd(), 'dist_desktop');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
const srcUnpacked = path.join(tempOut, 'win-unpacked');
const destUnpacked = path.join(targetDir, 'win-unpacked');

try {
  fs.cpSync(srcUnpacked, destUnpacked, { recursive: true, force: true });
} catch (err) {
  try {
    execSync(`robocopy "${srcUnpacked}" "${destUnpacked}" /MIR /R:2 /W:1`, { stdio: 'ignore' });
  } catch (e) {}
}

// Also sync to user's dedicated desktop install folder C:\Users\nabee\SMART-TECH-Billing-App
const dedicatedAppDir = path.join(os.homedir(), 'SMART-TECH-Billing-App');
if (fs.existsSync(dedicatedAppDir)) {
  console.log(`Syncing release to dedicated installation: ${dedicatedAppDir}`);
  try {
    execSync(`robocopy "${srcUnpacked}" "${dedicatedAppDir}" /MIR /R:2 /W:1`, { stdio: 'ignore' });
  } catch (e) {}
}

console.log('\n==================================================');
console.log('  ✓ SUCCESS: Desktop App Ready!');
console.log(`  Path: ${path.join(dedicatedAppDir, 'SMART TECH Billing & Quotation.exe')}`);
console.log('==================================================\n');

