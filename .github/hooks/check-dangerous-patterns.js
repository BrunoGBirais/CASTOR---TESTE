#!/usr/bin/env node
/**
 * PreToolUse hook: blocks a small set of irreversible/dangerous patterns
 * described in .github/copilot-instructions.md, regardless of how the
 * agent was prompted. Deterministic safety net on top of instructions.
 *
 * Blocks:
 *  - DROP ... CASCADE               inside workspaces/ or migrations/
 *  - files.delete(...)               inside workspaces/ (Google Drive API)
 *  - ON DELETE CASCADE ... auth.users inside migrations/
 *  - SUPABASE_SERVICE_ROLE_KEY / long JWT-looking token in front-*.html or netlify/
 *
 * Reads the PreToolUse JSON payload from stdin, extracts every file path +
 * text blob it can find in tool_input (create_file, replace_string_in_file,
 * multi_replace_string_in_file, run_in_terminal, etc.), and checks them.
 *
 * Exit code 2 = blocking error (shown to the model, tool call is stopped).
 * Exit code 0 = allow (no stdout needed).
 */

const RULES = [
  {
    name: 'drop_cascade_in_workflow_or_migration',
    pathTest: (p) => /\/(workspaces|migrations)\//i.test(p) || /^(workspaces|migrations)\//i.test(p),
    contentTest: (t) => /\bDROP\s+[A-Z ]*\bCASCADE\b/i.test(t),
    message: 'Blocked: DROP ... CASCADE detected in a workspaces/ or migrations/ file. Never CASCADE-drop in n8n workflows or Supabase migrations.'
  },
  {
    name: 'drive_files_delete_in_workflow',
    pathTest: (p) => /\/workspaces\//i.test(p) || /^workspaces\//i.test(p),
    contentTest: (t) => /files\s*\.\s*delete/i.test(t) || /"delete"\s*:\s*"drive"/i.test(t),
    message: 'Blocked: Google Drive files.delete detected in a workspaces/ (n8n) file. Never delete Drive files from any workflow.'
  },
  {
    name: 'on_delete_cascade_auth_users',
    pathTest: (p) => /\/migrations(-clean)?\//i.test(p) || /^migrations(-clean)?\//i.test(p),
    contentTest: (t) => /ON\s+DELETE\s+CASCADE/i.test(t) && /auth\.users/i.test(t),
    message: 'Blocked: ON DELETE CASCADE referencing auth.users detected in a migrations/ file. Never CASCADE a FK into auth.users.'
  },
  {
    name: 'secret_in_front_or_netlify',
    pathTest: (p) => /front-.*\.html$/i.test(p) || /\/netlify\//i.test(p) || /^netlify\//i.test(p),
    contentTest: (t) => /SUPABASE_SERVICE_ROLE_KEY/.test(t) || /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/.test(t),
    message: 'Blocked: SUPABASE_SERVICE_ROLE_KEY or a long JWT-looking token detected in a front-*.html / netlify/ file. Never ship service-role keys or long tokens to the static front-end.'
  }
];

function collectStrings(value, acc) {
  if (value == null) return;
  if (typeof value === 'string') {
    acc.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, acc);
    return;
  }
  if (typeof value === 'object') {
    for (const k of Object.keys(value)) collectStrings(value[k], acc);
  }
}

function collectPaths(toolInput) {
  const paths = [];
  const candidates = [
    toolInput?.filePath,
    toolInput?.path,
    ...(Array.isArray(toolInput?.replacements) ? toolInput.replacements.map((r) => r?.filePath) : []),
    ...(Array.isArray(toolInput?.filePaths) ? toolInput.filePaths : [])
  ];
  for (const c of candidates) {
    if (typeof c === 'string') paths.push(c);
  }
  return paths;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    // In case there's no stdin piped at all.
    setTimeout(() => resolve(data), 2000);
  });
}

async function main() {
  const raw = await readStdin();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    // Malformed/absent input: fail open, don't block on our own parse error.
    process.exit(0);
  }

  if (payload.hook_event_name && payload.hook_event_name !== 'PreToolUse') {
    process.exit(0);
  }

  const toolInput = payload.tool_input || {};
  const paths = collectPaths(toolInput);
  const allStrings = [];
  collectStrings(toolInput, allStrings);
  const blob = allStrings.join('\n');

  for (const rule of RULES) {
    const pathMatches = paths.length === 0 ? true : paths.some((p) => rule.pathTest(p));
    if (pathMatches && rule.contentTest(blob)) {
      process.stderr.write(`[check-dangerous-patterns] ${rule.message}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
