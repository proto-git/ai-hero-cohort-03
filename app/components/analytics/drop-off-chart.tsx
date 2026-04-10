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
import type { DropOffLessonRow } from "~/services/analyticsService";

type DropOffChartProps = {
  title: string;
  description?: string;
  rows: DropOffLessonRow[];
  /** Tailwind height utility, e.g. "h-80". */
  heightClass?: string;
  /** Empty-state copy when there's no data to plot. */
  emptyMessage?: string;
};

/**
 * A bar-per-lesson drop-off chart with bars visually grouped by module.
 *
 * The plan calls for "lessons grouped visually by module" so an instructor
 * can spot whether one specific lesson is the problem versus a whole module.
 * We achieve that grouping with two cues:
 *
 *  1. Adjacent lessons in the same module share a fill color, then the next
 *     module flips to a contrasting shade. The eye picks up the boundary
 *     immediately without needing reference lines or separate axes.
 *  2. The tooltip prefixes the lesson title with its module title so the
 *     module context is always one hover away.
 *
 * Bar height is `reachedCount` — distinct students who reached that lesson
 * under the "completed lesson N or any later" rule from `getCourseDropOff`.
 */
export function DropOffChart({
  title,
  description,
  rows,
  heightClass = "h-80",
  emptyMessage = "No student progress yet — drop-off will appear once students start the course.",
}: DropOffChartProps) {
  const hasData = rows.length > 0;

  // Assign a 0-based module index to each row so we can alternate colors per
  // module group without caring about the actual moduleId values.
  const moduleIdToIndex = new Map<number, number>();
  for (const row of rows) {
    if (!moduleIdToIndex.has(row.moduleId)) {
      moduleIdToIndex.set(row.moduleId, moduleIdToIndex.size);
    }
  }

  // The chart receives an `index` field for the X axis label so duplicate
  // lesson titles can't collapse onto the same tick.
  const data = rows.map((row, index) => ({
    index: String(index + 1),
    lessonTitle: row.lessonTitle,
    moduleTitle: row.moduleTitle,
    reachedCount: row.reachedCount,
    moduleGroupIndex: moduleIdToIndex.get(row.moduleId)!,
  }));

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
              <BarChart
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  className="fill-muted-foreground"
                  label={{
                    value: "Lesson #",
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                  className="fill-muted-foreground"
                  width={48}
                  label={{
                    value: "Students",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  cursor={{ className: "fill-muted/50" }}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                  formatter={(value) => [value, "Students reached"]}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { lessonTitle: string; moduleTitle: string }
                      | undefined;
                    if (!row) return "";
                    return `${row.moduleTitle} — ${row.lessonTitle}`;
                  }}
                />
                <Bar dataKey="reachedCount" radius={[4, 4, 0, 0]}>
                  {data.map((row) => (
                    <Cell
                      key={row.index}
                      // Alternate between primary and a 60% mix on the
                      // module group index so adjacent modules contrast.
                      fill={
                        row.moduleGroupIndex % 2 === 0
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
      </CardContent>
    </Card>
  );
}
