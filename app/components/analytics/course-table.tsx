import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { CourseSummaryRow } from "~/services/analyticsService";

type SortKey =
  | "title"
  | "enrollments"
  | "completionRate"
  | "averageRating"
  | "revenueCents";

type SortDirection = "asc" | "desc";

type CourseTableProps = {
  rows: CourseSummaryRow[];
  /** Format a fraction in [0, 1] as e.g. "75%" or "—". */
  formatPercent: (fraction: number) => string;
  /** Format an average rating in [1, 5] as e.g. "4.5" or "—". */
  formatRating: (rating: number) => string;
  /** Format cents as e.g. "$74.00" or "—". */
  formatRevenue: (cents: number) => string;
};

type ColumnDef = {
  key: SortKey;
  label: string;
  /** Tailwind text-alignment for the cell + header. */
  align: "left" | "right";
};

const COLUMNS: ColumnDef[] = [
  { key: "title", label: "Course", align: "left" },
  { key: "enrollments", label: "Enrollments", align: "right" },
  { key: "completionRate", label: "Completion", align: "right" },
  { key: "averageRating", label: "Avg rating", align: "right" },
  { key: "revenueCents", label: "Revenue", align: "right" },
];

const titleCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/**
 * Compare two summary rows by the active sort column and direction.
 *
 * Constraints:
 *  - The "title" column is a string compare; every other column is numeric.
 *  - `direction` is "asc" or "desc".
 *  - Return a negative number if `a` should come before `b`, positive if
 *    after, and 0 if equal — the same contract as `Array.prototype.sort`.
 */
function compareRows(
  a: CourseSummaryRow,
  b: CourseSummaryRow,
  key: SortKey,
  direction: SortDirection
): number {
  const compareTitles = () => {
    const titleResult = titleCollator.compare(a.title, b.title);
    return titleResult !== 0 ? titleResult : a.courseId - b.courseId;
  };

  if (key === "title") {
    const titleResult = compareTitles();
    return direction === "asc" ? titleResult : -titleResult;
  }

  const aMissing =
    (key === "completionRate" && a.enrollments === 0) ||
    (key === "averageRating" && a.averageRating === 0);
  const bMissing =
    (key === "completionRate" && b.enrollments === 0) ||
    (key === "averageRating" && b.averageRating === 0);

  if (aMissing !== bMissing) {
    return aMissing ? 1 : -1;
  }

  let valueResult = 0;

  switch (key) {
    case "enrollments":
      valueResult = a.enrollments - b.enrollments;
      break;
    case "completionRate":
      valueResult = a.completionRate - b.completionRate;
      break;
    case "averageRating":
      valueResult = a.averageRating - b.averageRating;
      break;
    case "revenueCents":
      valueResult = a.revenueCents - b.revenueCents;
      break;
  }

  if (valueResult !== 0) {
    return direction === "asc" ? valueResult : -valueResult;
  }

  return compareTitles();
}

/**
 * Cross-course summary table for the instructor analytics overview.
 *
 * Sorting is client-side: instructors typically have a small number of
 * courses, so we ship the full set down once and let React re-sort it
 * locally rather than reloading the page on every header click.
 *
 * Each row links to `/instructor/:courseId/analytics`. That route may 404
 * until Phase 4 ships — the link is wired now so Phase 4 doesn't need to
 * touch this component again.
 */
export function CourseTable({
  rows,
  formatPercent,
  formatRating,
  formatRevenue,
}: CourseTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenueCents");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDirection));
  }, [rows, sortKey, sortDirection]);

  function handleHeaderClick(key: SortKey) {
    if (key === sortKey) {
      // Same column twice → flip direction.
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      // New column → start descending for numerics, ascending for the title.
      setSortKey(key);
      setSortDirection(key === "title" ? "asc" : "desc");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Courses</CardTitle>
        <CardDescription>
          Click a column to sort. Click a row to drill into the per-course
          analytics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                {COLUMNS.map((col) => {
                  const isActive = col.key === sortKey;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        "px-3 py-2 font-medium",
                        col.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleHeaderClick(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                          isActive && "text-foreground"
                        )}
                        aria-sort={
                          isActive
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <span>{col.label}</span>
                        <SortIcon
                          active={isActive}
                          direction={sortDirection}
                        />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No courses yet — publish your first course to see
                    analytics here.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr
                    key={row.courseId}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-3 py-3">
                      <Link
                        to={`/instructor/${row.courseId}/analytics`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.enrollments.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.enrollments === 0
                        ? "—"
                        : formatPercent(row.completionRate)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatRating(row.averageRating)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatRevenue(row.revenueCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) return <ArrowUpDown className="size-3 opacity-50" />;
  return direction === "asc" ? (
    <ArrowUp className="size-3" />
  ) : (
    <ArrowDown className="size-3" />
  );
}
