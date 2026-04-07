import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/instructor.analytics";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Star,
  Users,
} from "lucide-react";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { UserRole } from "~/db/schema";
import {
  getAverageCompletionRate,
  getAverageQuizPassRate,
  getAverageRating,
  getEnrollmentTimeSeries,
  getPerCourseSummary,
  getRevenueTimeSeries,
  getTotalEnrollments,
  getTotalRevenue,
} from "~/services/analyticsService";
import { Button } from "~/components/ui/button";
import { KpiCard } from "~/components/analytics/kpi-card";
import { TrendLineChart } from "~/components/analytics/trend-line-chart";
import { CourseTable } from "~/components/analytics/course-table";

export function meta() {
  return [
    { title: "Analytics — Cadence" },
    { name: "description", content: "Performance analytics for your courses" },
  ];
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

  if (user.role !== UserRole.Instructor && user.role !== UserRole.Admin) {
    throw data("Only instructors can access analytics.", { status: 403 });
  }

  // Instructors are scoped to their own data. Admins are unscoped in Phase 1
  // (the instructor picker that lets them filter arrives in Phase 7).
  const scope =
    user.role === UserRole.Instructor
      ? { instructorId: currentUserId }
      : {};

  const totalRevenue = getTotalRevenue(scope);
  const totalEnrollments = getTotalEnrollments(scope);
  const avgCompletionRate = getAverageCompletionRate(scope);
  const avgQuizPassRate = getAverageQuizPassRate(scope);
  const avgRating = getAverageRating(scope);
  const revenueTimeSeries = getRevenueTimeSeries(scope);
  const enrollmentTimeSeries = getEnrollmentTimeSeries(scope);
  const courseSummaries = getPerCourseSummary(scope);

  return {
    viewerRole: user.role,
    totalRevenue,
    totalEnrollments,
    avgCompletionRate,
    avgQuizPassRate,
    avgRating,
    revenueTimeSeries,
    enrollmentTimeSeries,
    courseSummaries,
  };
}

/** Format a fraction in [0, 1] as a percentage string, or "—" when zero. */
function formatPercent(fraction: number): string {
  if (!fraction) return "—";
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Format cents as a dollar amount, always returning a $ value even at zero.
 *
 * Distinct from `formatPrice` (which returns "Free" at zero, the right call
 * for a course price tag but wrong for an analytics axis where 0 means
 * "no revenue this period").
 */
function formatRevenueCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Like `formatRevenueCents` but renders "—" at zero, matching other KPIs. */
function formatRevenueKpi(cents: number): string {
  if (!cents) return "—";
  return formatRevenueCents(cents);
}

/** Format an average rating in [1, 5] with one decimal, or "—" when zero. */
function formatRating(rating: number): string {
  if (!rating) return "—";
  return rating.toFixed(1);
}

export default function InstructorAnalytics({
  loaderData,
}: Route.ComponentProps) {
  const {
    viewerRole,
    totalRevenue,
    totalEnrollments,
    avgCompletionRate,
    avgQuizPassRate,
    avgRating,
    revenueTimeSeries,
    enrollmentTimeSeries,
    courseSummaries,
  } = loaderData;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          {viewerRole === UserRole.Admin
            ? "Platform-wide performance across every instructor."
            : "Performance across all of your courses."}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Avg completion"
          value={formatPercent(avgCompletionRate)}
          icon={<GraduationCap className="size-4" />}
        />
        <KpiCard
          label="Avg quiz pass rate"
          value={formatPercent(avgQuizPassRate)}
          icon={<CheckCircle2 className="size-4" />}
        />
        <KpiCard
          label="Avg rating"
          value={formatRating(avgRating)}
          icon={<Star className="size-4" />}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <TrendLineChart
          title="Revenue over time"
          description="Monthly revenue across your courses"
          data={revenueTimeSeries}
          formatY={formatRevenueCents}
          emptyMessage="No revenue yet — keep building."
        />
        <TrendLineChart
          title="Enrollments over time"
          description="New enrollments per month"
          data={enrollmentTimeSeries}
          formatY={(value) => value.toLocaleString()}
          emptyMessage="No enrollments yet."
        />
      </div>

      <CourseTable
        rows={courseSummaries}
        formatPercent={formatPercent}
        formatRating={formatRating}
        formatRevenue={formatRevenueKpi}
      />
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
          <Link to="/instructor">
            <Button variant="outline">My Courses</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
