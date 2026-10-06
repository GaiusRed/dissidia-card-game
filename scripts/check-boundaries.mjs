import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts'];
const forbiddenGlobals = new Set([
  'window', 'document', 'navigator', 'fetch', 'WebSocket', 'indexedDB', 'localStorage',
  'sessionStorage', 'requestAnimationFrame', 'performance', 'process', 'Buffer', 'require',
]);

function sourceFiles(directory) {
  if (!statSync(directory).isDirectory()) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : /\.(?:ts|tsx|mts|cts)$/.test(entry.name) ? [full] : [];
  });
}

function isPureTypeImport(node) {
  return node.importClause?.isTypeOnly === true ||
    (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
      node.importClause.namedBindings.elements.length > 0 &&
      node.importClause.namedBindings.elements.every(element => element.isTypeOnly));
}

function resolveLocal(file, specifier) {
  const base = path.resolve(path.dirname(file), specifier);
  for (const extension of sourceExtensions) {
    const candidate = base.endsWith(extension) ? base : `${base}${extension}`;
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* try the next source suffix */ }
  }
  for (const extension of sourceExtensions) {
    const candidate = path.join(base, `index${extension}`);
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* try the next source suffix */ }
  }
  return null;
}

export function findBoundaryViolations(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const entryDirectory = path.join(root, 'src/rules');
  const queue = sourceFiles(entryDirectory);
  const visited = new Set();
  const issues = new Set();

  while (queue.length) {
    const file = queue.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

    function visit(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && ts.isStringLiteral(specifier)) {
          const value = specifier.text;
          const typeOnly = ts.isImportDeclaration(node) && isPureTypeImport(node);
          if (!value.startsWith('.')) {
            if (value !== 'zod' && !value.startsWith('zod/')) {
              issues.add(`${path.relative(root, file)}: forbidden package import '${value}'`);
            }
          } else {
            const local = resolveLocal(file, value);
            if (local) {
              const localRules = path.relative(entryDirectory, local);
              if (localRules.startsWith('..') || path.isAbsolute(localRules)) {
                const allowedTypes = typeOnly && local.startsWith(path.join(root, 'src/content/contracts'));
                if (!allowedTypes) issues.add(`${path.relative(root, file)}: local import leaves src/rules ('${value}')`);
              } else {
                queue.push(local);
              }
            }
          }
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const owner = node.expression.expression;
        const method = node.expression.name.text;
        if (ts.isIdentifier(owner) && ((owner.text === 'Date' && method === 'now') || (owner.text === 'Math' && method === 'random'))) {
          issues.add(`${path.relative(root, file)}: forbidden nondeterministic call '${owner.text}.${method}'`);
        }
      }
      if (ts.isIdentifier(node) && forbiddenGlobals.has(node.text)) {
        const parent = node.parent;
        const isKey = (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isMethodDeclaration(parent) && parent.name === node);
        if (!isKey) issues.add(`${path.relative(root, file)}: forbidden platform global '${node.text}'`);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }

  return [...issues].sort();
}

const scriptPath = path.resolve(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const violations = findBoundaryViolations();
  if (violations.length) {
    console.error(violations.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Rules boundary clean.');
  }
}
