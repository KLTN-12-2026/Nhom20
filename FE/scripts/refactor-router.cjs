const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/routes/AppRouter.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { lazy, Suspense } from')) {
  content = content.replace(
    "import {",
    "import { lazy, Suspense } from 'react';\nimport {"
  );
}

const importRegex = /import\s+({[^}]+}|[A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];/g;
let newContent = content;

const replacements = [];

let match;
while ((match = importRegex.exec(content)) !== null) {
  const [fullMatch, imports, source] = match;
  if (source.startsWith('@/modules/') || source.startsWith('@/pages/')) {
    if (imports.startsWith('{')) {
      const names = imports.replace(/[{}]/g, '').split(',').map(n => n.trim());
      let replacement = '';
      for (const name of names) {
        replacement += `const ${name} = lazy(() => import('${source}').then(module => ({ default: module.${name} })));\n`;
      }
      replacements.push({ fullMatch, replacement });
    } else {
      const replacement = `const ${imports} = lazy(() => import('${source}'));\n`;
      replacements.push({ fullMatch, replacement });
    }
  }
}

for (const rep of replacements) {
  newContent = newContent.replace(rep.fullMatch, rep.replacement);
}

const suspenseWrapper = `
const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" role="status"></div></div>}>
    {children}
  </Suspense>
);
`;

if (!newContent.includes('const LazyLoad')) {
  newContent = newContent.replace('const router = createBrowserRouter([', suspenseWrapper + '\nconst router = createBrowserRouter([');
}

const lazyComponentNames = replacements.flatMap(r => {
  const matches = [...r.replacement.matchAll(/const\s+([A-Za-z0-9_]+)\s+=/g)];
  return matches.map(m => m[1]);
});

for (const name of lazyComponentNames) {
  const regex = new RegExp(`element:\\s*<${name}\\s*(.*?)/>`, 'g');
  newContent = newContent.replace(regex, `element: <LazyLoad><${name} $1/></LazyLoad>`);
  
  // also handle element: ( <Guard> <Component /> </Guard> )
  const regex2 = new RegExp(`>\\s*<${name}\\s*(.*?)/>\\s*<`, 'g');
  newContent = newContent.replace(regex2, `><LazyLoad><${name} $1/></LazyLoad><`);
}

fs.writeFileSync(file, newContent, 'utf8');
console.log('Refactored AppRouter.tsx');
