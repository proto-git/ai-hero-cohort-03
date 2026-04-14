import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  /**
   * Optional secondary line shown under the headline value in muted, smaller
   * text. Use for context that qualifies the number — e.g. the course name
   * behind a "top earning course" revenue figure. Truncated with ellipsis
   * so the card keeps a uniform height next to its siblings.
   */
  sublabel?: string;
};

/**
 * A single labelled KPI tile used across the analytics dashboard.
 *
 * The component is intentionally dumb: it never formats numbers or chooses
 * an empty-state placeholder itself. Callers compute the display string
 * (e.g. "$74.00", "—", "0") so the same card can render currency, percent,
 * counts, and missing values without branching here.
 */
export function KpiCard({ label, value, icon, sublabel }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {sublabel ? (
          <p
            className="mt-1 truncate text-sm text-muted-foreground"
            title={sublabel}
          >
            {sublabel}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
