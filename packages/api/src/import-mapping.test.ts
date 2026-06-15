import { describe, expect, it } from "vitest";

import {
  buildEmployeeFirstNameMap,
  buildProjectMap,
  convertMarker,
  foldKpiRows,
  inheritMissingDates,
  mapCategory,
  normalizeDate,
  normalizeProjectKey,
  parseEffort,
  parseReopenStatus,
  parseTotalEffort,
  resolveEmployee,
  resolveProject,
  toYearMonth,
} from "./import-mapping";

describe(normalizeProjectKey, () => {
  it("lowercases and strips whitespace", () => {
    expect(normalizeProjectKey("  Clever Dent ")).toBe("cleverdent");
    expect(normalizeProjectKey("WeClever")).toBe("weclever");
  });

  it("applies the alias map", () => {
    expect(normalizeProjectKey("WE")).toBe("weclever");
    expect(normalizeProjectKey("we")).toBe("weclever");
  });
});

describe("buildProjectMap / resolveProject", () => {
  const map = buildProjectMap([
    { id: "p1", name: "WeClever" },
    { id: "p2", name: "Clever Dent" },
  ]);

  it("resolves canonical names regardless of casing and spacing", () => {
    expect(resolveProject("weclever", map)).toBe("p1");
    expect(resolveProject("CleverDent", map)).toBe("p2");
    expect(resolveProject(" clever dent ", map)).toBe("p2");
  });

  it("resolves aliases", () => {
    expect(resolveProject("WE", map)).toBe("p1");
  });

  it("returns null on miss", () => {
    expect(resolveProject("unknown", map)).toBeNull();
  });
});

describe("buildEmployeeFirstNameMap / resolveEmployee", () => {
  it("maps first names (first token of fullName) to ids", () => {
    const { ambiguous, map } = buildEmployeeFirstNameMap([
      { fullName: "Alan Smith", id: "e1" },
      { fullName: "Nemo Le", id: "e2" },
    ]);
    expect(ambiguous).toStrictEqual([]);
    expect(resolveEmployee("alan", map)).toBe("e1");
    expect(resolveEmployee(" Nemo ", map)).toBe("e2");
  });

  it("reports ambiguous first names and excludes them from the map", () => {
    const { ambiguous, map } = buildEmployeeFirstNameMap([
      { fullName: "Alan Smith", id: "e1" },
      { fullName: "Alan Jones", id: "e2" },
      { fullName: "Mike Doe", id: "e3" },
    ]);
    expect(ambiguous).toStrictEqual(["alan"]);
    expect(map.has("alan")).toBeFalsy();
    expect(resolveEmployee("Mike", map)).toBe("e3");
  });

  it("returns null on miss", () => {
    const { map } = buildEmployeeFirstNameMap([]);
    expect(resolveEmployee("ghost", map)).toBeNull();
  });
});

describe(convertMarker, () => {
  it("converts presence markers to day fractions", () => {
    expect(convertMarker("x")).toBe(1);
    expect(convertMarker("x/2")).toBe(0.5);
  });

  it("treats anything else as absent", () => {
    expect(convertMarker("")).toBe(0);
    expect(convertMarker("-")).toBe(0);
    expect(convertMarker("X")).toBe(0);
  });
});

describe(toYearMonth, () => {
  it("zero-pads the month", () => {
    expect(toYearMonth(2026, 1)).toBe("2026-01");
    expect(toYearMonth(2026, 12)).toBe("2026-12");
  });
});

describe(mapCategory, () => {
  it("maps bug (case-insensitive, trimmed) to bug", () => {
    expect(mapCategory("bug")).toBe("bug");
    expect(mapCategory(" Bug ")).toBe("bug");
  });

  it("maps everything else to feature", () => {
    expect(mapCategory("Feature")).toBe("feature");
    expect(mapCategory("")).toBe("feature");
    expect(mapCategory("improvement")).toBe("feature");
  });
});

describe(inheritMissingDates, () => {
  it("fills missing dates from the nearest preceding row", () => {
    const rows = [
      { processDate: "2026-01-05" },
      { processDate: null },
      { processDate: null },
      { processDate: "2026-02-10" },
      { processDate: null },
    ];
    inheritMissingDates(rows);
    expect(rows.map((r) => r.processDate)).toStrictEqual([
      "2026-01-05",
      "2026-01-05",
      "2026-01-05",
      "2026-02-10",
      "2026-02-10",
    ]);
  });

  it("leaves leading rows without a date as null", () => {
    const rows = [{ processDate: null }, { processDate: "2026-03-01" }];
    inheritMissingDates(rows);
    expect(rows[0]!.processDate).toBeNull();
  });
});

describe(parseEffort, () => {
  it("parses numbers and numeric strings", () => {
    expect(parseEffort(2.5)).toBe(2.5);
    expect(parseEffort("1.5")).toBe(1.5);
    expect(parseEffort(0)).toBe(0);
  });

  it("maps empty / null / undefined / non-numeric to 0", () => {
    expect(parseEffort("")).toBe(0);
    expect(parseEffort(null)).toBe(0);
    expect(parseEffort()).toBe(0);
    expect(parseEffort("n/a")).toBe(0);
  });
});

describe(parseTotalEffort, () => {
  it("parses positive numbers", () => {
    expect(parseTotalEffort(8)).toBe(8);
    expect(parseTotalEffort("3.5")).toBe(3.5);
  });

  it("maps empty, zero, and non-numeric to null", () => {
    expect(parseTotalEffort("")).toBeNull();
    expect(parseTotalEffort(null)).toBeNull();
    expect(parseTotalEffort()).toBeNull();
    expect(parseTotalEffort(0)).toBeNull();
    expect(parseTotalEffort("abc")).toBeNull();
  });
});

describe(parseReopenStatus, () => {
  it("parses numeric counts", () => {
    expect(parseReopenStatus(2)).toBe(2);
    expect(parseReopenStatus("1")).toBe(1);
  });

  it("maps empty and non-numeric to 0", () => {
    expect(parseReopenStatus("")).toBe(0);
    expect(parseReopenStatus(null)).toBe(0);
    expect(parseReopenStatus("x")).toBe(0);
  });
});

describe(normalizeDate, () => {
  it("passes through YYYY-MM-DD", () => {
    expect(normalizeDate("2026-01-15")).toBe("2026-01-15");
  });

  it("converts MM/DD/YYYY with optional time suffix", () => {
    expect(normalizeDate("1/5/2026")).toBe("2026-01-05");
    expect(normalizeDate("12/31/2026 10:30:00")).toBe("2026-12-31");
  });

  it("converts Excel serial numbers", () => {
    // 2026-01-15 = 25569 (epoch) + 20468 days
    expect(normalizeDate(46_037)).toBe("2026-01-15");
  });

  it("returns null for blank or unparseable values", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate()).toBeNull();
    expect(normalizeDate("not a date")).toBeNull();
  });
});

describe(foldKpiRows, () => {
  it("extracts target/result from the aggregate row and builds monthlyValues from monthly rows", () => {
    const folded = foldKpiRows([
      { month: null, result: 3.2, target: 4 },
      { month: "2026-01", result: 3, target: null },
      { month: "2026-02", result: 3.5, target: null },
    ]);
    expect(folded.target).toBe(4);
    expect(folded.result).toBe(3.2);
    expect(folded.monthlyValues).toStrictEqual({
      "2026-01": 3,
      "2026-02": 3.5,
    });
  });

  it("returns null target/result when there is no aggregate row", () => {
    const folded = foldKpiRows([{ month: "2026-03", result: 2, target: null }]);
    expect(folded.target).toBeNull();
    expect(folded.result).toBeNull();
    expect(folded.monthlyValues).toStrictEqual({ "2026-03": 2 });
  });

  it("skips monthly rows where result is null", () => {
    const folded = foldKpiRows([
      { month: null, result: null, target: 5 },
      { month: "2026-04", result: null, target: null },
    ]);
    expect(folded.monthlyValues).toStrictEqual({});
  });

  it("first non-null target/result wins when multiple aggregate rows exist (Ben merge scenario)", () => {
    const folded = foldKpiRows([
      { month: null, result: null, target: 4 },
      { month: null, result: 3.8, target: null },
    ]);
    expect(folded.target).toBe(4);
    expect(folded.result).toBe(3.8);
  });

  it("first non-null monthly result wins on duplicate months", () => {
    const folded = foldKpiRows([
      { month: "2026-01", result: 3, target: null },
      { month: "2026-01", result: 5, target: null },
    ]);
    expect(folded.monthlyValues["2026-01"]).toBe(3);
  });
});
