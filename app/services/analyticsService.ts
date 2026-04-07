import { eq, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  courses,
  courseReviews,
  enrollments,
  purchases,
  quizAttempts,
  quizzes,
  lessons,
  modules,
} from "~/db/schema";

/**
 * Optional date range bound for analytics queries.
 *
 * Phase 1 does not pass this from any caller — it exists so that adding
 * time-range filtering in a future phase is a non-breaking change.
 * Both bounds are inclusive ISO-8601 strings when present.
 */
export type DateRange = {
  from?: string;
  to?: string;
};

type AnalyticsScope = {
  instructorId?: number;
  dateRange?: DateRange;
};

/** A single point in a monthly time series. `bucket` is "YYYY-MM". */
export type TimeSeriesPoint = {
  bucket: string;
  value: number;
};

/**
 * Total revenue across courses, in cents.
 *
 * - When `instructorId` is provided, sums only purchases of courses owned by
 *   that instructor.
 * - When `instructorId` is omitted, sums purchases across the entire platform
 *   (admin aggregate view).
 *
 * Returns 0 when there are no matching purchases — never null or undefined.
 */
export function getTotalRevenue(opts: AnalyticsScope = {}): number {
  const query = db
    .select({
      total: sql<number>`COALESCE(SUM(${purchases.pricePaid}), 0)`,
    })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id));

  const row =
    opts.instructorId !== undefined
      ? query.where(eq(courses.instructorId, opts.instructorId)).get()
      : query.get();

  return row?.total ?? 0;
}

/**
 * Total number of enrollments across courses.
 *
 * - When `instructorId` is provided, counts only enrollments in courses owned
 *   by that instructor.
 * - When `instructorId` is omitted, counts all enrollments on the platform.
 *
 * Returns 0 when there are no matching enrollments.
 */
export function getTotalEnrollments(opts: AnalyticsScope = {}): number {
  const query = db
    .select({
      total: sql<number>`COUNT(*)`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id));

  const row =
    opts.instructorId !== undefined
      ? query.where(eq(courses.instructorId, opts.instructorId)).get()
      : query.get();

  return row?.total ?? 0;
}

/**
 * Course-weighted average completion rate, returned as a fraction in [0, 1].
 *
 * Definition (locked in Phase 2):
 *   For each course in scope, completion_rate = completed_enrollments / total_enrollments.
 *   Then average those per-course rates across the courses, treating every
 *   course equally regardless of enrollment volume.
 *
 * Edge cases:
 *   - Courses with zero enrollments are EXCLUDED from the average (they have
 *     no defined completion rate; including them as 0 would unfairly punish
 *     instructors who just launched a new course).
 *   - If the instructor has no courses with any enrollments at all, return 0.
 *   - "Completed" is determined by `enrollments.completedAt IS NOT NULL`.
 *
 * @param opts.instructorId  Scope to a single instructor's courses; omit for platform-wide.
 * @param opts.dateRange     Reserved for a future phase; currently ignored.
 */
export function getAverageCompletionRate(opts: AnalyticsScope = {}): number {
  const query = db
    .select({
      totalEnrollments: sql<number>`COUNT(*)`,
      completedEnrollments: sql<number>`COALESCE(SUM(CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .groupBy(enrollments.courseId);

  const rows =
    opts.instructorId !== undefined
      ? query.where(eq(courses.instructorId, opts.instructorId)).all()
      : query.all();

  if (rows.length === 0) return 0;

  const totalRate = rows.reduce(
    (sum, row) => sum + row.completedEnrollments / row.totalEnrollments,
    0
  );

  return totalRate / rows.length;
}

/**
 * Per-attempt quiz pass rate, returned as a fraction in [0, 1].
 *
 * Definition (locked in Phase 2):
 *   passed_attempts / total_attempts across every quiz attempt on every quiz
 *   that belongs to a lesson in a course in scope. A student who failed twice
 *   then passed counts as 1 pass / 3 attempts.
 *
 * Returns 0 when there are zero attempts.
 */
export function getAverageQuizPassRate(opts: AnalyticsScope = {}): number {
  const query = db
    .select({
      total: sql<number>`COUNT(*)`,
      passed: sql<number>`COALESCE(SUM(CASE WHEN ${quizAttempts.passed} = 1 THEN 1 ELSE 0 END), 0)`,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id));

  const row =
    opts.instructorId !== undefined
      ? query.where(eq(courses.instructorId, opts.instructorId)).get()
      : query.get();

  if (!row || row.total === 0) return 0;
  return row.passed / row.total;
}

/**
 * Average course rating across reviews, returned as a number in [1, 5].
 *
 * This is review-weighted, not course-weighted: a course with 100 reviews
 * influences the average 100x more than a course with 1 review. This matches
 * what students see on a course card and makes the dashboard number consistent
 * with the public-facing rating.
 *
 * Returns 0 when there are zero reviews in scope.
 */
export function getAverageRating(opts: AnalyticsScope = {}): number {
  const query = db
    .select({
      avgRating: sql<number | null>`AVG(${courseReviews.rating})`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(courseReviews)
    .innerJoin(courses, eq(courseReviews.courseId, courses.id));

  const row =
    opts.instructorId !== undefined
      ? query.where(eq(courses.instructorId, opts.instructorId)).get()
      : query.get();

  if (!row || row.reviewCount === 0) return 0;
  return row.avgRating ?? 0;
}

/**
 * Build a continuous list of "YYYY-MM" buckets from the earliest activity
 * date through the most recent activity date (inclusive). Months with no
 * activity are included as zero. If `firstIso` is null, returns [].
 *
 * Lives in this file (not utils) because it's analytics-specific and the
 * "fill in zero buckets" rule is a Phase 2 design decision, not a general
 * date utility.
 */
function buildMonthBuckets(
  firstIso: string | null,
  lastIso: string | null
): string[] {
  if (!firstIso || !lastIso) return [];

  const start = new Date(firstIso);
  const end = new Date(lastIso);

  const out: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)
  );
  const stop = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)
  );

  while (cursor.getTime() <= stop.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${year}-${month}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Merge sparse rows returned from a SQL `GROUP BY month` into the full
 * continuous bucket list, defaulting missing months to 0.
 */
function fillBuckets(
  allBuckets: string[],
  rows: Array<{ bucket: string; value: number }>
): TimeSeriesPoint[] {
  const map = new Map(rows.map((r) => [r.bucket, r.value]));
  return allBuckets.map((bucket) => ({
    bucket,
    value: map.get(bucket) ?? 0,
  }));
}

/**
 * Monthly revenue time series, in cents.
 *
 * One point per calendar month from the first purchase to the most recent
 * purchase in scope. Months with zero revenue appear as zero. Returns []
 * when there are no purchases in scope.
 */
export function getRevenueTimeSeries(
  opts: AnalyticsScope = {}
): TimeSeriesPoint[] {
  const bucketExpr = sql<string>`strftime('%Y-%m', ${purchases.createdAt})`;

  const baseQuery = db
    .select({
      bucket: bucketExpr,
      value: sql<number>`COALESCE(SUM(${purchases.pricePaid}), 0)`,
    })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id));

  const rows =
    opts.instructorId !== undefined
      ? baseQuery
          .where(eq(courses.instructorId, opts.instructorId))
          .groupBy(bucketExpr)
          .orderBy(bucketExpr)
          .all()
      : baseQuery.groupBy(bucketExpr).orderBy(bucketExpr).all();

  if (rows.length === 0) return [];

  const allBuckets = buildMonthBuckets(
    rows[0].bucket + "-01",
    rows[rows.length - 1].bucket + "-01"
  );
  return fillBuckets(allBuckets, rows);
}

/** One row of the cross-course overview table. All numbers are pre-aggregated. */
export type CourseSummaryRow = {
  courseId: number;
  title: string;
  slug: string;
  enrollments: number;
  /** Fraction in [0, 1]. 0 means "no enrollments at all" — UI should render "—". */
  completionRate: number;
  /** Mean review rating in [1, 5]. 0 means "no reviews yet" — UI should render "—". */
  averageRating: number;
  /** Sum of `purchases.pricePaid` in cents. */
  revenueCents: number;
};

/**
 * One row per course in scope, carrying every metric the overview table needs.
 *
 * Strategy: rather than joining `courses → enrollments → reviews → purchases`
 * in a single query (which would multiply rows and inflate SUMs), we run one
 * small aggregate query per metric and stitch the results together in JS by
 * courseId. Each query is keyed on `courses.id`, so a course with no
 * enrollments / reviews / purchases still appears in the output with zeros —
 * the "zero-data courses must not be omitted" requirement from the plan.
 *
 * Scoping mirrors the rest of the service: `instructorId` filters to one
 * instructor's courses, omitting it returns the full platform.
 *
 * @param opts.instructorId  Scope to a single instructor's courses; omit for platform-wide.
 * @param opts.dateRange     Reserved for a future phase; currently ignored.
 */
export function getPerCourseSummary(
  opts: AnalyticsScope = {}
): CourseSummaryRow[] {
  // 1. Anchor query: every course in scope, in stable insertion order. This
  //    is the source of truth for "which rows exist" — every other query is
  //    a left-merge onto this list.
  const courseRowsQuery = db
    .select({
      courseId: courses.id,
      title: courses.title,
      slug: courses.slug,
    })
    .from(courses);

  const courseRows =
    opts.instructorId !== undefined
      ? courseRowsQuery
          .where(eq(courses.instructorId, opts.instructorId))
          .orderBy(courses.id)
          .all()
      : courseRowsQuery.orderBy(courses.id).all();

  if (courseRows.length === 0) return [];

  // 2. Enrollments + completions per course. Grouped on enrollments.courseId
  //    so courses with zero enrollments don't appear here at all — they'll
  //    fall through to the default of 0 below.
  const enrollmentQuery = db
    .select({
      courseId: enrollments.courseId,
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`COALESCE(SUM(CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .groupBy(enrollments.courseId);

  const enrollmentRows =
    opts.instructorId !== undefined
      ? enrollmentQuery.where(eq(courses.instructorId, opts.instructorId)).all()
      : enrollmentQuery.all();

  const enrollmentByCourse = new Map(
    enrollmentRows.map((r) => [r.courseId, r])
  );

  // 3. Average rating per course (review-weighted within a single course is
  //    the same as the simple mean, since each course's reviews are its own).
  const reviewQuery = db
    .select({
      courseId: courseReviews.courseId,
      avgRating: sql<number | null>`AVG(${courseReviews.rating})`,
    })
    .from(courseReviews)
    .innerJoin(courses, eq(courseReviews.courseId, courses.id))
    .groupBy(courseReviews.courseId);

  const reviewRows =
    opts.instructorId !== undefined
      ? reviewQuery.where(eq(courses.instructorId, opts.instructorId)).all()
      : reviewQuery.all();

  const ratingByCourse = new Map(
    reviewRows.map((r) => [r.courseId, r.avgRating ?? 0])
  );

  // 4. Revenue per course.
  const revenueQuery = db
    .select({
      courseId: purchases.courseId,
      revenue: sql<number>`COALESCE(SUM(${purchases.pricePaid}), 0)`,
    })
    .from(purchases)
    .innerJoin(courses, eq(purchases.courseId, courses.id))
    .groupBy(purchases.courseId);

  const revenueRows =
    opts.instructorId !== undefined
      ? revenueQuery.where(eq(courses.instructorId, opts.instructorId)).all()
      : revenueQuery.all();

  const revenueByCourse = new Map(
    revenueRows.map((r) => [r.courseId, r.revenue])
  );

  // 5. Stitch. The anchor list drives the output so zero-data courses still
  //    appear, with zeros for any metric that has no data.
  return courseRows.map((row) => {
    const enrollment = enrollmentByCourse.get(row.courseId);
    const totalEnrollments = enrollment?.total ?? 0;
    const completedEnrollments = enrollment?.completed ?? 0;
    const completionRate =
      totalEnrollments > 0 ? completedEnrollments / totalEnrollments : 0;

    return {
      courseId: row.courseId,
      title: row.title,
      slug: row.slug,
      enrollments: totalEnrollments,
      completionRate,
      averageRating: ratingByCourse.get(row.courseId) ?? 0,
      revenueCents: revenueByCourse.get(row.courseId) ?? 0,
    };
  });
}

/**
 * Monthly enrollment time series — count of new enrollments per month.
 *
 * Same bucketing rules as `getRevenueTimeSeries`: one point per calendar
 * month from earliest to latest enrollment in scope, zero-activity months
 * included. Returns [] when there are no enrollments in scope.
 */
export function getEnrollmentTimeSeries(
  opts: AnalyticsScope = {}
): TimeSeriesPoint[] {
  const bucketExpr = sql<string>`strftime('%Y-%m', ${enrollments.enrolledAt})`;

  const baseQuery = db
    .select({
      bucket: bucketExpr,
      value: sql<number>`COUNT(*)`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id));

  const rows =
    opts.instructorId !== undefined
      ? baseQuery
          .where(eq(courses.instructorId, opts.instructorId))
          .groupBy(bucketExpr)
          .orderBy(bucketExpr)
          .all()
      : baseQuery.groupBy(bucketExpr).orderBy(bucketExpr).all();

  if (rows.length === 0) return [];

  const allBuckets = buildMonthBuckets(
    rows[0].bucket + "-01",
    rows[rows.length - 1].bucket + "-01"
  );
  return fillBuckets(allBuckets, rows);
}
