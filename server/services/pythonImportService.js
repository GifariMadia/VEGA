import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import config from '../config/index.js';

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new Error('Python import returned no output.');
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Invalid JSON returned by Python import: ${trimmed.slice(0, 300)}`);
  }
}

export async function importExcelFile({ fileType, filePath }) {
  if (!fileType || !['budget', 'gl'].includes(fileType)) {
    throw new Error('Unsupported file type. Expected budget or gl.');
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('The uploaded Excel file could not be found.');
  }

  const script = `
import json, sys
from db import import_budget_excel, import_gl_excel

if sys.argv[2] == 'budget':
    result = import_budget_excel(sys.argv[1], 'api', 'Node API')
else:
    result = import_gl_excel(sys.argv[1], 'api', 'Node API')
print(json.dumps(result))
`;

  const pythonCommand = config.python.bin;
  const result = spawnSync(pythonCommand, ['-c', script, filePath, fileType], {
    cwd: config.python.cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const errorText = result.stderr?.trim() || result.stdout?.trim() || 'Unknown Python import failure';
    throw new Error(errorText.slice(0, 1000));
  }

  const parsed = parseJsonOutput(result.stdout);

  if (parsed && parsed.success === false) {
    const details = parsed.errors || parsed.validation_errors || parsed.message || 'Import failed';
    throw new Error(Array.isArray(details) ? details.join('; ') : String(details));
  }

  return parsed;
}

export default { importExcelFile };
