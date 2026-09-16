import { millisecondsUntilNextRiyadhDate } from "../hooks/useRiyadhBusinessDateKey";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("millisecondsUntilNextRiyadhDate", () => {
  it("schedules one rollover immediately after the next Riyadh midnight", () => {
    const delay = millisecondsUntilNextRiyadhDate(
      new Date("2026-09-07T20:59:59.900Z"),
    );

    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThan(200);
  });

  it("schedules the following midnight when mounted exactly at midnight", () => {
    const delay = millisecondsUntilNextRiyadhDate(
      new Date("2026-09-07T21:00:00.000Z"),
    );

    expect(delay).toBeGreaterThan(DAY_MS);
    expect(delay).toBeLessThan(DAY_MS + 100);
  });

  it("does not create a tight timer loop during Riyadh's midnight hour", () => {
    const delay = millisecondsUntilNextRiyadhDate(
      new Date("2026-09-07T21:30:00.000Z"),
    );

    expect(delay).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(delay).toBeLessThan(24 * 60 * 60 * 1000);
  });
});
