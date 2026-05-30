import { useState, useMemo } from "react";

const getVal = (obj, key) =>
  key.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

/**
 * useSortable — frontend sort for table rows.
 *
 * 3-state cycle per column:
 *   click 1 (new column or first click) → ascending
 *   click 2 (same column)              → descending
 *   click 3+ (same column)             → toggles asc/desc indefinitely
 *
 * Sort resets to default on page refresh.
 */
export function useSortable(data = [], initialSort = null) {
  const [sortBy,  setSortBy]  = useState(initialSort?.column ?? null);
  const [sortDir, setSortDir] = useState(initialSort?.dir    ?? "asc");

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      const av = getVal(a, sortBy);
      const bv = getVal(b, sortBy);
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "en", {
              sensitivity: "base",
              numeric: true,
            });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortBy, sortDir]);

  return { sortedData, sortBy, sortDir, toggleSort };
}
