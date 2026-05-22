#!/usr/bin/env node
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const PATTERNS     = require('../lib/patterns');
const HOOK_TEMPLATE = fs.readFileSync(path.join(__dirname, '../lib/hook.sh'), 'utf8');
const PKG          = require('../package.json');

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const A = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
};

const bold   = s => `${A.bold}${s}${A.reset}`;
const dim    = s => `${A.dim}${s}${A.reset}`;
const red    = s => `${A.red}${s}${A.reset}`;
const green  = s => `${A.green}${s}${A.reset}`;
const yellow = s => `${A.yellow}${s}${A.reset}`;
const cyan   = s => `${A.cyan}${s}${A.reset}`;

// ── git helpers ───────────────────────────────────────────────────────────────

function findGitRoot(start) {
  let dir = start || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isHookInstalled(gitRoot) {
  const p = path.join(gitRoot, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes('sensitive-guard');
}

// ── display helpers ───────────────────────────────────────────────────────────

function printHeader() {
  const v = `v${PKG.version}`;
  const title = `  sensitive-guard ${v}  `;
  const border = '='.repeat(title.length);
  console.log('');
  console.log(bold(cyan(`  ${border}`)));
  console.log(bold(cyan(`  ${title}`)));
  console.log(bold(cyan(`  ${border}`)));
  console.log(dim('  Prevent sensitive data from being committed to git'));
  console.log('');
}

function printPatterns() {
  console.log(bold(`  Built-in detection rules (${PATTERNS.length}):`));
  console.log('');

  const W = Math.max(...PATTERNS.map(p => p.label.length));

  for (const p of PATTERNS) {
    const badge = p.type === 'icase'
      ? dim('[i]')      // case-insensitive
      : dim('[E]');     // exact / format

    console.log(
      `  ${green('+')} ${bold(p.label.padEnd(W))}  ${badge}  ${dim(p.description)}`
    );
    console.log(
      `  ${''.padEnd(W + 4)}     ${dim('e.g. ' + p.example)}`
    );
  }
  console.log('');
  console.log(dim('  [E] = exact format match   [i] = case-insensitive keyword assignment'));
  console.log('');
}

// ── readline prompt ───────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, a => resolve(a.trim())));
}

// ── file helpers ──────────────────────────────────────────────────────────────

function readCustomTerms(gitRoot) {
  const p = path.join(gitRoot, '.sensitive-terms');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function appendTerms(gitRoot, newTerms) {
  if (!newTerms.length) return 0;
  const p = path.join(gitRoot, '.sensitive-terms');
  const existing = readCustomTerms(gitRoot);
  const toAdd = newTerms.filter(t => !existing.includes(t));
  if (!toAdd.length) return 0;

  const header = fs.existsSync(p) ? '' : [
    '# .sensitive-terms — managed by sensitive-guard',
    '# Each line is a term blocked at commit time (case-insensitive, fixed string).',
    '# Lines starting with # are comments. Blank lines are ignored.',
    '#',
    '# Add project-specific terms below:',
    '#   - internal project names',
    '#   - usernames / handles',
    '#   - internal hostnames or IP ranges',
    '#   - any other string that must never appear in commits',
    '',
  ].join('\n');

  fs.appendFileSync(p, header + toAdd.join('\n') + '\n');
  return toAdd.length;
}

function ensureGitignore(gitRoot) {
  const p = path.join(gitRoot, '.gitignore');
  const entry = '.sensitive-terms';
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(entry)) return;
  fs.appendFileSync(p, `\n# sensitive-guard\n${entry}\n`);
  console.log(`  ${green('+')} ${entry} added to .gitignore`);
}

function installHook(gitRoot) {
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf8');
    if (!content.includes('sensitive-guard')) {
      const backup = `${hookPath}.bak.${Date.now()}`;
      fs.copyFileSync(hookPath, backup);
      console.log(`  ${yellow('!')} Existing hook backed up to ${dim(path.basename(backup))}`);
    }
  }

  fs.writeFileSync(hookPath, HOOK_TEMPLATE, { mode: 0o755 });
  console.log(`  ${green('+')} Hook installed → ${dim('.git/hooks/pre-commit')}`);
}

// ── commands ──────────────────────────────────────────────────────────────────

async function cmdInit() {
  printHeader();

  const gitRoot = findGitRoot();
  if (!gitRoot) {
    console.log(red('  Error: not inside a git repository.'));
    console.log(dim('  Run this command from inside a git project.'));
    process.exit(1);
  }
  console.log(`  Repository: ${dim(gitRoot)}`);
  console.log('');

  // Already installed?
  if (isHookInstalled(gitRoot)) {
    console.log(`  ${yellow('!')} sensitive-guard hook is already installed.`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await ask(rl, `  ${bold('Reinstall / reconfigure? (y/N)')} `);
    rl.close();
    console.log('');
    if (ans.toLowerCase() !== 'y') {
      console.log(dim('  Aborted. Run `sensitive-guard list` to see active config.'));
      console.log('');
      return;
    }
  }

  // Show all patterns
  printPatterns();

  // Collect custom terms
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const wantCustom = await ask(rl, `  ${bold('Add custom sensitive terms? (y/N)')} `);
  console.log('');

  let newTerms = [];
  if (wantCustom.toLowerCase() === 'y') {
    console.log(bold('  Enter terms to block (project names, usernames, hostnames…)'));
    console.log(dim('  One per line. Empty line when done.'));
    console.log('');

    let i = 1;
    while (true) {
      const t = await ask(rl, `  ${yellow('Term ' + i)}  `);
      if (!t) break;
      newTerms.push(t);
      console.log(`  ${green('+')} Queued: ${bold(t)}`);
      i++;
    }
    console.log('');
  }
  rl.close();

  // Install
  console.log(bold('  Installing…'));
  installHook(gitRoot);

  const added = appendTerms(gitRoot, newTerms);
  if (added) console.log(`  ${green('+')} ${added} term(s) written to .sensitive-terms`);

  ensureGitignore(gitRoot);

  console.log('');
  console.log(bold(green('  sensitive-guard is now active!')));
  console.log('');
  console.log(`  ${bold('What happens next:')}`);
  console.log(`  • Every ${yellow('git commit')} will be scanned automatically`);
  console.log(`  • Edit ${yellow('.sensitive-terms')} to add/remove custom terms`);
  console.log(`  • Run  ${yellow('npx sensitive-guard list')}   to review all rules`);
  console.log(`  • Run  ${yellow('npx sensitive-guard add <term>')} to add a term`);
  console.log(`  • Run  ${yellow('npx sensitive-guard remove')}  to uninstall`);
  console.log(`  • ${dim('Emergency bypass:')} ${yellow('git commit --no-verify')}`);
  console.log('');
}

function cmdList() {
  printHeader();

  const gitRoot = findGitRoot();
  const installed = gitRoot && isHookInstalled(gitRoot);

  console.log(`  Status     : ${installed ? green('active') : red('not installed')}`);
  if (gitRoot) console.log(`  Repository : ${dim(gitRoot)}`);
  console.log('');

  printPatterns();

  if (gitRoot) {
    const terms = readCustomTerms(gitRoot);
    if (terms.length) {
      console.log(bold(`  Custom terms in .sensitive-terms (${terms.length}):`));
      console.log('');
      for (const t of terms) console.log(`  ${yellow('•')} ${t}`);
      console.log('');
      console.log(dim(`  Edit ${path.join(gitRoot, '.sensitive-terms')} to change these.`));
    } else {
      console.log(dim('  No custom terms configured.'));
      console.log(dim('  Run `sensitive-guard add <term>` or re-run `sensitive-guard init`.'));
    }
    console.log('');
  }
}

function cmdAdd(term) {
  if (!term) {
    console.log(red('  Usage: sensitive-guard add <term>'));
    process.exit(1);
  }
  const gitRoot = findGitRoot();
  if (!gitRoot) { console.log(red('  Error: not inside a git repository.')); process.exit(1); }

  const added = appendTerms(gitRoot, [term]);
  ensureGitignore(gitRoot);

  if (added) {
    console.log(`  ${green('+')} "${bold(term)}" added to .sensitive-terms`);
  } else {
    console.log(`  ${yellow('!')} "${term}" is already in .sensitive-terms`);
  }
}

function cmdStatus() {
  const gitRoot = findGitRoot();
  if (!gitRoot) { console.log(red('  Error: not inside a git repository.')); process.exit(1); }

  const installed = isHookInstalled(gitRoot);
  const terms     = readCustomTerms(gitRoot);

  console.log('');
  console.log(`  Repository   : ${dim(gitRoot)}`);
  console.log(`  Hook         : ${installed ? green('installed') : red('not installed')}`);
  console.log(`  Custom terms : ${terms.length ? yellow(terms.length + ' term(s)') : dim('none')}`);
  console.log('');

  if (!installed) {
    console.log(dim('  Run `npx sensitive-guard init` to install.'));
    console.log('');
  }
}

function cmdRemove() {
  const gitRoot = findGitRoot();
  if (!gitRoot) { console.log(red('  Error: not inside a git repository.')); process.exit(1); }

  const hookPath = path.join(gitRoot, '.git', 'hooks', 'pre-commit');
  if (!fs.existsSync(hookPath) || !isHookInstalled(gitRoot)) {
    console.log(yellow('  Hook is not installed.'));
    return;
  }
  fs.unlinkSync(hookPath);
  console.log(`  ${green('+')} Hook removed.`);
  console.log(dim('  .sensitive-terms file is preserved.'));
}

function cmdHelp() {
  printHeader();
  console.log(`  ${bold('Usage:')} sensitive-guard [command]`);
  console.log('');
  console.log(`  ${bold('Commands:')}`);
  console.log(`    ${yellow('init')}           Interactive setup wizard (default)`);
  console.log(`    ${yellow('add')} <term>     Add a custom sensitive term`);
  console.log(`    ${yellow('list')}           Show all built-in rules and custom terms`);
  console.log(`    ${yellow('status')}         Check if hook is installed`);
  console.log(`    ${yellow('remove')}         Uninstall the hook`);
  console.log(`    ${yellow('help')}           Show this help`);
  console.log('');
  console.log(`  ${bold('Examples:')}`);
  console.log(`    npx sensitive-guard`);
  console.log(`    npx sensitive-guard add my-project-name`);
  console.log(`    npx sensitive-guard add hieplq1`);
  console.log(`    npx sensitive-guard list`);
  console.log('');
}

// ── entry point ───────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case undefined:
  case 'init':
    cmdInit().catch(e => { console.error(red('  Error: ' + e.message)); process.exit(1); });
    break;
  case 'add':
    cmdAdd(args[0]);
    break;
  case 'list':
    cmdList();
    break;
  case 'status':
    cmdStatus();
    break;
  case 'remove':
  case 'uninstall':
    cmdRemove();
    break;
  case 'help':
  case '--help':
  case '-h':
    cmdHelp();
    break;
  default:
    console.log(red(`  Unknown command: "${cmd}"`));
    cmdHelp();
    process.exit(1);
}
