import {
  BenchmarkRunProgress,
  ProgressState,
  BenchmarkRunResult,
} from "./deps.ts";

import {
  getTimeColor,
  getTimePadSize,
  usingHrTime,
  padEndVisible,
  num,
  getBenchIndicator,
} from "./utils.ts";
import { Colorer } from "./colorer.ts";

const headerPadding = "▒▒▒▒▒▒▒▒";
const lineLength = 130;
const c: Colorer = new Colorer();

export interface prettyBenchmarkProgressOptions {
  thresholds?: { [key: string]: { green: number; yellow: number } };
  indicators?: { benches: RegExp; modFn?: (str: string) => string }[];
  nocolor?: boolean;
}

interface ProgressOptions {
  thresholds?: { [key: string]: { green: number; yellow: number } };
  indicators?: { benches: RegExp; modFn?: (str: string) => string }[];
  nocolor: boolean;
}

export function prettyBenchmarkProgress(
  { thresholds, indicators, nocolor = false }: prettyBenchmarkProgressOptions =
    {},
) {
  if (nocolor) c.setColorEnabled(false);

  return (progress: BenchmarkRunProgress) =>
    _prettyBenchmarkProgress(progress, { thresholds, indicators, nocolor });
}

function _prettyBenchmarkProgress(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
) {
  // Started benching
  if (progress.state === ProgressState.BenchmarkingStart) {
    const line = startBenchingLine(progress, options);
    console.log(line);
    return;
  }

  // Starting bench run
  if (progress.state === ProgressState.BenchStart) {
    const line = startingBenchmarkLine(progress, options);
    // const line = runningBenchmarkLine(progress, options);
    Deno.stdout.writeSync(new TextEncoder().encode(`${line}\t`));
    return;
  }

  // Multiple run bench partial result
  if (progress.state === ProgressState.BenchPartialResult) {
    const line = runningBenchmarkLine(progress, options);
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${line}\t`));
    return;
  }

  // Bench run result
  if (progress.state === ProgressState.BenchResult) {
    const line = finishedBenchmarkLine(progress, options);
    Deno.stdout.writeSync(
      new TextEncoder().encode(`\r${padEndVisible(line, 140)}\n`),
    );
    return;
  }

  // Finished benching
  if (progress.state === ProgressState.BenchmarkingEnd) {
    console.log(); // Empty line
    considerPrecise(progress);
    const cyanHeader = `${c.cyan(headerPadding)}`;
    console.log(`${cyanHeader} Benchmarking finished\n`);
    return;
  }
}

function considerPrecise(result: BenchmarkRunResult) {
  if (
    !usingHrTime() &&
    !!result.results.find(({ measuredRunsAvgMs }) => measuredRunsAvgMs < 10)
  ) {
    const yellowHeader = `${c.yellow(headerPadding)}`;
    console.log(
      `${yellowHeader} Consider running benchmarks with ${
        c.yellow(`--allow-hrtime`)
      } for a more precise measurement`,
    );
  }
}

function startingBenchmarkLine(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
): string {
  const fullName = benchNameFormatted(progress.running!.name, options);
  const fullTimes = `[${
    c.yellow(progress.running!.runsCount.toString().padStart(7))
  }]`;

  return `Running ${fullName} a total of ${fullTimes} times`;
  // return padEndVisible(`Running ${fullName} ${fullTimes} runs queued`, lineLength);
}

function runningBenchmarkLine(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
): string {
  const percent = Math.round(
    progress.running!.measuredRunsMs.length / progress.running!.runsCount * 100,
  );

  const fullName = benchNameFormatted(progress.running!.name, options);

  const maxBarLength = 48; // needs to be even
  const progressBar = Array(Math.ceil(percent / 100 * maxBarLength)).fill("=")
    .join("").padEnd(
      maxBarLength,
    );

  const inserted = progressBar.substr(0, maxBarLength / 2 - 2) +
    c.white(
      `${percent.toString().padEnd(2)}${
        percent == 100 ? "" : c.green(progressBar.substr(maxBarLength / 2, 1))
      }%`,
    ) + progressBar.substr(maxBarLength / 2 + 2);

  const fullProgressBar = `${c.yellow("[")}${c.green(inserted)}${
    c.yellow("]")
  }`;

  const progressDone = `${
    progress.running!.measuredRunsMs.length.toString().padStart(6)
  }`;
  const progressTotal = `${progress.running!.runsCount.toString().padStart(6)}`;
  const progressCount = `[${c.green(progressDone)}/${c.yellow(progressTotal)}]`;

  return `Running ${fullName} ${progressCount} ${fullProgressBar}`;
}

function finishedBenchmarkLine(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
): string {
  const result = [...progress.results].reverse()[0];

  const fullName = benchNameFormatted(result.name, options);

  const fullCount = `Runs: [${
    c.yellow((result.runsCount || 1).toString().padStart(7))
  }]`;

  const fullTotalTime = `Total time: [${
    c.yellow(
      num(result.totalMs).padStart(getTimePadSize()),
    )
  }${c.gray("ms")}]`;

  const avgTime = result.measuredRunsAvgMs;
  const paddedAvgTime = num(avgTime, true).padStart(getTimePadSize());
  const colorFn = getTimeColor(
    result.name,
    avgTime,
    options.nocolor,
    options?.thresholds,
  );
  const coloredTime = colorFn(paddedAvgTime);
  const fullAverage = `Avg: [${coloredTime}${c.gray("ms")}]`;

  return padEndVisible(
    `Benched ${fullName} ${fullCount} ${fullTotalTime} ${fullAverage}`,
    lineLength,
  );
}

function startBenchingLine(
  progress: BenchmarkRunProgress,
  options: ProgressOptions,
): string {
  const cyanHeader = `${c.cyan(headerPadding)}`;
  const fullQueued = `Benchmarks queued: [${
    c.yellow(progress.queued.length.toString().padStart(5))
  }]`;
  const fullFiltered = c.gray(
    ` filtered: [${progress.filtered.toString().padStart(5)}]`,
  );

  return `\n${cyanHeader} Starting benchmarking\n${cyanHeader} ${fullQueued} ${fullFiltered}\n`;
}

function benchNameFormatted(name: string, options: ProgressOptions) {
  return `${getBenchIndicator(name, options.indicators)}` +
    `[${c.cyan(name)} ${c.gray(padEndVisible("", 40 - name.length, "-"))}]`;
}
