import {
  LineChart,
  Line,
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

export type TrendPoint = {
  /** Bucket label shown on the X axis (e.g. "2026-03"). */
  bucket: string;
  /** Numeric value for the Y axis. */
  value: number;
};

type TrendLineChartProps = {
  title: string;
  description?: string;
  data: TrendPoint[];
  /** Format the Y axis tick + tooltip value (e.g. cents → "$1.50"). */
  formatY?: (value: number) => string;
  /** Empty-state copy when there is no data to plot. */
  emptyMessage?: string;
  /** Tailwind height utility, e.g. "h-72". */
  heightClass?: string;
};

/**
 * Thin Recharts wrapper styled to match the existing shadcn cards.
 *
 * The wrapper exists so route pages don't have to know about
 * `ResponsiveContainer`, axis configuration, or empty-state UX —
 * they pass an array of `{ bucket, value }` and a formatter.
 *
 * Empty state: when `data.length === 0`, the chart frame is replaced
 * by a centered message inside the same Card so the page layout
 * doesn't shift between the empty and populated states.
 */
export function TrendLineChart({
  title,
  description,
  data,
  formatY,
  emptyMessage = "No data yet.",
  heightClass = "h-72",
}: TrendLineChartProps) {
  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={heightClass}>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatY}
                  className="fill-muted-foreground"
                  width={64}
                />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value !== "number") return String(value ?? "");
                    return formatY ? formatY(value) : String(value);
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  className="text-primary"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
