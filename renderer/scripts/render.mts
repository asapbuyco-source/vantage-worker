/**
 * Server-side Remotion render CLI.
 *
 * Usage:
 *   tsx scripts/render.ts --spec <spec.json> --out <output.mp4> --log <progress.ndjson> [--scale 0.25]
 *
 * Writes NDJSON progress lines to --log:
 *   {"type":"status","stage":"bundle|select|render|done"}
 *   {"type":"progress","progress":0.42}
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import type { RenderSpec } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  spec: string;
  out: string;
  log?: string;
  scale: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { spec: '', out: '', scale: 1 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const value = argv[i + 1];
    if (arg === '--spec' && value) args.spec = value;
    if (arg === '--out' && value) args.out = value;
    if (arg === '--log' && value) args.log = value;
    if (arg === '--scale' && value) args.scale = Number(value) || 1;
  }
  if (!args.spec || !args.out) {
    throw new Error('--spec and --out are required');
  }
  return args;
}

function createLogger(logPath?: string): (entry: Record<string, unknown>) => void {
  if (!logPath) return () => {};
  return (entry) => {
    try {
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // logging must never break the render
    }
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const log = createLogger(args.log);
  // Worker images can bake Chrome in; use it when provided (skips downloads)
  const browserExe = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
  const browserOpt = browserExe ? { browserExecutable: browserExe } : {};

  const spec = JSON.parse(fs.readFileSync(args.spec, 'utf8')) as RenderSpec;
  const entryPoint = path.resolve(__dirname, '..', 'src', 'index.ts');
  const outputLocation = path.resolve(args.out);

  log({ type: 'status', stage: 'bundle' });
  const serveUrl = await bundle({ entryPoint });

  log({ type: 'status', stage: 'select' });
  const composition = await selectComposition({
    serveUrl,
    id: 'VideoComposition',
    inputProps: { spec },
    chromiumOptions: { gl: 'swangle', enableMultiProcessOnLinux: true },
    ...browserOpt,
    // Slow container fetches (remote assets) must not trip the default 28s delayRender timeout
    timeoutInMilliseconds: 120_000,
  });
  console.log(`composition durationInFrames=${composition.durationInFrames} fps=${composition.fps} size=${composition.width}x${composition.height}`);

  log({ type: 'status', stage: 'render' });
  await renderMedia({
    composition,
    serveUrl,
    inputProps: { spec },
    codec: 'h264',
    audioCodec: 'aac',
    outputLocation,
    scale: args.scale,
    ...browserOpt,
    // Railway can expose more CPUs than its memory budget supports.
    // Keep production frame rendering bounded; callers can opt into more.
    concurrency: Number(process.env.REMOTION_CONCURRENCY) || (process.platform === 'linux' ? 1 : 2),
    timeoutInMilliseconds: 120_000,
    // Software rasterization keeps frames byte-deterministic (GPU compositing
    // can produce run-to-run variation under load)
    chromiumOptions: { gl: 'swangle', enableMultiProcessOnLinux: true },
    onProgress: ({ progress }) => {
      log({ type: 'progress', progress });
    },
  });

  log({ type: 'status', stage: 'done' });
  console.log(`Rendered ${outputLocation}`);
}

main().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
