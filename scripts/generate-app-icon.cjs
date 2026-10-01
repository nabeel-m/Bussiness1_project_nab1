const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const srcPath = path.join(__dirname, '../src/assets/logo_new.png');
  const img = nativeImage.createFromPath(srcPath);
  const size = img.getSize();
  console.log('Source size:', size);

  // We want a 512x512 square canvas with the logo centered
  const canvasSize = 512;
  // Calculate scaled dimensions to fit inside 460x460 (padding 26px on sides)
  const maxInner = 460;
  const scale = Math.min(maxInner / size.width, maxInner / size.height);
  const targetW = Math.round(size.width * scale);
  const targetH = Math.round(size.height * scale);

  const resized = img.resize({ width: targetW, height: targetH, quality: 'best' });

  // Use BrowserWindow with offscreen rendering or HTML5 canvas to composite onto 512x512
  const { BrowserWindow } = require('electron');
  const win = new BrowserWindow({
    width: canvasSize,
    height: canvasSize,
    show: false,
    webPreferences: { offscreen: true }
  });

  const base64Data = resized.toDataURL();
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:transparent;overflow:hidden;width:512px;height:512px;display:flex;align-items:center;justify-content:center;">
        <img src="${base64Data}" style="width:${targetW}px;height:${targetH}px;display:block;margin:auto;" />
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  win.webContents.on('did-finish-load', async () => {
    setTimeout(async () => {
      const pageImage = await win.webContents.capturePage({ x: 0, y: 0, width: canvasSize, height: canvasSize });
      const pngBuffer = pageImage.toPNG();

      // Save 512x512 square PNG
      const outPng = path.join(__dirname, '../electron/icon.png');
      const publicPng = path.join(__dirname, '../public/icon.png');
      fs.writeFileSync(outPng, pngBuffer);
      fs.writeFileSync(publicPng, pngBuffer);
      console.log('✓ Wrote square icon to:', outPng, 'and', publicPng);

      // Save as ICO using electron-builder/resedit or png-to-ico
      // Electron nativeImage doesn't do .ico directly, but we can write a valid multi-size ICO buffer
      // Multi-size ICO with PNG entries
      const sizes = [256, 128, 64, 48, 32, 16];
      const pngEntries = sizes.map(s => {
        const sub = pageImage.resize({ width: s, height: s, quality: 'best' });
        return { size: s, buffer: sub.toPNG() };
      });

      // ICO Header: 6 bytes
      const header = Buffer.alloc(6);
      header.writeUInt16LE(0, 0); // reserved
      header.writeUInt16LE(1, 2); // type 1 = icon
      header.writeUInt16LE(pngEntries.length, 4); // count

      // Each directory entry is 16 bytes
      let offset = 6 + (16 * pngEntries.length);
      const dirEntries = [];
      const imageBuffers = [];

      for (const entry of pngEntries) {
        const dir = Buffer.alloc(16);
        dir.writeUInt8(entry.size === 256 ? 0 : entry.size, 0); // width (0 = 256)
        dir.writeUInt8(entry.size === 256 ? 0 : entry.size, 1); // height
        dir.writeUInt8(0, 2); // color count
        dir.writeUInt8(0, 3); // reserved
        dir.writeUInt16LE(1, 4); // color planes
        dir.writeUInt16LE(32, 6); // bpp
        dir.writeUInt32LE(entry.buffer.length, 8); // size of image
        dir.writeUInt32LE(offset, 12); // file offset

        offset += entry.buffer.length;
        dirEntries.push(dir);
        imageBuffers.push(entry.buffer);
      }

      const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
      const outIco = path.join(__dirname, '../electron/icon.ico');
      const publicIco = path.join(__dirname, '../public/favicon.ico');
      fs.writeFileSync(outIco, icoBuffer);
      fs.writeFileSync(publicIco, icoBuffer);
      console.log('✓ Wrote high-res multi-layer Windows ICO to:', outIco, 'and', publicIco);

      win.destroy();
      app.quit();
    }, 200);
  });
});
