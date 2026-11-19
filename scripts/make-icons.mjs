import sharp from "sharp";

const pill = (bg, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${bg}"/>
<g transform="translate(256 256) rotate(-40) scale(${scale}) translate(-256 -256)">
<rect x="96" y="176" width="320" height="160" rx="80" fill="#fff"/>
<path d="M256 176h-80a80 80 0 0 0 0 160h80z" fill="#ffd1e0"/>
<rect x="96" y="176" width="320" height="160" rx="80" fill="none" stroke="#fff" stroke-width="0"/>
</g></svg>`;

const out = "public/icons";
await sharp(Buffer.from(pill("#e11d6a", 1))).resize(512).png().toFile(`${out}/icon-512.png`);
await sharp(Buffer.from(pill("#e11d6a", 1))).resize(192).png().toFile(`${out}/icon-192.png`);
await sharp(Buffer.from(pill("#e11d6a", 0.72))).resize(512).png().toFile(`${out}/maskable-512.png`);
await sharp(Buffer.from(pill("#e11d6a", 1))).resize(180).png().toFile(`${out}/apple-touch-icon.png`);
// Badge Android : silhouette monochrome sur fond transparent.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 512 512"><g transform="translate(256 256) rotate(-40) translate(-256 -256)"><rect x="76" y="166" width="360" height="180" rx="90" fill="#000"/></g></svg>`;
await sharp(Buffer.from(badge)).png().toFile(`${out}/badge.png`);
