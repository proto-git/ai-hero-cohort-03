import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { CountryRevenueRow } from "~/services/analyticsService";

type CountryRevenueListProps = {
  title: string;
  description?: string;
  rows: CountryRevenueRow[];
  emptyMessage?: string;
  /** When true, shows the "PPP not enabled" message instead of the rows. */
  pppDisabled?: boolean;
};

/**
 * Per-country revenue breakdown rendered as a list of inline progress bars.
 *
 * Why a list and not a Recharts bar chart:
 *  - Currency labels need real text (e.g. "$249.50") next to each row;
 *    a chart's tooltip would hide that until hover.
 *  - Country counts vary wildly (3 countries vs. 30); a list scrolls
 *    naturally where a categorical bar chart squeezes labels together.
 *  - Same idiom as `WatchThroughList`, so the page feels consistent.
 *
 * Bar widths are normalized to the row with the largest revenue, so the
 * top country always fills the bar and everything else scales relative to it.
 *
 * Three distinct empty states:
 *   1. PPP disabled — render an explanatory message instead of the rows
 *      (the breakdown is meaningless without PPP because every buyer pays
 *      the same price).
 *   2. PPP enabled but no purchases — generic "no data yet" message.
 *   3. Rows present — the populated list.
 */
export function CountryRevenueList({
  title,
  description,
  rows,
  emptyMessage = "No purchase data yet — country breakdown will appear once students buy this course.",
  pppDisabled = false,
}: CountryRevenueListProps) {
  const maxRevenue = rows.reduce(
    (max, row) => (row.revenueCents > max ? row.revenueCents : max),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {pppDisabled ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            PPP pricing is not enabled for this course, so every buyer pays the
            same price regardless of country. The geographic breakdown only
            tells a useful story when prices vary by region.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const widthPercent =
                maxRevenue > 0 ? (row.revenueCents / maxRevenue) * 100 : 0;
              return (
                <li
                  key={row.country}
                  className="grid grid-cols-[1fr_auto] items-center gap-3"
                >
                  <div>
                    <p className="mb-1 truncate text-sm font-medium">
                      {row.country}
                    </p>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    ${(row.revenueCents / 100).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
