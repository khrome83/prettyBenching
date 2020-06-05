export {
  BenchmarkRunResult,
  BenchmarkResult,
  BenchmarkRunProgress,
  ProgressState,
  runBenchmarks,
  bench,
} from "https://deno.land/std@0.56.0/testing/bench.ts";

export * as colors from "https://deno.land/std@0.56.0/fmt/colors.ts";

export const test = Deno.test;
