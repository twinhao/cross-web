// 直接匯出 iOS Icon Composer 原稿，不重新繪製圖案。
// 需要安裝 Xcode；輸出的靜態圖示已提交，網站建置不需要執行此腳本。
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const developer = execFileSync("xcode-select", ["-p"], { encoding: "utf8" }).trim();
const exporter = resolve(developer, "../Applications/Icon Composer.app/Contents/Executables/ictool");
const source = fileURLToPath(new URL("../../Cross-Patient/Cross-Patient/CrossIcon.icon", import.meta.url));
const output = fileURLToPath(new URL("../static/icons/", import.meta.url));
const work = await mkdtemp(join(tmpdir(), "cross-web-icons-"));
await mkdir(output, { recursive: true });

try {
  for (const size of [16, 32, 48, 64, 180, 512]) {
    execFileSync(exporter, [source, "--export-image", "--output-file", join(work, `${size}-native.png`),
      "--platform", "iOS", "--rendition", "Default", "--width", String(size), "--height", String(size), "--scale", "1"],
    { stdio: "pipe" });
    // 正確解碼 Apple 16-bit PNG，再轉成 sRGB／8-bit，避免只改標頭造成像素資料損壞。
    await sharp(join(work, `${size}-native.png`)).toColourspace("srgb").png().toFile(join(work, `${size}.png`));
  }
  // ICO 包含四個 Apple 工具原生匯出的 PNG，讓瀏覽器依顯示密度選擇適當尺寸。
  const sizes = [16, 32, 48, 64];
  const images = await Promise.all(sizes.map(size => readFile(join(work, `${size}.png`))));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const p = 6 + i * 16;
    header[p] = sizes[i]; header[p + 1] = sizes[i];
    header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6);
    header.writeUInt32LE(image.length, p + 8); header.writeUInt32LE(offset, p + 12);
    offset += image.length;
  });
  const ico = Buffer.concat([header, ...images]);
  await writeFile(join(output, "cross-20261029.ico"), ico);
  await copyFile(join(work, "512.png"), join(output, "cross-512-20261029.png"));
  await copyFile(join(work, "180.png"), join(output, "apple-touch-20261029.png"));
  await writeFile(join(output, "cross-20261029-v2.ico"), ico);
  await copyFile(join(work, "512.png"), join(output, "cross-512-20261029-v2.png"));
  await copyFile(join(work, "180.png"), join(output, "apple-touch-20261029-v2.png"));
  // 舊網址同步更新，保留書籤、既有頁面與測試樣本的相容性。
  const legacy = fileURLToPath(new URL("../static/", import.meta.url));
  await writeFile(join(legacy, "favicon.ico"), ico);
  await copyFile(join(work, "512.png"), join(legacy, "icon.png"));
  await copyFile(join(work, "512.png"), join(legacy, "cross-icon.png"));
  await copyFile(join(work, "180.png"), join(legacy, "apple-icon.png"));
  console.log("已匯出 iOS 原圖示：512px、180px 與 16／32／48／64px favicon。");
} finally {
  await rm(work, { recursive: true, force: true });
}
