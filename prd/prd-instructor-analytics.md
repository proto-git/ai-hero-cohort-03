# Instructor Analytics Dashboard

## Problem Statement

As an instructor on the platform, I have no visibility into how my courses are actually performing. I can see a list of my courses and a roster of students enrolled in each one, but I can't tell:

- Whether my course is making money and if that's trending up or down
- How many students are actually finishing what they started
- Where in the course students lose interest and drop off
- Which quiz questions are tripping students up (signaling unclear content)
- Whether students are actually watching the videos or clicking away
- How satisfied students are and whether that's improving over time

Without this information, I can't make data-informed decisions about which courses to invest more time in, which lessons need to be rewritten, or which quiz questions need to be clarified. I'm flying blind.

As an admin, I have no way to gauge instructor success across the platform. I can't tell which instructors are producing courses that students actually complete, which are generating revenue, or which need coaching on where their content is losing students. This makes compensation decisions and instructor development impossible to ground in data.

## Solution

A dedicated analytics dashboard for instructors, accessible from the sidebar, that surfaces the data the platform already tracks — revenue, enrollments, completion rates, quiz performance, video engagement, and ratings — in a visual, drill-down format.

The dashboard has two tiers:

1. **Cross-course overview** at `/instructor/analytics` — top-line KPIs across all the instructor's courses, revenue and enrollment trends over time, and a sortable table of courses showing each one's key metrics at a glance.

2. **Per-course deep dive** at `/instructor/:courseId/analytics` — a tabbed view focused on a single course, with sections for Engagement (drop-off funnel, video watch-through), Quizzes (pass rates, question-level breakdown), Revenue (trends, PPP breakdown), and Ratings (distribution, trend).

Admins see the same views but with an instructor picker at the top of the overview, letting them view any instructor's data or an aggregate across all instructors. This supports both compensation/performance review and coaching conversations about specific courses.

All queries run live against the database — no pre-computation or caching — since the platform's current scale makes that unnecessary.

## User Stories

### Instructor — Cross-Course Overview

1. As an instructor, I want to see total revenue across all my courses, so that I can understand my overall earnings from the platform.
2. As an instructor, I want to see the total number of students enrolled across all my courses, so that I can gauge my reach.
3. As an instructor, I want to see the average completion rate across my courses, so that I can tell whether students are finishing what they start.
4. As an instructor, I want to see the average quiz pass rate across my courses, so that I can tell whether students are understanding the material.
5. As an instructor, I want to see the average rating across my courses, so that I can tell whether students are satisfied with what I'm producing.
6. As an instructor, I want to see a revenue trend line over time, so that I can spot whether my earnings are growing, flat, or declining.
7. As an instructor, I want to see an enrollment trend line over time, so that I can gauge whether my marketing efforts are working.
8. As an instructor, I want to see a sortable table of all my courses with their key metrics, so that I can quickly compare performance and identify my best and worst performers.
9. As an instructor, I want to click a course in the table to drill into its detailed analytics, so that I can investigate specific issues without losing my place.

### Instructor — Per-Course Analytics

10. As an instructor, I want to see KPI cards specific to a single course, so that I can get an at-a-glance summary of its health.
11. As an instructor, I want to see a waterfall visualization of student drop-off at the lesson level, grouped by module, so that I can identify exactly where students stop progressing.
12. As an instructor, I want to see whether drop-off patterns differ between lessons within the same module, so that I can tell if one specific lesson is the problem rather than the whole module.
13. As an instructor, I want to see the average video watch-through percentage for each lesson, so that I can identify lessons where students are clicking away before finishing.
14. As an instructor, I want to see the pass rate for each quiz in my course, so that I can identify quizzes that are too hard or too easy.
15. As an instructor, I want to see the correct-answer rate for each question in a quiz, so that I can identify specific questions that are tripping students up.
16. As an instructor, I want to see how students are distributing their answers across options for each question, so that I can understand the common misconceptions behind wrong answers.
17. As an instructor, I want to see a revenue trend line for a single course, so that I can see whether that course's earnings are trending up or down over time.
18. As an instructor, I want to see an enrollment trend line for a single course, so that I can gauge marketing effectiveness for that specific course.
19. As an instructor, I want to see a breakdown of revenue by country when PPP pricing is enabled, so that I can understand the geographic mix of my buyers.
20. As an instructor, I want to see the distribution of star ratings for a course (how many 1s, 2s, 3s, 4s, 5s), so that I can understand the spread of student opinions, not just the average.
21. As an instructor, I want to see how a course's average rating has changed over time, so that I can tell whether recent content updates are improving satisfaction.

### Admin

22. As an admin, I want to access the same analytics dashboard as instructors, so that I can evaluate instructor performance using the same metrics they see.
23. As an admin, I want to select a specific instructor from a dropdown on the overview page, so that I can view any individual instructor's analytics.
24. As an admin, I want to see an aggregate view across all instructors, so that I can gauge platform-wide performance.
25. As an admin, I want to use revenue and completion rate data to inform instructor compensation decisions, so that pay is tied to measurable impact.
26. As an admin, I want to use drop-off data to guide coaching conversations with instructors, so that I can help them improve the specific lessons where students are losing interest.

### Access Control

27. As an instructor, I want to see analytics only for courses I own, so that I can't view other instructors' private performance data.
28. As an admin, I want to see analytics for any course on the platform, so that I have full visibility for platform management.
29. As a student, I want to be denied access to instructor analytics routes, so that private performance data stays private.

### Navigation and Experience

30. As an instructor, I want a dedicated "Analytics" entry in the sidebar separate from "My Courses," so that I can mentally separate "editing my courses" from "understanding my performance."
31. As an instructor, I want empty states for new courses with no data yet, so that the dashboard doesn't look broken when I'm just starting out.
32. As an instructor, I want the dashboard to load quickly on each visit, so that checking performance doesn't feel like a chore.

## Implementation Decisions

### New Modules

**Analytics Service (deep module)**

A single service layer module that encapsulates all the aggregate queries the dashboard needs. This is intentionally designed as a deep module: complex SQL and aggregation logic hidden behind a simple, stable interface that the routes can call without knowing anything about joins, grouping, or filtering.

Its responsibilities include:

- Cross-course overview data: top-line KPI totals and the per-course summary rows for the sortable table
- Revenue time-series (scoped to a course, an instructor, or the whole platform)
- Enrollment time-series (same scoping)
- Lesson-level drop-off funnel data for a course, structured so the UI can group by module
- Video engagement data per lesson (average watch-through percentage)
- Quiz performance data: per-quiz pass rates, per-question correct-answer rates, and per-option selection distributions
- Rating distribution (histogram of 1–5 star counts) and rating trend over time for a course

All scoping parameters (instructor ID, course ID) are optional, letting the same functions serve both the instructor view (scoped to their own ID) and the admin aggregate view (unscoped or scoped to a selected instructor).

**Chart Components**

A small set of reusable Recharts wrapper components styled to match the existing shadcn/Tailwind design language:

- A line chart component for time-series data (used for revenue, enrollment, and rating trends)
- A waterfall/step chart component for the drop-off funnel
- A bar chart component for rating distribution and quiz option distribution
- A KPI card component displaying a labeled metric value

These wrappers are thin — they handle styling and sensible defaults so route pages can drop in charts without wiring Recharts props repeatedly.

### New Routes

- `/instructor/analytics` — the cross-course overview page. Loads top-line KPIs, revenue and enrollment trends, and the sortable course table. Displays an instructor picker dropdown at the top when the current user is an admin.
- `/instructor/:courseId/analytics` — the per-course deep dive. Renders a tabbed layout with Engagement, Quizzes, Revenue, and Ratings sections.

Both routes load all their data through the analytics service in their loader functions. No client-side data fetching.

### Modified Routes and Components

- The instructor sidebar gains an "Analytics" entry positioned alongside "My Courses" but navigating to `/instructor/analytics`.
- The existing `/instructor` route (currently a course list / "My Courses") is left alone. Analytics lives in a new, separate entry point.

### Access Control

- Both new routes check the current user's role in their loader functions.
- Instructors can only see analytics for courses they own. This is enforced both at the overview level (the service scopes queries by instructor ID) and at the per-course level (the loader verifies `course.instructorId` matches the current user).
- Admins bypass the ownership check and can view any instructor or any course.
- Students attempting to access either route are denied.

### Data Model

No schema changes. All required data already exists in the following tables: `purchases`, `enrollments`, `lessonProgress`, `quizAttempts`, `quizAnswers`, `quizOptions`, `quizQuestions`, `videoWatchEvents`, and `courseReviews`.

### Charting Library

Recharts is introduced as a new dependency for the visual components. It is chosen because it has the most idiomatic React API of the major charting libraries, composes cleanly with shadcn-style components, and is widely used in the ecosystem.

### Query Strategy

All analytics queries run live against SQLite on each page load. No caching layer, no pre-computed aggregate tables, no background jobs. The platform's current scale makes this acceptable, and avoiding the operational complexity of caching is worth more than the theoretical performance gain.

### Empty States

Routes and chart components handle empty data gracefully: KPI cards show "0" or a dash for missing values, charts show a centered empty-state message, and tables display a "no data yet" row. No dummy or placeholder data is ever shown.

### Filtering and Time Ranges

Version one ships with "all time" as the only time range. No date range pickers, no "last 30 days" filters. This keeps the v1 scope tight and lets us add filtering later based on actual usage patterns.

## Testing Decisions

### Philosophy

Good tests in this codebase verify external behavior, not implementation details. For the analytics service, this means asserting that given a known set of seeded database rows, the service functions return the correct aggregate values. Tests should not care about which specific SQL operators or join orders the service uses internally — only that the numbers come out right.

### What Gets Tested

The analytics service is the only module with tests. This follows the project convention that any file named as a service must have an accompanying `.test.ts` file, and it reflects where correctness actually matters: aggregation logic is easy to get subtly wrong, and bugs there directly corrupt the data instructors and admins use to make decisions.

Specific areas to cover:

- Cross-course KPI totals correctly sum across multiple courses owned by an instructor
- Revenue and enrollment time-series produce correctly bucketed results
- Drop-off funnel returns accurate completion counts per lesson, in module order
- Video engagement correctly calculates average watch-through percentages
- Quiz pass rates, question-level correct rates, and option distributions are computed correctly
- Rating distribution histograms sum to the total review count, and trend data is correctly ordered
- Scoping by instructor ID and course ID correctly filters results
- Admin (unscoped) queries return platform-wide aggregates

### What Does Not Get Tested

- Route loaders — thin wrappers around service calls, tested transitively through the service
- Chart components — visual/presentational, not worth unit testing
- The navigation sidebar change — trivial

### Prior Art

The existing `bookmarkService.test.ts` is the closest reference. It tests a service directly against the database using seeded data and asserts on returned values. The analytics service tests should follow the same pattern: seed a known state, call the service function, assert on the aggregates.

## Out of Scope

- **Time range filtering.** Version one is all-time only. Date range pickers, "last 7/30/90 days" filters, and custom ranges are deferred.
- **Data export.** No CSV, PDF, or any other export format. Visual dashboard only.
- **Pre-computed aggregates or caching.** All queries run live on each page load.
- **Real-time updates.** The dashboard does not auto-refresh or push updates. Instructors reload to see new data.
- **Cohort comparisons.** Comparing "students who enrolled this month" to "students who enrolled last month" is not included.
- **Predictive analytics.** No forecasting, churn prediction, or ML-based insights.
- **Notification or alerting.** Instructors are not notified when metrics change — they have to visit the dashboard to see updates.
- **Mobile-specific layouts.** The dashboard should be responsive in a basic sense but is designed primarily for desktop use.
- **New data collection.** Everything the dashboard shows is already being tracked. No new events, columns, or tables are added to collect additional data.
- **Per-student drill-down from the analytics view.** The existing `/instructor/:courseId/students` roster page remains the home for per-student inspection. Analytics stays at the aggregate level.

## Further Notes

- The existing `/instructor/:courseId/students` page already shows per-student progress and quiz scores. This PRD does not modify or replace that page. The analytics dashboard and the student roster serve different purposes and should remain separate.
- Recharts is being introduced as a new dependency. Before building the chart wrapper components, verify it integrates cleanly with the existing Tailwind 4 and shadcn setup. If there are issues, we may need to revisit the choice.
- The analytics service should be designed so that adding time range filtering later is a non-breaking change — the scoping parameters should already anticipate an optional date range argument even if v1 doesn't expose it in the UI.
- Admin aggregate views (platform-wide metrics across all instructors) may produce larger query result sets than individual instructor views. If any of those queries become slow in practice, that's a signal to revisit the "no caching" decision — but not before we have evidence.
