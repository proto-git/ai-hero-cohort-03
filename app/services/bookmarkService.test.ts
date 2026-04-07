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
  toggleBookmark,
  isLessonBookmarked,
  getBookmarkedLessonIds,
} from "./bookmarkService";

function createModuleAndLesson(
  db: typeof testDb,
  courseId: number,
  moduleTitle = "Module 1",
  lessonTitle = "Lesson 1"
) {
  const mod = db
    .insert(schema.modules)
    .values({ courseId, title: moduleTitle, position: 1 })
    .returning()
    .get();

  const lesson = db
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: lessonTitle, position: 1 })
    .returning()
    .get();

  return { mod, lesson };
}

describe("bookmarkService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("toggleBookmark", () => {
    it("creates a bookmark when none exists", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);

      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lesson.id,
      });

      expect(result.bookmarked).toBe(true);
    });

    it("removes a bookmark when one exists", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lesson.id,
      });

      expect(result.bookmarked).toBe(false);
    });

    it("toggles back on after removing", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);

      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      const result = toggleBookmark({
        userId: base.user.id,
        lessonId: lesson.id,
      });

      expect(result.bookmarked).toBe(true);
    });
  });

  describe("isLessonBookmarked", () => {
    it("returns false when not bookmarked", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);

      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(false);
    });

    it("returns true when bookmarked", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(true);
    });

    it("returns false after bookmark is toggled off", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson.id });

      expect(
        isLessonBookmarked({ userId: base.user.id, lessonId: lesson.id })
      ).toBe(false);
    });
  });

  describe("getBookmarkedLessonIds", () => {
    it("returns empty array when no bookmarks exist", () => {
      const result = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });

      expect(result).toEqual([]);
    });

    it("returns bookmarked lesson IDs for the course", () => {
      const { lesson: lesson1 } = createModuleAndLesson(
        testDb,
        base.course.id,
        "Module 1",
        "Lesson 1"
      );
      const lesson2 = testDb
        .insert(schema.lessons)
        .values({ moduleId: lesson1.moduleId, title: "Lesson 2", position: 2 })
        .returning()
        .get();

      toggleBookmark({ userId: base.user.id, lessonId: lesson1.id });
      toggleBookmark({ userId: base.user.id, lessonId: lesson2.id });

      const result = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });

      expect(result).toHaveLength(2);
      expect(result).toContain(lesson1.id);
      expect(result).toContain(lesson2.id);
    });

    it("does not return bookmarks from other courses", () => {
      const otherCourse = testDb
        .insert(schema.courses)
        .values({
          title: "Other Course",
          slug: "other-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const { lesson: thisLesson } = createModuleAndLesson(
        testDb,
        base.course.id,
        "This Module",
        "This Lesson"
      );
      const { lesson: otherLesson } = createModuleAndLesson(
        testDb,
        otherCourse.id,
        "Other Module",
        "Other Lesson"
      );

      toggleBookmark({ userId: base.user.id, lessonId: thisLesson.id });
      toggleBookmark({ userId: base.user.id, lessonId: otherLesson.id });

      const result = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });

      expect(result).toEqual([thisLesson.id]);
    });

    it("does not return bookmarks from other users", () => {
      const { lesson } = createModuleAndLesson(testDb, base.course.id);
      toggleBookmark({ userId: base.instructor.id, lessonId: lesson.id });

      const result = getBookmarkedLessonIds({
        userId: base.user.id,
        courseId: base.course.id,
      });

      expect(result).toEqual([]);
    });
  });
});
