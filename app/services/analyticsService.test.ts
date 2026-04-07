import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import {
  getTotalRevenue,
  getTotalEnrollments,
  getAverageCompletionRate,
  getAverageQuizPassRate,
  getAverageRating,
  getRevenueTimeSeries,
  getEnrollmentTimeSeries,
  getPerCourseSummary,
  getCourseDropOff,
  getCourseVideoWatchThrough,
} from "./analyticsService";

function createSecondInstructor(db: typeof testDb) {
  return db
    .insert(schema.users)
    .values({
      name: "Other Instructor",
      email: "other-instructor@example.com",
      role: schema.UserRole.Instructor,
    })
    .returning()
    .get();
}

function createCourse(
  db: typeof testDb,
  opts: {
    instructorId: number;
    categoryId: number;
    title: string;
    slug: string;
  }
) {
  return db
    .insert(schema.courses)
    .values({
      title: opts.title,
      slug: opts.slug,
      description: "test course",
      instructorId: opts.instructorId,
      categoryId: opts.categoryId,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();
}

function createStudent(db: typeof testDb, email: string) {
  return db
    .insert(schema.users)
    .values({
      name: email,
      email,
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

function recordPurchase(
  db: typeof testDb,
  opts: { userId: number; courseId: number; pricePaid: number }
) {
  return db.insert(schema.purchases).values(opts).returning().get();
}

function recordEnrollment(
  db: typeof testDb,
  opts: { userId: number; courseId: number; completedAt?: string | null }
) {
  return db
    .insert(schema.enrollments)
    .values({
      userId: opts.userId,
      courseId: opts.courseId,
      completedAt: opts.completedAt ?? null,
    })
    .returning()
    .get();
}

function recordPurchaseAt(
  db: typeof testDb,
  opts: {
    userId: number;
    courseId: number;
    pricePaid: number;
    createdAt: string;
  }
) {
  return db.insert(schema.purchases).values(opts).returning().get();
}

function recordEnrollmentAt(
  db: typeof testDb,
  opts: { userId: number; courseId: number; enrolledAt: string }
) {
  return db.insert(schema.enrollments).values(opts).returning().get();
}

function recordReview(
  db: typeof testDb,
  opts: { userId: number; courseId: number; rating: number }
) {
  return db.insert(schema.courseReviews).values(opts).returning().get();
}

function createQuizForCourse(
  db: typeof testDb,
  opts: { courseId: number; title: string }
) {
  const mod = db
    .insert(schema.modules)
    .values({
      courseId: opts.courseId,
      title: `${opts.title} module`,
      position: 1,
    })
    .returning()
    .get();
  const lesson = db
    .insert(schema.lessons)
    .values({
      moduleId: mod.id,
      title: `${opts.title} lesson`,
      position: 1,
    })
    .returning()
    .get();
  const quiz = db
    .insert(schema.quizzes)
    .values({
      lessonId: lesson.id,
      title: opts.title,
      passingScore: 0.7,
    })
    .returning()
    .get();
  return quiz;
}

function recordAttempt(
  db: typeof testDb,
  opts: { userId: number; quizId: number; passed: boolean; score: number }
) {
  return db
    .insert(schema.quizAttempts)
    .values({
      userId: opts.userId,
      quizId: opts.quizId,
      passed: opts.passed,
      score: opts.score,
    })
    .returning()
    .get();
}

function createModule(
  db: typeof testDb,
  opts: { courseId: number; title: string; position: number }
) {
  return db.insert(schema.modules).values(opts).returning().get();
}

function createLesson(
  db: typeof testDb,
  opts: {
    moduleId: number;
    title: string;
    position: number;
    durationMinutes?: number | null;
  }
) {
  return db
    .insert(schema.lessons)
    .values({
      moduleId: opts.moduleId,
      title: opts.title,
      position: opts.position,
      durationMinutes: opts.durationMinutes ?? null,
    })
    .returning()
    .get();
}

function recordLessonProgress(
  db: typeof testDb,
  opts: {
    userId: number;
    lessonId: number;
    status: schema.LessonProgressStatus;
  }
) {
  return db
    .insert(schema.lessonProgress)
    .values({
      userId: opts.userId,
      lessonId: opts.lessonId,
      status: opts.status,
      completedAt:
        opts.status === schema.LessonProgressStatus.Completed
          ? new Date().toISOString()
          : null,
    })
    .returning()
    .get();
}

function recordWatchEvent(
  db: typeof testDb,
  opts: { userId: number; lessonId: number; positionSeconds: number }
) {
  return db
    .insert(schema.videoWatchEvents)
    .values({
      userId: opts.userId,
      lessonId: opts.lessonId,
      eventType: "progress",
      positionSeconds: opts.positionSeconds,
    })
    .returning()
    .get();
}

/**
 * Build a course with two modules and four lessons (2 per module) in
 * deterministic order. Lessons receive a `durationMinutes` so the watch-through
 * tests have an honest denominator; individual tests override duration where
 * the absence of a duration is the thing under test.
 */
function seedCourseWithLessons(
  db: typeof testDb,
  opts: { courseId: number; durationMinutes?: number | null }
) {
  const moduleA = createModule(db, {
    courseId: opts.courseId,
    title: "Module A",
    position: 1,
  });
  const moduleB = createModule(db, {
    courseId: opts.courseId,
    title: "Module B",
    position: 2,
  });
  const duration = opts.durationMinutes === undefined ? 10 : opts.durationMinutes;
  const lessonA1 = createLesson(db, {
    moduleId: moduleA.id,
    title: "A1",
    position: 1,
    durationMinutes: duration,
  });
  const lessonA2 = createLesson(db, {
    moduleId: moduleA.id,
    title: "A2",
    position: 2,
    durationMinutes: duration,
  });
  const lessonB1 = createLesson(db, {
    moduleId: moduleB.id,
    title: "B1",
    position: 1,
    durationMinutes: duration,
  });
  const lessonB2 = createLesson(db, {
    moduleId: moduleB.id,
    title: "B2",
    position: 2,
    durationMinutes: duration,
  });
  return { moduleA, moduleB, lessonA1, lessonA2, lessonB1, lessonB2 };
}

describe("analyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("getTotalRevenue", () => {
    it("returns 0 for an instructor with zero courses", () => {
      const lonelyInstructor = createSecondInstructor(testDb);

      const total = getTotalRevenue({ instructorId: lonelyInstructor.id });

      expect(total).toBe(0);
    });

    it("returns 0 for an instructor whose courses have no purchases", () => {
      // base.course already exists and is owned by base.instructor.
      const total = getTotalRevenue({ instructorId: base.instructor.id });

      expect(total).toBe(0);
    });

    it("sums purchases across a single course", () => {
      const studentA = createStudent(testDb, "a@example.com");
      const studentB = createStudent(testDb, "b@example.com");

      recordPurchase(testDb, {
        userId: studentA.id,
        courseId: base.course.id,
        pricePaid: 4900,
      });
      recordPurchase(testDb, {
        userId: studentB.id,
        courseId: base.course.id,
        pricePaid: 2500,
      });

      const total = getTotalRevenue({ instructorId: base.instructor.id });

      expect(total).toBe(7400);
    });

    it("sums purchases across multiple courses owned by the same instructor", () => {
      const secondCourse = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second Course",
        slug: "second-course",
      });
      const student = createStudent(testDb, "buyer@example.com");

      recordPurchase(testDb, {
        userId: student.id,
        courseId: base.course.id,
        pricePaid: 1000,
      });
      recordPurchase(testDb, {
        userId: student.id,
        courseId: secondCourse.id,
        pricePaid: 3000,
      });

      const total = getTotalRevenue({ instructorId: base.instructor.id });

      expect(total).toBe(4000);
    });

    it("excludes purchases from courses owned by other instructors", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other Course",
        slug: "other-course",
      });
      const student = createStudent(testDb, "buyer@example.com");

      recordPurchase(testDb, {
        userId: student.id,
        courseId: base.course.id,
        pricePaid: 1500,
      });
      recordPurchase(testDb, {
        userId: student.id,
        courseId: otherCourse.id,
        pricePaid: 9999,
      });

      const total = getTotalRevenue({ instructorId: base.instructor.id });

      expect(total).toBe(1500);
    });

    it("returns the platform-wide total when instructorId is omitted", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other Course",
        slug: "other-course",
      });
      const student = createStudent(testDb, "buyer@example.com");

      recordPurchase(testDb, {
        userId: student.id,
        courseId: base.course.id,
        pricePaid: 1500,
      });
      recordPurchase(testDb, {
        userId: student.id,
        courseId: otherCourse.id,
        pricePaid: 9999,
      });

      const total = getTotalRevenue();

      expect(total).toBe(11499);
    });
  });

  describe("getTotalEnrollments", () => {
    it("returns 0 for an instructor with zero courses", () => {
      const lonelyInstructor = createSecondInstructor(testDb);

      const total = getTotalEnrollments({
        instructorId: lonelyInstructor.id,
      });

      expect(total).toBe(0);
    });

    it("returns 0 for an instructor whose courses have no enrollments", () => {
      const total = getTotalEnrollments({ instructorId: base.instructor.id });

      expect(total).toBe(0);
    });

    it("counts enrollments across a single course", () => {
      const studentA = createStudent(testDb, "a@example.com");
      const studentB = createStudent(testDb, "b@example.com");

      recordEnrollment(testDb, {
        userId: studentA.id,
        courseId: base.course.id,
      });
      recordEnrollment(testDb, {
        userId: studentB.id,
        courseId: base.course.id,
      });

      const total = getTotalEnrollments({ instructorId: base.instructor.id });

      expect(total).toBe(2);
    });

    it("counts enrollments across multiple courses owned by the same instructor", () => {
      const secondCourse = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second Course",
        slug: "second-course",
      });
      const studentA = createStudent(testDb, "a@example.com");
      const studentB = createStudent(testDb, "b@example.com");

      recordEnrollment(testDb, {
        userId: studentA.id,
        courseId: base.course.id,
      });
      recordEnrollment(testDb, {
        userId: studentB.id,
        courseId: secondCourse.id,
      });
      recordEnrollment(testDb, {
        userId: studentA.id,
        courseId: secondCourse.id,
      });

      const total = getTotalEnrollments({ instructorId: base.instructor.id });

      expect(total).toBe(3);
    });

    it("excludes enrollments in courses owned by other instructors", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other Course",
        slug: "other-course",
      });
      const student = createStudent(testDb, "student@example.com");

      recordEnrollment(testDb, {
        userId: student.id,
        courseId: base.course.id,
      });
      recordEnrollment(testDb, {
        userId: student.id,
        courseId: otherCourse.id,
      });

      const total = getTotalEnrollments({ instructorId: base.instructor.id });

      expect(total).toBe(1);
    });

    it("returns the platform-wide total when instructorId is omitted", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other Course",
        slug: "other-course",
      });
      const student = createStudent(testDb, "student@example.com");

      recordEnrollment(testDb, {
        userId: student.id,
        courseId: base.course.id,
      });
      recordEnrollment(testDb, {
        userId: student.id,
        courseId: otherCourse.id,
      });

      const total = getTotalEnrollments();

      expect(total).toBe(2);
    });
  });

  describe("getAverageCompletionRate", () => {
    it("returns 0 for an instructor with no enrollments", () => {
      const rate = getAverageCompletionRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBe(0);
    });

    it("computes a course-weighted average across courses", () => {
      // Course A: 2 enrollments, 1 completed → 50%
      // Course B: 2 enrollments, 2 completed → 100%
      // Course-weighted average: (0.5 + 1.0) / 2 = 0.75
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        completedAt: "2026-01-01T00:00:00Z",
      });
      recordEnrollment(testDb, { userId: s2.id, courseId: base.course.id });
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: courseB.id,
        completedAt: "2026-01-02T00:00:00Z",
      });
      recordEnrollment(testDb, {
        userId: s2.id,
        courseId: courseB.id,
        completedAt: "2026-01-03T00:00:00Z",
      });

      const rate = getAverageCompletionRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBeCloseTo(0.75, 5);
    });

    it("excludes zero-enrollment courses from the average", () => {
      // Course A: 1 enrollment, 1 completed → 100%
      // Course B: 0 enrollments → excluded
      // Average should be 1.0, not 0.5.
      createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Empty",
        slug: "empty",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        completedAt: "2026-01-01T00:00:00Z",
      });

      const rate = getAverageCompletionRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBeCloseTo(1.0, 5);
    });

    it("excludes other instructors' courses when scoped", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      // base.course: 1 enrollment, not completed → 0%
      recordEnrollment(testDb, { userId: s1.id, courseId: base.course.id });
      // other course: 1 enrollment, completed → 100%
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: otherCourse.id,
        completedAt: "2026-01-01T00:00:00Z",
      });

      const rate = getAverageCompletionRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBe(0);
    });
  });

  describe("getAverageQuizPassRate", () => {
    it("returns 0 when there are no attempts", () => {
      const rate = getAverageQuizPassRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBe(0);
    });

    it("computes passed_attempts / total_attempts across all quizzes", () => {
      const quizA = createQuizForCourse(testDb, {
        courseId: base.course.id,
        title: "Quiz A",
      });
      const quizB = createQuizForCourse(testDb, {
        courseId: base.course.id,
        title: "Quiz B",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      // 4 attempts: 2 passed → 0.5
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: quizA.id,
        passed: true,
        score: 0.9,
      });
      recordAttempt(testDb, {
        userId: s2.id,
        quizId: quizA.id,
        passed: false,
        score: 0.4,
      });
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: quizB.id,
        passed: true,
        score: 0.8,
      });
      recordAttempt(testDb, {
        userId: s2.id,
        quizId: quizB.id,
        passed: false,
        score: 0.5,
      });

      const rate = getAverageQuizPassRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBeCloseTo(0.5, 5);
    });

    it("excludes attempts on quizzes in other instructors' courses", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const myQuiz = createQuizForCourse(testDb, {
        courseId: base.course.id,
        title: "Mine",
      });
      const otherQuiz = createQuizForCourse(testDb, {
        courseId: otherCourse.id,
        title: "Theirs",
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordAttempt(testDb, {
        userId: s1.id,
        quizId: myQuiz.id,
        passed: true,
        score: 1,
      });
      // Three failed attempts on the OTHER instructor's quiz — must not pull
      // my pass rate down.
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: otherQuiz.id,
        passed: false,
        score: 0,
      });
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: otherQuiz.id,
        passed: false,
        score: 0,
      });
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: otherQuiz.id,
        passed: false,
        score: 0,
      });

      const rate = getAverageQuizPassRate({
        instructorId: base.instructor.id,
      });
      expect(rate).toBe(1);
    });
  });

  describe("getAverageRating", () => {
    it("returns 0 when there are no reviews", () => {
      const avg = getAverageRating({ instructorId: base.instructor.id });
      expect(avg).toBe(0);
    });

    it("returns the review-weighted average across all reviews", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "B",
        slug: "b",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");
      const s3 = createStudent(testDb, "s3@example.com");

      recordReview(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        rating: 5,
      });
      recordReview(testDb, {
        userId: s2.id,
        courseId: base.course.id,
        rating: 5,
      });
      recordReview(testDb, { userId: s3.id, courseId: courseB.id, rating: 2 });

      // (5 + 5 + 2) / 3 = 4
      const avg = getAverageRating({ instructorId: base.instructor.id });
      expect(avg).toBeCloseTo(4, 5);
    });

    it("excludes reviews on other instructors' courses", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      recordReview(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        rating: 4,
      });
      recordReview(testDb, {
        userId: s2.id,
        courseId: otherCourse.id,
        rating: 1,
      });

      const avg = getAverageRating({ instructorId: base.instructor.id });
      expect(avg).toBe(4);
    });
  });

  describe("getRevenueTimeSeries", () => {
    it("returns an empty array when there are no purchases in scope", () => {
      const series = getRevenueTimeSeries({
        instructorId: base.instructor.id,
      });
      expect(series).toEqual([]);
    });

    it("buckets purchases by month and includes zero-activity months", () => {
      const s1 = createStudent(testDb, "s1@example.com");

      recordPurchaseAt(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2026-01-15T00:00:00Z",
      });
      // Skip February entirely — should still appear as a zero bucket.
      recordPurchaseAt(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 2500,
        createdAt: "2026-03-01T00:00:00Z",
      });
      recordPurchaseAt(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 500,
        createdAt: "2026-03-20T00:00:00Z",
      });

      const series = getRevenueTimeSeries({
        instructorId: base.instructor.id,
      });

      expect(series).toEqual([
        { bucket: "2026-01", value: 1000 },
        { bucket: "2026-02", value: 0 },
        { bucket: "2026-03", value: 3000 },
      ]);
    });

    it("excludes purchases from other instructors when scoped", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordPurchaseAt(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 1000,
        createdAt: "2026-01-15T00:00:00Z",
      });
      recordPurchaseAt(testDb, {
        userId: s1.id,
        courseId: otherCourse.id,
        pricePaid: 9999,
        createdAt: "2026-01-20T00:00:00Z",
      });

      const series = getRevenueTimeSeries({
        instructorId: base.instructor.id,
      });
      expect(series).toEqual([{ bucket: "2026-01", value: 1000 }]);
    });
  });

  describe("getPerCourseSummary", () => {
    it("returns an empty array when the instructor owns no courses", () => {
      const lonelyInstructor = createSecondInstructor(testDb);

      const rows = getPerCourseSummary({
        instructorId: lonelyInstructor.id,
      });

      expect(rows).toEqual([]);
    });

    it("includes a course with zero data as a row of zeros", () => {
      // base.course exists but has no enrollments, reviews, or purchases.
      const rows = getPerCourseSummary({ instructorId: base.instructor.id });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        courseId: base.course.id,
        title: base.course.title,
        slug: base.course.slug,
        enrollments: 0,
        completionRate: 0,
        averageRating: 0,
        revenueCents: 0,
      });
    });

    it("aggregates enrollments, completions, ratings, and revenue per course", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second Course",
        slug: "second-course",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");
      const s3 = createStudent(testDb, "s3@example.com");

      // base.course: 2 enrollments (1 completed), 2 reviews avg 4.5, $40 revenue
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        completedAt: "2026-01-01T00:00:00Z",
      });
      recordEnrollment(testDb, { userId: s2.id, courseId: base.course.id });
      recordReview(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        rating: 5,
      });
      recordReview(testDb, {
        userId: s2.id,
        courseId: base.course.id,
        rating: 4,
      });
      recordPurchase(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 1500,
      });
      recordPurchase(testDb, {
        userId: s2.id,
        courseId: base.course.id,
        pricePaid: 2500,
      });

      // courseB: 1 enrollment, no completions, 1 review of 3, $99 revenue
      recordEnrollment(testDb, { userId: s3.id, courseId: courseB.id });
      recordReview(testDb, {
        userId: s3.id,
        courseId: courseB.id,
        rating: 3,
      });
      recordPurchase(testDb, {
        userId: s3.id,
        courseId: courseB.id,
        pricePaid: 9900,
      });

      const rows = getPerCourseSummary({ instructorId: base.instructor.id });

      expect(rows).toHaveLength(2);
      const byId = new Map(rows.map((r) => [r.courseId, r]));

      const a = byId.get(base.course.id)!;
      expect(a.enrollments).toBe(2);
      expect(a.completionRate).toBeCloseTo(0.5, 5);
      expect(a.averageRating).toBeCloseTo(4.5, 5);
      expect(a.revenueCents).toBe(4000);

      const b = byId.get(courseB.id)!;
      expect(b.enrollments).toBe(1);
      expect(b.completionRate).toBe(0);
      expect(b.averageRating).toBe(3);
      expect(b.revenueCents).toBe(9900);
    });

    it("excludes courses owned by other instructors when scoped", () => {
      const otherInstructor = createSecondInstructor(testDb);
      const otherCourse = createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const s1 = createStudent(testDb, "s1@example.com");

      // Add data to the OTHER instructor's course — must not appear at all.
      recordEnrollment(testDb, { userId: s1.id, courseId: otherCourse.id });
      recordPurchase(testDb, {
        userId: s1.id,
        courseId: otherCourse.id,
        pricePaid: 5000,
      });

      const rows = getPerCourseSummary({ instructorId: base.instructor.id });

      expect(rows).toHaveLength(1);
      expect(rows[0].courseId).toBe(base.course.id);
      expect(rows[0].revenueCents).toBe(0);
    });

    it("returns courses for every instructor when unscoped (admin view)", () => {
      const otherInstructor = createSecondInstructor(testDb);
      createCourse(testDb, {
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });

      const rows = getPerCourseSummary();

      expect(rows).toHaveLength(2);
      const titles = rows.map((r) => r.title).sort();
      expect(titles).toEqual(["Other", "Test Course"]);
    });
  });

  describe("getEnrollmentTimeSeries", () => {
    it("returns an empty array when there are no enrollments in scope", () => {
      const series = getEnrollmentTimeSeries({
        instructorId: base.instructor.id,
      });
      expect(series).toEqual([]);
    });

    it("buckets enrollments by month and fills in zero gaps", () => {
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");
      const s3 = createStudent(testDb, "s3@example.com");

      recordEnrollmentAt(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        enrolledAt: "2026-01-05T00:00:00Z",
      });
      recordEnrollmentAt(testDb, {
        userId: s2.id,
        courseId: base.course.id,
        enrolledAt: "2026-01-25T00:00:00Z",
      });
      // No February enrollments — should appear as zero.
      recordEnrollmentAt(testDb, {
        userId: s3.id,
        courseId: base.course.id,
        enrolledAt: "2026-03-10T00:00:00Z",
      });

      const series = getEnrollmentTimeSeries({
        instructorId: base.instructor.id,
      });

      expect(series).toEqual([
        { bucket: "2026-01", value: 2 },
        { bucket: "2026-02", value: 0 },
        { bucket: "2026-03", value: 1 },
      ]);
    });
  });

  describe("courseId scoping on KPI functions", () => {
    it("getTotalRevenue restricts to a single course when courseId is passed", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordPurchase(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        pricePaid: 1000,
      });
      recordPurchase(testDb, {
        userId: s1.id,
        courseId: courseB.id,
        pricePaid: 9999,
      });

      expect(getTotalRevenue({ courseId: base.course.id })).toBe(1000);
      expect(getTotalRevenue({ courseId: courseB.id })).toBe(9999);
    });

    it("getTotalEnrollments restricts to a single course when courseId is passed", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      recordEnrollment(testDb, { userId: s1.id, courseId: base.course.id });
      recordEnrollment(testDb, { userId: s2.id, courseId: base.course.id });
      recordEnrollment(testDb, { userId: s1.id, courseId: courseB.id });

      expect(getTotalEnrollments({ courseId: base.course.id })).toBe(2);
      expect(getTotalEnrollments({ courseId: courseB.id })).toBe(1);
    });

    it("getAverageCompletionRate scopes to a single course", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      // base.course: 2 enrollments, 1 completed → 50%
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        completedAt: "2026-01-01T00:00:00Z",
      });
      recordEnrollment(testDb, { userId: s2.id, courseId: base.course.id });
      // courseB: 1 enrollment, 1 completed → 100%
      recordEnrollment(testDb, {
        userId: s1.id,
        courseId: courseB.id,
        completedAt: "2026-01-01T00:00:00Z",
      });

      expect(getAverageCompletionRate({ courseId: base.course.id })).toBeCloseTo(
        0.5,
        5
      );
      expect(getAverageCompletionRate({ courseId: courseB.id })).toBeCloseTo(
        1,
        5
      );
    });

    it("getAverageRating scopes to a single course", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      recordReview(testDb, {
        userId: s1.id,
        courseId: base.course.id,
        rating: 5,
      });
      recordReview(testDb, {
        userId: s2.id,
        courseId: courseB.id,
        rating: 1,
      });

      expect(getAverageRating({ courseId: base.course.id })).toBe(5);
      expect(getAverageRating({ courseId: courseB.id })).toBe(1);
    });

    it("getAverageQuizPassRate scopes to a single course", () => {
      const courseB = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Second",
        slug: "second",
      });
      const quizA = createQuizForCourse(testDb, {
        courseId: base.course.id,
        title: "Quiz A",
      });
      const quizB = createQuizForCourse(testDb, {
        courseId: courseB.id,
        title: "Quiz B",
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordAttempt(testDb, {
        userId: s1.id,
        quizId: quizA.id,
        passed: true,
        score: 1,
      });
      recordAttempt(testDb, {
        userId: s1.id,
        quizId: quizB.id,
        passed: false,
        score: 0,
      });

      expect(getAverageQuizPassRate({ courseId: base.course.id })).toBe(1);
      expect(getAverageQuizPassRate({ courseId: courseB.id })).toBe(0);
    });
  });

  describe("getCourseDropOff", () => {
    it("returns an empty array when the course has no lessons", () => {
      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows).toEqual([]);
    });

    it("returns lessons in module/lesson order with zero counts when nobody has progressed", () => {
      seedCourseWithLessons(testDb, { courseId: base.course.id });

      const rows = getCourseDropOff({ courseId: base.course.id });

      expect(rows).toHaveLength(4);
      expect(rows.map((r) => r.lessonTitle)).toEqual(["A1", "A2", "B1", "B2"]);
      expect(rows.every((r) => r.reachedCount === 0)).toBe(true);
    });

    it("counts a student who completed every lesson at every lesson", () => {
      const { lessonA1, lessonA2, lessonB1, lessonB2 } = seedCourseWithLessons(
        testDb,
        { courseId: base.course.id }
      );
      const s1 = createStudent(testDb, "s1@example.com");

      for (const lesson of [lessonA1, lessonA2, lessonB1, lessonB2]) {
        recordLessonProgress(testDb, {
          userId: s1.id,
          lessonId: lesson.id,
          status: schema.LessonProgressStatus.Completed,
        });
      }

      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows.map((r) => r.reachedCount)).toEqual([1, 1, 1, 1]);
    });

    it("treats skip-ahead progress as having reached the earlier lessons", () => {
      // Student only ever marks the LAST lesson as completed. Under the
      // "reached" definition they should still count at every prior lesson.
      const { lessonB2 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const skipper = createStudent(testDb, "skipper@example.com");

      recordLessonProgress(testDb, {
        userId: skipper.id,
        lessonId: lessonB2.id,
        status: schema.LessonProgressStatus.Completed,
      });

      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows.map((r) => r.reachedCount)).toEqual([1, 1, 1, 1]);
    });

    it("excludes in_progress and not_started rows from the reach count", () => {
      const { lessonA1, lessonA2 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      // s1 only "in progress" on lesson A1 → does NOT count as reached.
      recordLessonProgress(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        status: schema.LessonProgressStatus.InProgress,
      });
      // s2 completed lesson A2 → counts at A1 and A2 only.
      recordLessonProgress(testDb, {
        userId: s2.id,
        lessonId: lessonA2.id,
        status: schema.LessonProgressStatus.Completed,
      });

      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows.map((r) => r.reachedCount)).toEqual([1, 1, 0, 0]);
    });

    it("produces a monotonically non-increasing funnel across mixed progress", () => {
      // 4 students with progressively shallower completion depths.
      // Students who reach lessonB1: 2 (s1, s2)
      // Students who reach lessonA2: 3 (s1, s2, s3)
      // Students who reach lessonA1: 4 (all)
      // Students who reach lessonB2: 1 (s1)
      const { lessonA1, lessonA2, lessonB1, lessonB2 } = seedCourseWithLessons(
        testDb,
        { courseId: base.course.id }
      );
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");
      const s3 = createStudent(testDb, "s3@example.com");
      const s4 = createStudent(testDb, "s4@example.com");

      // s1 finished everything
      for (const lesson of [lessonA1, lessonA2, lessonB1, lessonB2]) {
        recordLessonProgress(testDb, {
          userId: s1.id,
          lessonId: lesson.id,
          status: schema.LessonProgressStatus.Completed,
        });
      }
      // s2 stopped after lessonB1
      for (const lesson of [lessonA1, lessonA2, lessonB1]) {
        recordLessonProgress(testDb, {
          userId: s2.id,
          lessonId: lesson.id,
          status: schema.LessonProgressStatus.Completed,
        });
      }
      // s3 stopped after lessonA2
      for (const lesson of [lessonA1, lessonA2]) {
        recordLessonProgress(testDb, {
          userId: s3.id,
          lessonId: lesson.id,
          status: schema.LessonProgressStatus.Completed,
        });
      }
      // s4 only finished lessonA1
      recordLessonProgress(testDb, {
        userId: s4.id,
        lessonId: lessonA1.id,
        status: schema.LessonProgressStatus.Completed,
      });

      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows.map((r) => r.reachedCount)).toEqual([4, 3, 2, 1]);
    });

    it("ignores progress on lessons in other courses", () => {
      const { lessonA1 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const otherCourse = createCourse(testDb, {
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        title: "Other",
        slug: "other",
      });
      const otherSeed = seedCourseWithLessons(testDb, {
        courseId: otherCourse.id,
      });
      const s1 = createStudent(testDb, "s1@example.com");

      // Progress on the OTHER course should not show up here.
      recordLessonProgress(testDb, {
        userId: s1.id,
        lessonId: otherSeed.lessonA1.id,
        status: schema.LessonProgressStatus.Completed,
      });
      // Progress on this course's first lesson should.
      recordLessonProgress(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        status: schema.LessonProgressStatus.Completed,
      });

      const rows = getCourseDropOff({ courseId: base.course.id });
      expect(rows.map((r) => r.reachedCount)).toEqual([1, 0, 0, 0]);
    });
  });

  describe("getCourseVideoWatchThrough", () => {
    it("returns an empty array when the course has no lessons", () => {
      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows).toEqual([]);
    });

    it("returns an empty array when no lessons have a duration", () => {
      seedCourseWithLessons(testDb, {
        courseId: base.course.id,
        durationMinutes: null,
      });
      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows).toEqual([]);
    });

    it("hides lessons that have a duration but no watch events", () => {
      seedCourseWithLessons(testDb, { courseId: base.course.id });
      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows).toEqual([]);
    });

    it("uses the highest position per (user, lesson) when computing the ratio", () => {
      // duration 10 minutes = 600 seconds. Single user, multiple events on
      // the same lesson — only the maximum should drive the ratio.
      const { lessonA1 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        positionSeconds: 100,
      });
      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        positionSeconds: 300,
      });
      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        positionSeconds: 50, // a stray seek-back must not lower the value
      });

      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows).toHaveLength(1);
      expect(rows[0].lessonId).toBe(lessonA1.id);
      expect(rows[0].averageWatchThrough).toBeCloseTo(300 / 600, 5);
    });

    it("clamps watch-through to 1 when the recorded position exceeds the duration", () => {
      const { lessonA1 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const s1 = createStudent(testDb, "s1@example.com");

      // 6000 seconds reported on a 10-minute (600s) lesson — must clamp to 1.
      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        positionSeconds: 6000,
      });

      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows[0].averageWatchThrough).toBe(1);
    });

    it("averages per-user clamped ratios across students", () => {
      const { lessonA1 } = seedCourseWithLessons(testDb, {
        courseId: base.course.id,
      });
      const s1 = createStudent(testDb, "s1@example.com");
      const s2 = createStudent(testDb, "s2@example.com");

      // s1: 600/600 = 1.0; s2: 150/600 = 0.25 → mean = 0.625
      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonA1.id,
        positionSeconds: 600,
      });
      recordWatchEvent(testDb, {
        userId: s2.id,
        lessonId: lessonA1.id,
        positionSeconds: 150,
      });

      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows[0].averageWatchThrough).toBeCloseTo(0.625, 5);
    });

    it("excludes lessons with no durationMinutes from the result", () => {
      const moduleA = createModule(testDb, {
        courseId: base.course.id,
        title: "Module A",
        position: 1,
      });
      const lessonWithDuration = createLesson(testDb, {
        moduleId: moduleA.id,
        title: "Has duration",
        position: 1,
        durationMinutes: 10,
      });
      const lessonWithoutDuration = createLesson(testDb, {
        moduleId: moduleA.id,
        title: "Missing duration",
        position: 2,
        durationMinutes: null,
      });
      const s1 = createStudent(testDb, "s1@example.com");

      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonWithDuration.id,
        positionSeconds: 600,
      });
      // Even with watch events, this lesson must be excluded.
      recordWatchEvent(testDb, {
        userId: s1.id,
        lessonId: lessonWithoutDuration.id,
        positionSeconds: 999,
      });

      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows).toHaveLength(1);
      expect(rows[0].lessonId).toBe(lessonWithDuration.id);
    });

    it("returns lessons ordered by module then lesson position", () => {
      const { lessonA1, lessonA2, lessonB1, lessonB2 } = seedCourseWithLessons(
        testDb,
        { courseId: base.course.id }
      );
      const s1 = createStudent(testDb, "s1@example.com");

      // Insert events in reverse order to make sure we're not relying on it.
      for (const lesson of [lessonB2, lessonB1, lessonA2, lessonA1]) {
        recordWatchEvent(testDb, {
          userId: s1.id,
          lessonId: lesson.id,
          positionSeconds: 300,
        });
      }

      const rows = getCourseVideoWatchThrough({ courseId: base.course.id });
      expect(rows.map((r) => r.lessonTitle)).toEqual(["A1", "A2", "B1", "B2"]);
    });
  });
});
