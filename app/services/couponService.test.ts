import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
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
  generateCoupons,
  getCouponByCode,
  getCouponsForTeam,
  redeemCoupon,
} from "./couponService";

// Helper: create a team with admin and a purchase for coupon generation
function setupTeamAndPurchase(country: string | null = "US") {
  const team = testDb.insert(schema.teams).values({}).returning().get();

  testDb
    .insert(schema.teamMembers)
    .values({
      teamId: team.id,
      userId: base.user.id,
      role: schema.TeamMemberRole.Admin,
    })
    .run();

  const purchase = testDb
    .insert(schema.purchases)
    .values({
      userId: base.user.id,
      courseId: base.course.id,
      pricePaid: 10000,
      country,
    })
    .returning()
    .get();

  return { team, purchase };
}

// Helper: create a second user (the redeemer)
function createRedeemer() {
  return testDb
    .insert(schema.users)
    .values({
      name: "Redeemer",
      email: "redeemer@example.com",
      role: schema.UserRole.Student,
    })
    .returning()
    .get();
}

describe("couponService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("generateCoupons", () => {
    it("generates the requested number of coupons", () => {
      const { team, purchase } = setupTeamAndPurchase();

      const result = generateCoupons(team.id, base.course.id, purchase.id, 5);

      expect(result).toHaveLength(5);
    });

    it("generates unique codes for each coupon", () => {
      const { team, purchase } = setupTeamAndPurchase();

      const result = generateCoupons(team.id, base.course.id, purchase.id, 10);
      const codes = result.map((c) => c.code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });

    it("associates coupons with the correct team, course, and purchase", () => {
      const { team, purchase } = setupTeamAndPurchase();

      const result = generateCoupons(team.id, base.course.id, purchase.id, 1);

      expect(result[0].teamId).toBe(team.id);
      expect(result[0].courseId).toBe(base.course.id);
      expect(result[0].purchaseId).toBe(purchase.id);
      expect(result[0].redeemedByUserId).toBeNull();
      expect(result[0].redeemedAt).toBeNull();
    });
  });

  describe("getCouponByCode", () => {
    it("returns a coupon by its code", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);

      const found = getCouponByCode(coupon.code);

      expect(found).toBeDefined();
      expect(found!.id).toBe(coupon.id);
    });

    it("returns undefined for a nonexistent code", () => {
      const found = getCouponByCode("nonexistent-code");

      expect(found).toBeUndefined();
    });
  });

  describe("getCouponsForTeam", () => {
    it("returns all coupons for a team", () => {
      const { team, purchase } = setupTeamAndPurchase();
      generateCoupons(team.id, base.course.id, purchase.id, 3);

      const result = getCouponsForTeam(team.id);

      expect(result).toHaveLength(3);
    });

    it("filters coupons by course when courseId is provided", () => {
      const { team, purchase } = setupTeamAndPurchase();

      // Create a second course
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Second Course",
          slug: "second-course",
          description: "Another course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      const purchase2 = testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: course2.id,
          pricePaid: 5000,
          country: "US",
        })
        .returning()
        .get();

      generateCoupons(team.id, base.course.id, purchase.id, 3);
      generateCoupons(team.id, course2.id, purchase2.id, 2);

      const filtered = getCouponsForTeam(team.id, base.course.id);
      expect(filtered).toHaveLength(3);

      const filtered2 = getCouponsForTeam(team.id, course2.id);
      expect(filtered2).toHaveLength(2);

      const all = getCouponsForTeam(team.id);
      expect(all).toHaveLength(5);
    });
  });

  describe("redeemCoupon", () => {
    it("redeems a valid coupon and enrolls the user", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      const result = redeemCoupon(coupon.code, redeemer.id, "US");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.enrollment.userId).toBe(redeemer.id);
        expect(result.enrollment.courseId).toBe(base.course.id);
      }

      // Verify coupon is marked as redeemed
      const updated = getCouponByCode(coupon.code);
      expect(updated!.redeemedByUserId).toBe(redeemer.id);
      expect(updated!.redeemedAt).toBeDefined();
    });

    it("rejects redemption of a nonexistent code", () => {
      const result = redeemCoupon("nonexistent-code", 999, "US");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Coupon not found");
      }
    });

    it("rejects redemption of an already-consumed coupon", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      // First redemption succeeds
      redeemCoupon(coupon.code, redeemer.id, "US");

      // Second redemption (different user) fails
      const anotherUser = testDb
        .insert(schema.users)
        .values({
          name: "Another User",
          email: "another@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();

      const result = redeemCoupon(coupon.code, anotherUser.id, "US");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Coupon has already been redeemed");
      }
    });

    it("rejects redemption when user is already enrolled (coupon stays unconsumed)", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      // Enroll the user first (outside the coupon flow)
      testDb
        .insert(schema.enrollments)
        .values({ userId: redeemer.id, courseId: base.course.id })
        .run();

      const result = redeemCoupon(coupon.code, redeemer.id, "US");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("You are already enrolled in this course");
      }

      // Verify coupon is NOT consumed
      const unchanged = getCouponByCode(coupon.code);
      expect(unchanged!.redeemedByUserId).toBeNull();
    });

    it("rejects redemption from a different country", () => {
      const { team, purchase } = setupTeamAndPurchase("US");
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      const result = redeemCoupon(coupon.code, redeemer.id, "PL");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(
          "This coupon can only be redeemed from the same country as the purchaser"
        );
      }

      // Verify coupon is NOT consumed
      const unchanged = getCouponByCode(coupon.code);
      expect(unchanged!.redeemedByUserId).toBeNull();
    });

    it("allows redemption when purchase has no country set", () => {
      const { team, purchase } = setupTeamAndPurchase(null);
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      const result = redeemCoupon(coupon.code, redeemer.id, "PL");

      expect(result.ok).toBe(true);
    });
  });

  describe("redeemCoupon notifications", () => {
    // Helper: create a user and add them to a team with a given role
    function addTeamAdmin(
      teamId: number,
      opts: { name: string; email: string }
    ) {
      const user = testDb
        .insert(schema.users)
        .values({
          name: opts.name,
          email: opts.email,
          role: schema.UserRole.Student,
        })
        .returning()
        .get();
      testDb
        .insert(schema.teamMembers)
        .values({
          teamId,
          userId: user.id,
          role: schema.TeamMemberRole.Admin,
        })
        .run();
      return user;
    }

    function addTeamMember(
      teamId: number,
      opts: { name: string; email: string }
    ) {
      const user = testDb
        .insert(schema.users)
        .values({
          name: opts.name,
          email: opts.email,
          role: schema.UserRole.Student,
        })
        .returning()
        .get();
      testDb
        .insert(schema.teamMembers)
        .values({
          teamId,
          userId: user.id,
          role: schema.TeamMemberRole.Member,
        })
        .run();
      return user;
    }

    function getNotificationsFor(userId: number) {
      return testDb
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.recipientUserId, userId))
        .all();
    }

    it("creates a coupon_redemption notification for the team admin on successful redemption", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      redeemCoupon(coupon.code, redeemer.id, "US");

      const adminNotifs = getNotificationsFor(base.user.id);
      expect(adminNotifs).toHaveLength(1);
      expect(adminNotifs[0].type).toBe(
        schema.NotificationType.CouponRedemption
      );
      expect(adminNotifs[0].title).toBe("Seat Claimed");
      expect(adminNotifs[0].linkUrl).toBe("/team");
    });

    it("includes the redeemer name, course title, and per-course seat counts in the message", () => {
      const { team, purchase } = setupTeamAndPurchase();
      // 3 coupons total for this course
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 3);
      const redeemer = createRedeemer();

      redeemCoupon(coupon.code, redeemer.id, "US");

      const [notif] = getNotificationsFor(base.user.id);
      expect(notif.message).toBe(
        `${redeemer.name} redeemed a coupon for ${base.course.title} (2 of 3 seats remaining)`
      );
    });

    it("notifies every team admin, not just one", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const secondAdmin = addTeamAdmin(team.id, {
        name: "Second Admin",
        email: "admin2@example.com",
      });
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      redeemCoupon(coupon.code, redeemer.id, "US");

      expect(getNotificationsFor(base.user.id)).toHaveLength(1);
      expect(getNotificationsFor(secondAdmin.id)).toHaveLength(1);
    });

    it("does not notify non-admin team members", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const regularMember = addTeamMember(team.id, {
        name: "Regular Member",
        email: "member@example.com",
      });
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      redeemCoupon(coupon.code, redeemer.id, "US");

      expect(getNotificationsFor(regularMember.id)).toHaveLength(0);
    });

    it("counts seats per-course, not across all team coupons", () => {
      const { team, purchase } = setupTeamAndPurchase();

      // Create a second course with its own purchase + coupons on the same team
      const course2 = testDb
        .insert(schema.courses)
        .values({
          title: "Second Course",
          slug: "second-course",
          description: "Another",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();
      const purchase2 = testDb
        .insert(schema.purchases)
        .values({
          userId: base.user.id,
          courseId: course2.id,
          pricePaid: 5000,
          country: "US",
        })
        .returning()
        .get();

      const [couponA] = generateCoupons(
        team.id,
        base.course.id,
        purchase.id,
        2
      );
      generateCoupons(team.id, course2.id, purchase2.id, 5);
      const redeemer = createRedeemer();

      redeemCoupon(couponA.code, redeemer.id, "US");

      const [notif] = getNotificationsFor(base.user.id);
      // Seats remaining should reflect course A's 2-coupon pool, not the combined 7
      expect(notif.message).toContain("1 of 2 seats remaining");
    });

    it("also notifies the course instructor (so they can welcome coupon-redeemed students)", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      redeemCoupon(coupon.code, redeemer.id, "US");

      const instructorNotifs = getNotificationsFor(base.instructor.id);
      expect(instructorNotifs).toHaveLength(1);
      expect(instructorNotifs[0].type).toBe(schema.NotificationType.Enrollment);
      expect(instructorNotifs[0].title).toBe("New Enrollment");
      expect(instructorNotifs[0].message).toBe(
        `${redeemer.name} enrolled in ${base.course.title}`
      );
    });

    it("does not create a notification when redemption fails", () => {
      const { team, purchase } = setupTeamAndPurchase();
      const [coupon] = generateCoupons(team.id, base.course.id, purchase.id, 1);
      const redeemer = createRedeemer();

      // First redemption succeeds and creates a notification
      redeemCoupon(coupon.code, redeemer.id, "US");
      expect(getNotificationsFor(base.user.id)).toHaveLength(1);

      // Second attempt against the already-consumed coupon must not add another
      const otherUser = testDb
        .insert(schema.users)
        .values({
          name: "Other",
          email: "other@example.com",
          role: schema.UserRole.Student,
        })
        .returning()
        .get();
      const result = redeemCoupon(coupon.code, otherUser.id, "US");

      expect(result.ok).toBe(false);
      expect(getNotificationsFor(base.user.id)).toHaveLength(1);
    });
  });
});
