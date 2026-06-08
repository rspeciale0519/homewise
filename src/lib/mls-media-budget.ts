const GIB = 1024 * 1024 * 1024;
const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const LIMITS = {
  maxConcurrent: 2,
  requestsPerSecond: 2,
  requestsPerHour: 7_200,
  requestsPerDay: 40_000,
  bytesPerHour: 4 * GIB,
  photosPerListing: 40,
};

interface WindowCounter {
  startedAt: number;
  count: number;
  bytes: number;
}

interface MediaBudgetState {
  inFlight: number;
  second: WindowCounter;
  hour: WindowCounter;
  day: WindowCounter;
}

interface MediaReservationAllowed {
  allowed: true;
  recordBytes: (bytes: number) => boolean;
  release: () => void;
}

interface MediaReservationDenied {
  allowed: false;
  status: number;
  retryAfterSeconds: number;
  reason: string;
}

type MediaReservation = MediaReservationAllowed | MediaReservationDenied;

const state = getMediaBudgetState();

export function limitMlsPhotoSources(sources: string[]): string[] {
  return sources.slice(0, LIMITS.photosPerListing);
}

export function reserveMlsMediaDownload(now = Date.now()): MediaReservation {
  resetWindow(state.second, now, SECOND_MS);
  resetWindow(state.hour, now, HOUR_MS);
  resetWindow(state.day, now, DAY_MS);

  if (state.inFlight >= LIMITS.maxConcurrent) {
    return denied("concurrency-limit", 1);
  }
  if (state.second.count >= LIMITS.requestsPerSecond) {
    return denied("per-second-limit", 1);
  }
  if (state.hour.count >= LIMITS.requestsPerHour) {
    return denied("hourly-request-limit", secondsUntilReset(state.hour, now, HOUR_MS));
  }
  if (state.day.count >= LIMITS.requestsPerDay) {
    return denied("daily-request-limit", secondsUntilReset(state.day, now, DAY_MS));
  }

  state.inFlight++;
  state.second.count++;
  state.hour.count++;
  state.day.count++;

  let released = false;

  return {
    allowed: true,
    recordBytes(bytes: number) {
      resetWindow(state.hour, Date.now(), HOUR_MS);
      if (state.hour.bytes + bytes > LIMITS.bytesPerHour) return false;
      state.hour.bytes += bytes;
      return true;
    },
    release() {
      if (released) return;
      released = true;
      state.inFlight = Math.max(0, state.inFlight - 1);
    },
  };
}

function getMediaBudgetState(): MediaBudgetState {
  const globalWithBudget = globalThis as typeof globalThis & {
    __homewiseMlsMediaBudget?: MediaBudgetState;
  };

  if (!globalWithBudget.__homewiseMlsMediaBudget) {
    const now = Date.now();
    globalWithBudget.__homewiseMlsMediaBudget = {
      inFlight: 0,
      second: newWindow(now),
      hour: newWindow(now),
      day: newWindow(now),
    };
  }

  return globalWithBudget.__homewiseMlsMediaBudget;
}

function newWindow(now: number): WindowCounter {
  return { startedAt: now, count: 0, bytes: 0 };
}

function resetWindow(counter: WindowCounter, now: number, windowMs: number) {
  if (now - counter.startedAt < windowMs) return;
  counter.startedAt = now;
  counter.count = 0;
  counter.bytes = 0;
}

function denied(reason: string, retryAfterSeconds: number): MediaReservationDenied {
  return {
    allowed: false,
    status: 429,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterSeconds)),
    reason,
  };
}

function secondsUntilReset(counter: WindowCounter, now: number, windowMs: number) {
  return (counter.startedAt + windowMs - now) / 1000;
}
