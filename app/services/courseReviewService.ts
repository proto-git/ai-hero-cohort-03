import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "~/db";
import { courseReviews } from "~/db/schema";

// ─── Course Review Service ───
// Handles star ratings for courses.
// Uses positional parameters (project convention).

export function getReviewByUserAndCourse(userId: number, courseId: number) {
  return db
    .select()
    .from(courseReviews)
    .where(
      and(
        eq(courseReviews.userId, userId),
        eq(courseReviews.courseId, courseId)
      )
    )
    .get();
}

export function getCourseAverageRating(courseId: number) {
  const result = db
    .select({
      averageRating: sql<number>`AVG(${courseReviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(courseReviews)
    .where(eq(courseReviews.courseId, courseId))
    .get();

  return {
    averageRating: result?.averageRating ?? 0,
    totalReviews: result?.totalReviews ?? 0,
  };
}

export function getAverageRatingsForCourses(courseIds: number[]) {
  if (courseIds.length === 0) return new Map<number, { averageRating: number; totalReviews: number }>();

  const results = db
    .select({
      courseId: courseReviews.courseId,
      averageRating: sql<number>`AVG(${courseReviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(courseReviews)
    .where(inArray(courseReviews.courseId, courseIds))
    .groupBy(courseReviews.courseId)
    .all();

  const map = new Map<number, { averageRating: number; totalReviews: number }>();
  for (const row of results) {
    map.set(row.courseId, {
      averageRating: row.averageRating,
      totalReviews: row.totalReviews,
    });
  }
  return map;
}

export function submitRating(userId: number, courseId: number, rating: number) {
  const existing = getReviewByUserAndCourse(userId, courseId);

  if (existing) {
    return db
      .update(courseReviews)
      .set({ rating, updatedAt: new Date().toISOString() })
      .where(eq(courseReviews.id, existing.id))
      .returning()
      .get();
  }

  return db
    .insert(courseReviews)
    .values({ userId, courseId, rating })
    .returning()
    .get();
}
