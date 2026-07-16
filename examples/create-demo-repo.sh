#!/usr/bin/env bash
# Creates a small Node.js repository used by the AgentOS demo:
#   agentos run --repo <dir> --goal "Add a median() function …"
set -euo pipefail

DIR="${1:?usage: create-demo-repo.sh <target-dir>}"
mkdir -p "$DIR"
cd "$DIR"

cat > package.json <<'EOF'
{
  "name": "demo-stats",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

mkdir -p src test

cat > src/stats.js <<'EOF'
export function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values) {
  if (values.length === 0) throw new TypeError('mean of empty array');
  return sum(values) / values.length;
}
EOF

cat > test/stats.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum, mean } from '../src/stats.js';

test('sum adds numbers', () => {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
});

test('mean averages numbers', () => {
  assert.equal(mean([2, 4, 6]), 4);
  assert.throws(() => mean([]), TypeError);
});
EOF

cat > README.md <<'EOF'
# demo-stats

Tiny statistics library used to demonstrate AgentOS multi-agent collaboration.
Run tests with `npm test`.
EOF

git init -q -b main
git add -A
git commit -q -m "demo-stats: initial library with sum and mean"
echo "demo repo ready at $DIR"
