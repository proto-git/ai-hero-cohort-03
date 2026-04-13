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

// Import after mock so the module picks up our test db
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./notificationService";

describe("notificationService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("createNotification", () => {
    it("creates a notification with all fields", () => {
      const notification = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Test User enrolled in Test Course",
        `/instructor/${base.course.id}/students`
      );

      expect(notification).toBeDefined();
      expect(notification.recipientUserId).toBe(base.instructor.id);
      expect(notification.type).toBe(schema.NotificationType.Enrollment);
      expect(notification.title).toBe("New Enrollment");
      expect(notification.message).toBe("Test User enrolled in Test Course");
      expect(notification.linkUrl).toBe(
        `/instructor/${base.course.id}/students`
      );
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });
  });

  describe("getNotifications", () => {
    it("returns notifications ordered newest first", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "First notification",
        "/instructor/1/students"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Second notification",
        "/instructor/1/students"
      );

      const results = getNotifications(base.instructor.id, 10, 0);
      expect(results).toHaveLength(2);
      // Newest first
      expect(results[0].message).toBe("Second notification");
      expect(results[1].message).toBe("First notification");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        createNotification(
          base.instructor.id,
          schema.NotificationType.Enrollment,
          "New Enrollment",
          `Notification ${i}`,
          "/instructor/1/students"
        );
      }

      const results = getNotifications(base.instructor.id, 3, 0);
      expect(results).toHaveLength(3);
    });

    it("respects offset parameter", () => {
      for (let i = 0; i < 5; i++) {
        createNotification(
          base.instructor.id,
          schema.NotificationType.Enrollment,
          "New Enrollment",
          `Notification ${i}`,
          "/instructor/1/students"
        );
      }

      const results = getNotifications(base.instructor.id, 10, 2);
      expect(results).toHaveLength(3);
    });

    it("returns empty array when user has no notifications", () => {
      const results = getNotifications(base.instructor.id, 10, 0);
      expect(results).toHaveLength(0);
    });

    it("only returns notifications for the specified user", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "For original instructor",
        "/instructor/1/students"
      );
      createNotification(
        otherInstructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "For other instructor",
        "/instructor/2/students"
      );

      const results = getNotifications(base.instructor.id, 10, 0);
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("For original instructor");
    });
  });

  describe("getUnreadCount", () => {
    it("returns the count of unread notifications", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification 1",
        "/instructor/1/students"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification 2",
        "/instructor/1/students"
      );

      expect(getUnreadCount(base.instructor.id)).toBe(2);
    });

    it("returns 0 when all notifications are read", () => {
      const n = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification",
        "/instructor/1/students"
      );
      markAsRead(n.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("returns 0 when user has no notifications", () => {
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", () => {
      const n = createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification",
        "/instructor/1/students"
      );

      const updated = markAsRead(n.id);
      expect(updated).toBeDefined();
      expect(updated!.isRead).toBe(true);
    });

    it("returns undefined for non-existent notification", () => {
      const result = markAsRead(9999);
      expect(result).toBeUndefined();
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read for a user", () => {
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification 1",
        "/instructor/1/students"
      );
      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "Notification 2",
        "/instructor/1/students"
      );

      const updated = markAllAsRead(base.instructor.id);
      expect(updated).toHaveLength(2);
      expect(updated.every((n) => n.isRead === true)).toBe(true);
      expect(getUnreadCount(base.instructor.id)).toBe(0);
    });

    it("does not affect other users' notifications", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      createNotification(
        base.instructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "For original",
        "/instructor/1/students"
      );
      createNotification(
        otherInstructor.id,
        schema.NotificationType.Enrollment,
        "New Enrollment",
        "For other",
        "/instructor/2/students"
      );

      markAllAsRead(base.instructor.id);

      expect(getUnreadCount(base.instructor.id)).toBe(0);
      expect(getUnreadCount(otherInstructor.id)).toBe(1);
    });

    it("returns empty array when no unread notifications exist", () => {
      const updated = markAllAsRead(base.instructor.id);
      expect(updated).toHaveLength(0);
    });
  });
});
