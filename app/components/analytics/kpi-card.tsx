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
};

/**
 * A single labelled KPI tile used across the analytics dashboard.
 *
 * The component is intentionally dumb: it never formats numbers or chooses
 * an empty-state placeholder itself. Callers compute the display string
 * (e.g. "$74.00", "—", "0") so the same card can render currency, percent,
 * counts, and missing values without branching here.
 */
export function KpiCard({ label, value, icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
