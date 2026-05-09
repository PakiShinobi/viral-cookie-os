/**
 * Minimal type shim for `ffprobe-static`.
 *
 * The package exposes an absolute path to a bundled ffprobe binary. The
 * actual export shape differs slightly between versions and module
 * systems — `probe.ts` resolves both shapes defensively.
 */
declare module "ffprobe-static" {
  const value: { path: string } | string;
  export default value;
}
