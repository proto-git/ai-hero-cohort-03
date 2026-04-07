import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/instructor.$courseId.analytics";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Star,
  Users,
} from "lucide-react";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { getCourseById } from "~/services/courseService";
import { UserRole } from "~/db/schema";
import {
  getAverageCompletionRate,
  getAverageQuizPassRate,
  getAverageRating,
  getCourseDropOff,
  getCourseQuizPerformance,
  getCourseVideoWatchThrough,
  getTotalEnrollments,
  getTotalRevenue,
} from "~/services/analyticsService";
import { Button } from "~/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Card, CardContent } from "~/components/ui/card";
import { KpiCard } from "~/components/analytics/kpi-card";
import { DropOffChart } from "~/components/analytics/drop-off-chart";
import { WatchThroughList } from "~/components/analytics/watch-through-list";
import { QuizzesPanel } from "~/components/analytics/quizzes-panel";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.course?.title ?? "Course Analytics";
  return [
    { title: `Analytics: ${title} — Cadence` },
    {
      name: "description",
      content: `Engagement, quizzes, revenue, and ratings for ${title}`,
    },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view course analytics.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user) {
    throw data("Your user account could not be found.", { status: 401 });
  }

  if (user.role !== UserRole.Instructor && user.role !== UserRole.Admin) {
    throw data("Only instructors and admins can access analytics.", {
      status: 403,
    });
  }

  const courseId = Number.parseInt(params.courseId, 10);
  if (Number.isNaN(courseId)) {
    throw data("Invalid course ID.", { status: 400 });
  }

  const course = getCourseById(courseId);

  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  // Ownership: instructors can only see their own courses; admins bypass.
  // Per the plan, an instructor viewing someone else's course is 403, NOT 404 —
  // we already know the course exists, just that this user can't see it.
  if (
    user.role === UserRole.Instructor &&
    course.instructorId !== currentUserId
  ) {
    throw data("You can only view analytics for your own courses.", {
      status: 403,
    });
  }

  // Scope every analytics call to this single course. We pass courseId
  // (not instructorId) so admins viewing another instructor's course get
  // the same numbers the owning instructor would.
  const scope = { courseId };

  const totalRevenue = getTotalRevenue(scope);
  const totalEnrollments = getTotalEnrollments(scope);
  const completionRate = getAverageCompletionRate(scope);
  const quizPassRate = getAverageQuizPassRate(scope);
  const averageRating = getAverageRating(scope);
  const dropOff = getCourseDropOff(scope);
  const watchThrough = getCourseVideoWatchThrough(scope);
  const quizPerformance = getCourseQuizPerformance(scope);

  return {
    course,
    viewerRole: user.role,
    totalRevenue,
    totalEnrollments,
    completionRate,
    quizPassRate,
    averageRating,
    dropOff,
    watchThrough,
    quizPerformance,
  };
}

/** Format a fraction in [0, 1] as a percentage string, or "—" when zero. */
function formatPercent(fraction: number): string {
  if (!fraction) return "—";
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Format cents as a dollar string. The KPI card variant returns "—" at zero
 * to match the rest of the dashboard's empty-state convention.
 */
function formatRevenueKpi(cents: number): string {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a rating in [1, 5] with one decimal, or "—" when zero. */
function formatRating(rating: number): string {
  if (!rating) return "—";
  return rating.toFixed(1);
}

/** A placeholder rendered for tabs that aren't wired up in this phase. */
function ComingSoonPanel({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {label} analytics are coming soon.
        </p>
      </CardContent>
    </Card>
  );
}

export default function InstructorCourseAnalytics({
  loaderData,
}: Route.ComponentProps) {
  const {
    course,
    totalRevenue,
    totalEnrollments,
    completionRate,
    quizPassRate,
    averageRating,
    dropOff,
    watchThrough,
    quizPerformance,
  } = loaderData;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/instructor/analytics" className="hover:text-foreground">
          Analytics
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{course.title}</span>
      </nav>

      <Link
        to="/instructor/analytics"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Overview
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="mt-1 text-muted-foreground">
          Course-level analytics: engagement, quizzes, revenue, and ratings.
        </p>
      </div>

      <Tabs defaultValue="engagement" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Revenue"
              value={formatRevenueKpi(totalRevenue)}
              icon={<DollarSign className="size-4" />}
            />
            <KpiCard
              label="Enrollments"
              value={totalEnrollments.toLocaleString()}
              icon={<Users className="size-4" />}
            />
            <KpiCard
              label="Completion"
              value={formatPercent(completionRate)}
              icon={<GraduationCap className="size-4" />}
            />
            <KpiCard
              label="Quiz pass rate"
              value={formatPercent(quizPassRate)}
              icon={<CheckCircle2 className="size-4" />}
            />
            <KpiCard
              label="Avg rating"
              value={formatRating(averageRating)}
              icon={<Star className="size-4" />}
            />
          </div>

          <DropOffChart
            title="Lesson drop-off"
            description="Distinct students who reached each lesson, in module/lesson order. Adjacent shades mark module boundaries."
            rows={dropOff}
          />

          <WatchThroughList
            title="Video watch-through"
            description="Average percentage of each lesson's video watched, across students who started it. Lessons without a duration set are not measured."
            rows={watchThrough}
          />
        </TabsContent>

        <TabsContent value="quizzes">
          <QuizzesPanel
            title="Quiz performance"
            description="Per-quiz pass rates with drill-down to question correct rates and option distributions. Click a quiz to expand."
            quizzes={quizPerformance}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <ComingSoonPanel label="Revenue" />
        </TabsContent>

        <TabsContent value="ratings">
          <ComingSoonPanel label="Ratings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading course analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Course not found";
      message =
        "The course you're looking for doesn't exist or may have been removed.";
    } else if (error.status === 401) {
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
          : "You don't have permission to view these analytics.";
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
          <Link to="/instructor/analytics">
            <Button variant="outline">Analytics Overview</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
