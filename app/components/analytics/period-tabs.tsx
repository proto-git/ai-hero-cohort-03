import { useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { AdminTimePeriod } from "~/services/analyticsService";

type PeriodTabsProps = {
  /** The period the loader resolved (after parsing/validating the URL). */
  selected: AdminTimePeriod;
  /** Route path this picker navigates to when a tab changes. */
  basePath: string;
};

const OPTIONS: Array<{ value: AdminTimePeriod; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "12m", label: "12 months" },
  { value: "all", label: "All time" },
];

/**
 * Tab strip that drives the admin analytics time window via `?period=`.
 *
 * URL is the source of truth — selecting a tab navigates, which re-runs the
 * loader with the new period. This keeps the view bookmarkable and means
 * the loader never has to read client state. The default (30d) is encoded
 * as the absence of a `period` param, so `/admin/analytics` and
 * `/admin/analytics?period=30d` are the same view.
 */
export function PeriodTabs({ selected, basePath }: PeriodTabsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function handleChange(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "30d") {
      next.delete("period");
    } else {
      next.set("period", value);
    }
    const qs = next.toString();
    navigate(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <Tabs value={selected} onValueChange={handleChange}>
      <TabsList>
        {OPTIONS.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
