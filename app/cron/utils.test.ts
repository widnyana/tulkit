import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExpression,
  describeExpression,
  expandField,
  FIELD_LIMITS,
  formatOutput,
  formatRelativeTime,
  formatTimestamp,
  generate,
  nextRuns,
  parseSchedule,
  splitTokens,
  validateFileName,
} from "./utils.ts";

describe("expandField", () => {
  it("expands wildcards", () => {
    const m = expandField("*", FIELD_LIMITS.minute);
    assert.ok(m);
    assert.equal(m.size, 60);
  });

  it("expands steps", () => {
    const m = expandField("*/15", FIELD_LIMITS.minute);
    assert.ok(m);
    assert.deepEqual(
      [...m].sort((a, b) => a - b),
      [0, 15, 30, 45],
    );

    const h = expandField("*/12", FIELD_LIMITS.hour);
    assert.ok(h);
    assert.deepEqual(
      [...h].sort((a, b) => a - b),
      [0, 12],
    );
  });

  it("expands ranges with steps", () => {
    const m = expandField("10-20/5", FIELD_LIMITS.minute);
    assert.ok(m);
    assert.deepEqual([...m], [10, 15, 20]);
  });

  it("expands lists", () => {
    const m = expandField("1,5,9", FIELD_LIMITS.dom);
    assert.ok(m);
    assert.deepEqual([...m], [1, 5, 9]);
  });

  it("accepts month names", () => {
    const m = expandField(
      "jan,jul",
      FIELD_LIMITS.month,
      (n) =>
        [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ][n - 1],
    );
    assert.ok(m);
    assert.deepEqual([...m], [1, 7]);
  });

  it("rejects invalid atoms", () => {
    assert.equal(expandField("60", FIELD_LIMITS.minute), null);
    assert.equal(expandField("*/0", FIELD_LIMITS.minute), null);
    assert.equal(expandField("", FIELD_LIMITS.hour), null);
    assert.equal(expandField("5/10", FIELD_LIMITS.minute), null);
  });
});

describe("buildExpression", () => {
  it("joins valid fields", () => {
    const { expression, errors } = buildExpression({
      minute: "*/5",
      hour: "*",
      dom: "*",
      month: "*",
      dow: "1-5",
    });
    assert.deepEqual(errors, []);
    assert.equal(expression, "*/5 * * * 1-5");
  });

  it("normalizes dow 7 to Sunday for matching", () => {
    const m = expandField("7", FIELD_LIMITS.dow);
    assert.ok(m);
    assert.ok(m.has(0));
    assert.ok(!m.has(7));
  });

  it("collects validation errors", () => {
    const { errors } = buildExpression({
      minute: "60",
      hour: "25",
      dom: "*",
      month: "13",
      dow: "9",
    });
    assert.equal(errors.length, 4);
  });
});

describe("describeExpression", () => {
  it("describes every-minute schedules", () => {
    assert.equal(describeExpression("* * * * *"), "Every minute");
  });

  it("describes stepped minutes", () => {
    assert.match(describeExpression("*/10 * * * *"), /Every 10 minutes/);
  });

  it("describes fixed times", () => {
    assert.match(describeExpression("30 3 * * *"), /At 03:30/);
  });

  it("mentions day-of-week restrictions", () => {
    const d = describeExpression("0 12 * * 1");
    assert.match(d, /Monday/);
  });

  it("notes the OR semantics when dom and dow are both restricted", () => {
    const d = describeExpression("0 0 13 * 5");
    assert.match(d, /OR/);
    assert.match(d, /either/);
  });

  it("handles @reboot", () => {
    assert.match(describeExpression("@reboot"), /reboot/i);
  });
});

describe("nextRuns", () => {
  it("returns empty for @shortcuts", () => {
    assert.deepEqual(nextRuns("@reboot"), []);
  });

  it("finds consecutive minutes for * * * * *", () => {
    const from = new Date(2024, 5, 10, 12, 0, 30); // seconds ignored
    const runs = nextRuns("* * * * *", 3, from);
    assert.equal(runs.length, 3);
    assert.equal(runs[0].getHours(), 12);
    assert.equal(runs[0].getMinutes(), 1); // strictly after :00:30
    assert.equal(runs[1].getMinutes(), 2);
    assert.equal(runs[2].getMinutes(), 3);
  });

  it("finds the next 03:00 occurrence", () => {
    const from = new Date(2024, 5, 10, 4, 0);
    const runs = nextRuns("0 3 * * *", 2, from);
    assert.equal(runs.length, 2);
    // Next 03:00 is tomorrow at 03:00.
    assert.deepEqual(
      [runs[0].getDate(), runs[0].getHours(), runs[0].getMinutes()],
      [11, 3, 0],
    );
  });

  it("implements Vixie OR semantics for restricted dom+dow (Friday the 13th)", () => {
    const from = new Date(2024, 0, 1);
    const runs = nextRuns("0 0 13 * 5", 3, from);
    // All hits must be day 13 or a Friday.
    for (const r of runs) {
      const is13th = r.getDate() === 13;
      const isFriday = r.getDay() === 5;
      assert.ok(is13th || isFriday);
    }
    // First Friday-the-13th of 2024 is September 13; first plain Friday earlier.
    assert.ok(runs[0] < new Date(2024, 8, 13));
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2024, 5, 10, 12, 0, 0);

  it("formats minutes", () => {
    assert.equal(
      formatRelativeTime(new Date(now.getTime() + 5 * 60000), now),
      "in 5 minutes",
    );
  });

  it("formats hours with padded minutes", () => {
    assert.equal(
      formatRelativeTime(new Date(now.getTime() + (2 * 60 + 5) * 60000), now),
      "in 2 h 05 min",
    );
  });

  it("formats whole hours", () => {
    assert.equal(
      formatRelativeTime(new Date(now.getTime() + 3 * 3600000), now),
      "in 3 hours",
    );
  });

  it("formats days with remaining hours", () => {
    assert.equal(
      formatRelativeTime(new Date(now.getTime() + (26 * 60 + 30) * 60000), now),
      "in 1 d 02 h",
    );
  });

  it("handles imminent runs", () => {
    assert.equal(formatRelativeTime(now, now), "any moment now");
  });
});

describe("formatTimestamp", () => {
  it("renders zero-padded local time", () => {
    assert.equal(
      formatTimestamp(new Date(2026, 7, 27, 4, 5, 0)),
      "2026-08-27 04:05:00",
    );
  });

  it("pads single digits everywhere", () => {
    assert.equal(
      formatTimestamp(new Date(2024, 0, 3, 9, 42, 7)),
      "2024-01-03 09:42:07",
    );
  });
});

describe("formatOutput", () => {
  const opts = {
    description: "Every minute",
  };

  it("emits five fields without user column for crontab mode", () => {
    const out = formatOutput({
      ...opts,
      mode: "crontab",
      expression: "* * * * *",
      command: "/usr/bin/job",
    });
    assert.match(out, /# crontab -e/);
    assert.match(out, /^\* \* \* \* \* \/usr\/bin\/job$/m);
    assert.doesNotMatch(out, /root\s+\/usr\/bin\/job/);
  });

  it("adds the mandatory user column for cron.d mode", () => {
    const out = formatOutput({
      ...opts,
      mode: "cron-d",
      expression: "* * * * *",
      command: "/usr/bin/job",
      user: "deploy",
      fileName: "deploy-job",
    });
    assert.match(out, /# \/etc\/cron\.d\/deploy-job/);
    assert.match(out, /^\* \* \* \* \* deploy \/usr\/bin\/job$/m);
    assert.match(out, /no dots/);
  });
});

describe("validateFileName", () => {
  it("rejects dots", () => {
    assert.match(validateFileName("my.job") ?? "", /no dots|letters/i);
  });

  it("rejects empty names", () => {
    assert.ok(validateFileName("  "));
  });

  it("accepts simple names", () => {
    assert.equal(validateFileName("my-job_2"), null);
  });
});

describe("generate", () => {
  it("returns an error for invalid fields", () => {
    const r = generate(
      { minute: "99", hour: "*", dom: "*", month: "*", dow: "*" },
      "crontab",
      "/bin/x",
      "",
      "",
    );
    assert.match(r.error ?? "", /minute/i);
    assert.equal(r.output, "");
  });

  it("passes through @reboot shortcuts bypassing field checks", () => {
    const r = generate(
      { minute: "", hour: "", dom: "", month: "", dow: "" },
      "crontab",
      "/bin/boot-job",
      "",
      "",
      "@reboot",
    );
    assert.equal(r.error, null);
    assert.equal(r.expression, "@reboot");
    assert.match(r.output, /^@reboot \/bin\/boot-job$/m);
    assert.deepEqual(r.nextRuns, []); // indeterminate for @reboot
  });
});

describe("parseSchedule", () => {
  it("returns the shortcut for a known @ expression", () => {
    const r = parseSchedule("@reboot");
    assert.equal(r.shortcut, "@reboot");
    assert.equal(r.fields, null);
    assert.equal(r.error, null);
  });

  it("rejects unknown shortcuts", () => {
    const r = parseSchedule("@midnight-run");
    assert.equal(r.shortcut, null);
    assert.match(r.error ?? "", /Unknown cron shortcut/);
  });

  it("treats empty input as no-op", () => {
    const r = parseSchedule("   ");
    assert.equal(r.shortcut, null);
    assert.equal(r.fields, null);
    assert.equal(r.error, null);
  });

  it("rejects a four-field expression", () => {
    const r = parseSchedule("0 9 * *");
    assert.match(r.error ?? "", /exactly five fields/);
  });

  it("parses a valid five-field expression and collapses whitespace", () => {
    const r = parseSchedule("  0   9  *  *  1-5 ");
    assert.equal(r.error, null);
    assert.deepEqual(r.fields, {
      minute: "0",
      hour: "9",
      dom: "*",
      month: "*",
      dow: "1-5",
    });
  });

  it("surfaces the first invalid field", () => {
    const r = parseSchedule("0 99 * * *");
    assert.equal(r.fields, null);
    assert.match(r.error ?? "", /hour/);
  });
});

describe("splitTokens", () => {
  it("returns five tokens unchanged for a full expression", () => {
    assert.deepEqual(splitTokens("0 9 * * 1-5"), ["0", "9", "*", "*", "1-5"]);
  });

  it("pads missing trailing tokens with empty strings", () => {
    assert.deepEqual(splitTokens("0 9 * *"), ["0", "9", "*", "*", ""]);
  });

  it("truncates expressions longer than five fields", () => {
    assert.deepEqual(splitTokens("1 2 3 4 5 6"), ["1", "2", "3", "4", "5"]);
  });

  it("collapses runs of whitespace", () => {
    assert.deepEqual(splitTokens("  * *   * * * "), ["*", "*", "*", "*", "*"]);
  });
});
