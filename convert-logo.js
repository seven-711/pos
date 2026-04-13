const fs = require('fs');

try {
  const img = fs.readFileSync('public/logo.png');
  const base64 = img.toString('base64');
  
  // Since we don't know the exact dimensions of the logo, 1024x1024 is a safe vector box
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <image href="data:image/png;base64,${base64}" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
  
  fs.writeFileSync('public/logo.svg', svg);
  console.log('Successfully created public/logo.svg!');
} catch (err) {
  console.error('Error generating SVG:', err);
}
