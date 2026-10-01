import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const desktops = [
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'OneDrive', 'Desktop')
];

for (const d of desktops) {
  if (fs.existsSync(d)) {
    const lnk = path.join(d, 'SMART TECH Billing.lnk');
    const exePath = 'C:\\Users\\nabee\\SMART-TECH-Billing-App\\SMART TECH Billing & Quotation.exe';
    const workDir = 'C:\\Users\\nabee\\SMART-TECH-Billing-App';
    const ps = `$s=(New-Object -COM WScript.Shell).CreateShortcut('${lnk}');$s.TargetPath='${exePath}';$s.WorkingDirectory='${workDir}';$s.IconLocation='${exePath},0';$s.Description='SMART TECH Desktop App';$s.Save()`;
    try {
      execSync(`powershell -NoProfile -Command "${ps}"`);
      console.log('✓ Desktop shortcut updated at:', lnk);
    } catch (e) {
      console.error('Error creating shortcut:', e.message);
    }
  }
}
