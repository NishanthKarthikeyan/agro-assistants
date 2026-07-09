const fs = require('fs');

const featureFiles = [
  'src/pages/features/CropDisease.jsx',
  'src/pages/features/MarketPrices.jsx',
  'src/pages/features/AiPlanner.jsx',
  'src/pages/features/AgriNews.jsx',
  'src/pages/features/AgroLoan.jsx',
  'src/pages/features/AgroBot.jsx',
];

featureFiles.forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    
    // Replace ROLE_LINKS import from CropDisease with SIDEBAR_LINKS
    c = c.replace(
      "import { ROLE_LINKS } from './CropDisease';",
      "import { SIDEBAR_LINKS } from '../../config/sidebarLinks';"
    );
    
    // In CropDisease.jsx itself - remove the ROLE_LINKS export and replace with SIDEBAR_LINKS
    // Replace usage: const links = ROLE_LINKS[role] || ROLE_LINKS.buyer
    c = c.replace(
      /const links = ROLE_LINKS\[role\] \|\| ROLE_LINKS\.buyer;/g,
      'const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;'
    );
    
    fs.writeFileSync(f, c, 'utf8');
    console.log('Updated:', f);
  } catch(e) {
    console.log('Skip:', f, e.message);
  }
});

// Also clean up CropDisease.jsx - remove the ROLE_LINKS export since it's no longer needed
let cd = fs.readFileSync('src/pages/features/CropDisease.jsx', 'utf8');
// Remove the exported ROLE_LINKS object (large block)
cd = cd.replace(/^export const ROLE_LINKS = \{[\s\S]*?\};\n\nexport \{ ROLE_LINKS \};\n\n/m, '');
// Add SIDEBAR_LINKS import at top
if (!cd.includes('SIDEBAR_LINKS')) {
  cd = `import { SIDEBAR_LINKS } from '../../config/sidebarLinks';\n` + cd;
}
// Replace role links usage
cd = cd.replace(/const links = ROLE_LINKS\[role\] \|\| ROLE_LINKS\.buyer;/g, 'const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;');
fs.writeFileSync('src/pages/features/CropDisease.jsx', cd, 'utf8');
console.log('CropDisease.jsx cleaned');

console.log('Done!');
