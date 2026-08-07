import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(root, '..');
const outDir = resolve(projectRoot, '.tmp-occurrence-check');

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  'node',
  [
    'node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/tsc.js',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2022',
    '--outDir',
    outDir,
    '--rootDir',
    'src',
    'src/alarms/occurrenceCalculator.ts',
    'src/alarms/types.ts',
  ],
  { cwd: projectRoot, stdio: 'inherit' }
);

const calculator = await import(`file:///${resolve(outDir, 'alarms/occurrenceCalculator.js').replaceAll('\\', '/')}`);

const baseAlarm = {
  id: 'alarm-1',
  label: 'Gym',
  startAt: '2026-08-14T09:00:00.000Z',
  repeatWeekdays: [],
  limit: { kind: 'once' },
  firedCount: 0,
  enabled: true,
  alertPreferences: { sound: true, vibrationAndFlash: true },
  createdAt: '2026-08-07T12:00:00.000Z',
  updatedAt: '2026-08-07T12:00:00.000Z',
};

const oneTime = calculator.getUpcomingOccurrences(baseAlarm, {
  now: new Date('2026-08-07T12:00:00.000Z'),
});
assert.equal(oneTime.length, 1);
assert.equal(oneTime[0].scheduledAt, '2026-08-14T09:00:00.000Z');

const twoFridays = calculator.getUpcomingOccurrences(
  {
    ...baseAlarm,
    repeatWeekdays: [5],
    limit: { kind: 'count', occurrences: 2 },
  },
  { now: new Date('2026-08-07T12:00:00.000Z'), maxOccurrences: 5 }
);
assert.deepEqual(
  twoFridays.map((occurrence) => occurrence.scheduledAt),
  ['2026-08-14T09:00:00.000Z', '2026-08-21T09:00:00.000Z']
);

const afterOneFired = calculator.getUpcomingOccurrences(
  {
    ...baseAlarm,
    repeatWeekdays: [5],
    limit: { kind: 'count', occurrences: 2 },
    firedCount: 1,
  },
  { now: new Date('2026-08-15T12:00:00.000Z'), maxOccurrences: 5 }
);
assert.deepEqual(afterOneFired.map((occurrence) => occurrence.scheduledAt), ['2026-08-21T09:00:00.000Z']);

const forever = calculator.getUpcomingOccurrences(
  {
    ...baseAlarm,
    repeatWeekdays: [1, 5],
    limit: { kind: 'forever' },
  },
  { now: new Date('2026-08-07T12:00:00.000Z'), maxOccurrences: 4 }
);
assert.equal(forever.length, 4);

const tally = calculator.getTallyStrokes({
  ...baseAlarm,
  repeatWeekdays: [5],
  limit: { kind: 'count', occurrences: 3 },
  firedCount: 1,
});
assert.deepEqual(
  tally.map((stroke) => stroke.state),
  ['fired', 'next', 'remaining']
);

console.log('occurrence checks passed');
