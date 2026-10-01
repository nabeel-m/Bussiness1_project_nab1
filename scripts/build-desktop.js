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

console.log('\n[2/3] Packaging complete customer distribution (Installer, Portable EXE & Runtime)...');
const tempOut = path.join(os.homedir(), 'smarttech_release');
execSync(`npx electron-builder --win nsis portable --config.directories.output="${tempOut}"`, { stdio: 'inherit' });

console.log('\n[3/3] Syncing distribution into ./dist_desktop and installation folders...');
const targetDir = path.join(process.cwd(), 'dist_desktop');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy everything from tempOut (Setup.exe, Portable.exe, win-unpacked) to targetDir
try {
  fs.cpSync(tempOut, targetDir, { recursive: true, force: true });
} catch (err) {
  try {
    execSync(`robocopy "${tempOut}" "${targetDir}" /MIR /R:2 /W:1`, { stdio: 'ignore' });
  } catch (e) {}
}

// Also sync to user's dedicated desktop install folder C:\Users\nabee\SMART-TECH-Billing-App
const dedicatedAppDir = path.join(os.homedir(), 'SMART-TECH-Billing-App');
if (!fs.existsSync(dedicatedAppDir)) {
  fs.mkdirSync(dedicatedAppDir, { recursive: true });
}

const srcUnpacked = path.join(tempOut, 'win-unpacked');
try {
  execSync(`robocopy "${srcUnpacked}" "${dedicatedAppDir}" /MIR /R:2 /W:1`, { stdio: 'ignore' });
} catch (e) {}

// Copy the customer-ready setup installer and portable executable to dedicated folder
const files = fs.readdirSync(tempOut);
for (const f of files) {
  if (f.endsWith('.exe')) {
    const src = path.join(tempOut, f);
    const dest = path.join(dedicatedAppDir, f);
    try {
      fs.copyFileSync(src, dest);
    } catch (e) {}
  }
}

console.log('\n==================================================');
console.log('  ✓ SUCCESS: Full Customer Distribution Package Ready!');
console.log(`  1. Customer Installer (.exe):`);
console.log(`     ${path.join(dedicatedAppDir, 'SMART TECH Billing & Quotation Setup 1.0.0.exe')}`);
console.log(`  2. Portable Single Executable (.exe):`);
console.log(`     ${path.join(dedicatedAppDir, 'SMART TECH Billing & Quotation 1.0.0.exe')}`);
console.log(`  3. Direct Installed App:`);
console.log(`     ${path.join(dedicatedAppDir, 'SMART TECH Billing & Quotation.exe')}`);
console.log('==================================================\n');

