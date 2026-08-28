import { realpath } from "fs/promises";
import path from "path";

function isWithinDirectory(directory: string, candidate: string): boolean {
  const relative = path.relative(directory, candidate);
  return (
    relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export function resolveContainedPath(
  directory: string,
  requestedPath: string,
): string | null {
  if (!requestedPath || requestedPath.includes("\0") || path.isAbsolute(requestedPath)) {
    return null;
  }

  const resolvedDirectory = path.resolve(directory);
  const candidate = path.resolve(resolvedDirectory, requestedPath);
  return isWithinDirectory(resolvedDirectory, candidate) ? candidate : null;
}

export async function resolveRealContainedPath(
  directory: string,
  candidate: string,
): Promise<string | null> {
  const [realDirectory, realCandidate] = await Promise.all([
    realpath(directory),
    realpath(candidate),
  ]);

  return isWithinDirectory(realDirectory, realCandidate) ? realCandidate : null;
}
