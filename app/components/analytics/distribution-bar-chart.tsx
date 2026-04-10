import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

export type DistributionBar = {
  /** X-axis label for this bar (e.g. an option letter, a star value, a country). */
  label: string;
  /** Bar height. */
  value: number;
  /**
   * When true, the bar is rendered in the highlighted (primary) color. Used
   * for the "this is the correct answer" cue on quiz option distributions
   * and reserved for the "selected category" cue on future tabs.
   */
  highlighted?: boolean;
};

type DistributionBarChartProps = {
  title?: string;
  description?: string;
  data: DistributionBar[];
  /**
   * Empty-state copy. The chart treats `data.length === 0` AND
   * "every bar is zero" as empty, since a histogram of all zeros is more
   * confusing than a "no data yet" message.
   */
  emptyMessage?: string;
  /** Tailwind height utility, e.g. "h-64". */
  heightClass?: string;
  /** Format the Y axis tick + tooltip value. Defaults to identity. */
  formatY?: (value: number) => string;
  /** Whether to wrap the chart in a Card. Defaults to true. */
  withCard?: boolean;
};

/**
 * A bar chart for categorical distributions: quiz option selections, star
 * histograms, country buckets, etc. Bars are colored by the `highlighted`
 * flag on each row, so the caller decides which bar (if any) is the
 * "correct answer" / "selected category" cue.
 *
 * Empty state: when `data.length === 0` OR every value is zero, we replace
 * the chart frame with a centered message in the same Card so the page
 * layout doesn't shift between empty and populated.
 */
export function DistributionBarChart({
  title,
  description,
  data,
  emptyMessage = "No data yet.",
  heightClass = "h-56",
  formatY,
  withCard = true,
}: DistributionBarChartProps) {
  const totalValue = data.reduce((sum, row) => sum + row.value, 0);
  const hasData = data.length > 0 && totalValue > 0;

  const chart = (
    <div className={heightClass}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              interval={0}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatY}
              allowDecimals={false}
              className="fill-muted-foreground"
              width={48}
            />
            <Tooltip
              cursor={{ className: "fill-muted/50" }}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
              formatter={(value) => {
                if (typeof value !== "number") return String(value ?? "");
                return formatY ? formatY(value) : String(value);
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((row, index) => (
                <Cell
                  key={`${row.label}-${index}`}
                  // Highlighted bars use the primary color so the "correct
                  // answer" cue is unmissable; non-highlighted bars use a
                  // dimmer muted-foreground so they read as distractors.
                  fill={
                    row.highlighted
                      ? "var(--primary)"
                      : "var(--muted-foreground)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );

  if (!withCard) return chart;

  return (
    <Card>
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
