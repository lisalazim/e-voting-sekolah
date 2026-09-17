import assert from "node:assert/strict";
import test from "node:test";

import {
  getRemainingSeconds,
  getSyncedNow,
} from "../src/features/announcement/timing.ts";

test("countdown memakai waktu server dan berjalan dengan fake timer", (context) => {
  const browserReceivedAt = new Date("2026-09-17T03:00:00.000Z");
  context.mock.timers.enable({ apis: ["Date"], now: browserReceivedAt });

  const state = {
    announcementStartedAt: "2026-09-17T10:00:00.000Z",
    electionTermLabel: "2026/2027",
    electionTitle: "Pemilihan Ketua OSIS",
    resultsRevealedAt: "2026-09-17T10:00:10.000Z",
    schoolLogoUrl: null,
    schoolName: "Sekolah",
    serverNow: "2026-09-17T10:00:02.000Z",
    status: "counting_down",
  };

  assert.equal(getRemainingSeconds(state), 8);
  assert.equal(
    getSyncedNow(state.serverNow, browserReceivedAt.getTime()),
    new Date(state.serverNow).getTime(),
  );

  context.mock.timers.tick(3000);
  assert.equal(
    getSyncedNow(state.serverNow, browserReceivedAt.getTime()),
    new Date("2026-09-17T10:00:05.000Z").getTime(),
  );
});
