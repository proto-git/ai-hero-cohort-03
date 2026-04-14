import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/admin.analytics";
import { AlertTriangle, DollarSign, Trophy, Users } from "lucide-react";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { UserRole } from "~/db/schema";
import {
  type AdminTimePeriod,
  getAdminTotalEnrollments,
  getAdminTopEarningCourse,
  getAdminTotalRevenue,
} from "~/services/analyticsService";
import { Button } from "~/components/ui/button";
import { KpiCard } from "~/components/analytics/kpi-card";
import { PeriodTabs } from "~/components/analytics/period-tabs";

export function meta() {
  return [
    { title: "Admin Analytics — Cadence" },
    {
      name: "description",
      content: "Platform-wide revenue and enrollment analytics",
    },
  ];
}

const VALID_PERIODS: AdminTimePeriod[] = ["7d", "30d", "12m", "all"];
const DEFAULT_PERIOD: AdminTimePeriod = "30d";

/**
 * Parse `?period=` into a validated `AdminTimePeriod`.
 *
 * Unknown or missing values fall back to the default (30d) rather than
 * throwing — a stale bookmark or typo should degrade gracefully into the
 * default view, and the tab strip will visibly snap to 30d so the user
 * knows what happened.
 */
function parsePeriod(searchParams: URLSearchParams): AdminTimePeriod {
  const raw = searchParams.get("period");
  if (raw && (VALID_PERIODS as string[]).includes(raw)) {
    return raw as AdminTimePeriod;
  }
  return DEFAULT_PERIOD;
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user) {
    throw data("Your user account could not be found.", { status: 401 });
  }

  if (user.role !== UserRole.Admin) {
    throw data("Only admins can access platform analytics.", { status: 403 });
  }

  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams);

  const totalRevenue = getAdminTotalRevenue({ period });
  const totalEnrollments = getAdminTotalEnrollments({ period });
  const topEarningCourse = getAdminTopEarningCourse({ period });

  return {
    period,
    totalRevenue,
    totalEnrollments,
    topEarningCourse,
  };
}

/** Format cents as "$X.XX", always returning a dollar value even at zero. */
function formatRevenueCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Like `formatRevenueCents` but renders "—" at zero, matching other KPI cards. */
function formatRevenueKpi(cents: number): string {
  if (!cents) return "—";
  return formatRevenueCents(cents);
}

const PERIOD_SUBTITLE: Record<AdminTimePeriod, string> = {
  "7d": "Last 7 days across every instructor.",
  "30d": "Last 30 days across every instructor.",
  "12m": "Last 12 months across every instructor.",
  all: "All-time performance across every instructor.",
};

export default function AdminAnalytics({ loaderData }: Route.ComponentProps) {
  const { period, totalRevenue, totalEnrollments, topEarningCourse } =
    loaderData;

  // "No data" when no revenue AND no enrollments in the window — either
  // signal is enough to keep the cards informative (e.g. a new course with
  // free enrollments still has data worth showing).
  const hasData = totalRevenue > 0 || totalEnrollments > 0;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Admin analytics</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Platform analytics</h1>
          <p className="mt-1 text-muted-foreground">
            {PERIOD_SUBTITLE[period]}
          </p>
        </div>
        <PeriodTabs selected={period} basePath="/admin/analytics" />
      </div>

      {hasData ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Total revenue"
            value={formatRevenueKpi(totalRevenue)}
            icon={<DollarSign className="size-4" />}
          />
          <KpiCard
            label="Total enrollments"
            value={totalEnrollments.toLocaleString()}
            icon={<Users className="size-4" />}
          />
          <KpiCard
            label="Top earning course"
            value={
              topEarningCourse
                ? formatRevenueCents(topEarningCourse.revenueCents)
                : "—"
            }
            sublabel={topEarningCourse?.title}
            icon={<Trophy className="size-4" />}
          />
        </div>
      ) : (
        <EmptyState period={period} />
      )}
    </div>
  );
}

function EmptyState({ period }: { period: AdminTimePeriod }) {
  const message =
    period === "all"
      ? "No revenue or enrollments have been recorded yet. Once students start signing up, this page will fill in."
      : "No activity in this window. Try widening the time period.";

  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <Trophy className="mx-auto mb-4 size-10 text-muted-foreground" />
      <h2 className="mb-2 text-lg font-semibold">Nothing to show yet</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message =
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message =
        typeof error.data === "string"
          ? error.data
          : "You don't have permission to access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
