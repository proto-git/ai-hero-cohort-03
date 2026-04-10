import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import type { LessonWatchThroughRow } from "~/services/analyticsService";

type WatchThroughListProps = {
  title: string;
  description?: string;
  rows: LessonWatchThroughRow[];
  emptyMessage?: string;
};

/**
 * Per-lesson average watch-through, rendered as a list of inline progress
 * bars rather than a Recharts bar chart.
 *
 * Why a list and not a chart:
 *  - Watch-through is a 0–100% value per lesson; a list of progress bars
 *    reads more naturally than a bar chart of percentages.
 *  - Each row carries enough context (module + lesson title + percentage)
 *    that a chart's tooltip would be the only way to surface it, which
 *    forces the instructor to hover every bar.
 *
 * Empty state: shows a centered message inside the same Card as the
 * populated list to avoid layout shift between the two states.
 */
export function WatchThroughList({
  title,
  description,
  rows,
  emptyMessage = "No video watch data yet — averages will appear once students watch lessons with a duration set.",
}: WatchThroughListProps) {
  // Group rows by module so we can render a small module heading above each
  // group. The service already returns rows in module/lesson order, so a
  // single pass with a "previous module" cursor is enough.
  const groups: { moduleId: number; moduleTitle: string; rows: LessonWatchThroughRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (!last || last.moduleId !== row.moduleId) {
      groups.push({
        moduleId: row.moduleId,
        moduleTitle: row.moduleTitle,
        rows: [row],
      });
    } else {
      last.rows.push(row);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.moduleId}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.moduleTitle}
                </h3>
                <ul className="space-y-2">
                  {group.rows.map((row) => {
                    const percent = Math.round(row.averageWatchThrough * 100);
                    return (
                      <li
                        key={row.lessonId}
                        className="grid grid-cols-[1fr_auto] items-center gap-3"
                      >
                        <div>
                          <p className="mb-1 truncate text-sm font-medium">
                            {row.lessonTitle}
                          </p>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums text-muted-foreground">
                          {percent}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
