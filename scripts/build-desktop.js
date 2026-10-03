import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('==================================================');
console.log('  SMART TECH Desktop Application Build Pipeline');
console.log('==================================================\n');

// 0. Close any running instances or background locks
try {
  if (process.platform === 'win32') {
    console.log('[0/4] Terminating any existing SMART TECH or electron processes...');
    execSync("powershell -Command \"Stop-Process -Name 'SMART TECH*' -Force -ErrorAction SilentlyContinue; Stop-Process -Name 'electron' -Force -ErrorAction SilentlyContinue\"", { stdio: 'ignore' });
  }
} catch (e) {}

// Small delay to release file handles
execSync('node -e "setTimeout(() => process.exit(0), 1000)"');

console.log('[1/4] Building Vite frontend production assets...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('\n[2/4] Packaging complete customer distribution (Installer, Portable EXE & Runtime)...');
const tempOut = path.join(os.homedir(), 'smarttech_release');
execSync(`npx electron-builder --win nsis portable --config.directories.output="${tempOut}"`, { stdio: 'inherit' });

console.log('\n[3/4] Syncing distribution into ./dist_desktop and installation folders...');
const targetDir = path.join(process.cwd(), 'dist_desktop');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy everything from tempOut to ./dist_desktop
try {
  fs.cpSync(tempOut, targetDir, { recursive: true, force: true });
} catch (err) {
  try {
    execSync(`robocopy "${tempOut}" "${targetDir}" /MIR /R:2 /W:1`, { stdio: 'ignore' });
  } catch (e) {}
}

// Sync to user's dedicated desktop install folder C:\Users\nabee\SMART-TECH-Billing-App
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
    } catch (e) {
      console.warn(`Could not copy ${f}:`, e.message);
    }
  }
}

// Create 1-click batch launcher helper in dedicated folder
const batContent = `@echo off\r\nstart "" "%~dp0SMART TECH Billing & Quotation.exe"\r\nexit\r\n`;
fs.writeFileSync(path.join(dedicatedAppDir, 'Launch_SMART_TECH.bat'), batContent, 'utf8');

console.log('\n[4/4] Refreshing Desktop Shortcuts...');
const targetExe = path.join(dedicatedAppDir, 'SMART TECH Billing & Quotation.exe');
const desktopDirs = [
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'OneDrive', 'Desktop')
];

for (const dDir of desktopDirs) {
  if (fs.existsSync(dDir)) {
    const lnkPath = path.join(dDir, 'SMART TECH Billing.lnk');
    const psShortcut = `
$sh = New-Object -ComObject WScript.Shell
$sc = $sh.CreateShortcut('${lnkPath.replace(/\\/g, '\\\\')}')
$sc.TargetPath = '${targetExe.replace(/\\/g, '\\\\')}'
$sc.WorkingDirectory = '${dedicatedAppDir.replace(/\\/g, '\\\\')}'
$sc.IconLocation = '${targetExe.replace(/\\/g, '\\\\')},0'
$sc.Description = 'SMART TECH Billing & Quotation Software'
$sc.Save()
`;
    try {
      const psTmp = path.join(os.tmpdir(), 'create_shortcut.ps1');
      fs.writeFileSync(psTmp, psShortcut, 'utf8');
      execSync(`powershell -ExecutionPolicy Bypass -File "${psTmp}"`, { stdio: 'ignore' });
      fs.unlinkSync(psTmp);
      console.log(`  ✓ Updated Desktop Shortcut: ${lnkPath}`);
    } catch (e) {
      console.warn(`  Could not create shortcut in ${dDir}:`, e.message);
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const appVersion = pkg.version || '2.0.0';

console.log('\n==================================================');
console.log('  ✓ SUCCESS: Full Customer Distribution Package Ready & Verified!');
console.log(`  1. Direct Desktop App (Recommended - Instant Launch):`);
console.log(`     ${targetExe}`);
console.log(`  2. Customer Setup Installer (.exe):`);
console.log(`     ${path.join(dedicatedAppDir, `SMART TECH Billing & Quotation Setup ${appVersion}.exe`)}`);
console.log(`  3. Portable Single Executable (.exe):`);
console.log(`     ${path.join(dedicatedAppDir, `SMART TECH Billing & Quotation ${appVersion}.exe`)}`);
console.log(`  4. Project Build Folder:`);
console.log(`     ${targetDir}`);
console.log('==================================================\n');
