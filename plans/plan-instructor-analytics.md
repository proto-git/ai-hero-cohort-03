# Plan: Instructor Analytics Dashboard

> Source PRD: `plan-instructor-analytics.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**:
  - `/instructor/analytics` — cross-course overview
  - `/instructor/:courseId/analytics` — per-course deep dive
  - Both registered under the existing `layout.app.tsx` layout in `app/routes.ts`.
- **Schema**: No changes. All data already exists in `purchases`, `enrollments`, `lessonProgress`, `quizAttempts`, `quizAnswers`, `quizOptions`, `quizQuestions`, `videoWatchEvents`, and `courseReviews`.
- **New service**: A single deep-module `analyticsService` that hides all aggregation SQL behind a simple interface. Every public function accepts optional scoping parameters (`instructorId`, `courseId`) plus an anticipated optional `dateRange` argument so adding time-range filtering later is non-breaking.
- **Access control**: Loader-level only. Instructors are scoped to their own ID (enforced both in service queries and per-course ownership checks). Admins bypass ownership and can view any instructor or any course. Students are denied access to both routes.
- **Charts**: Recharts is introduced as a new dependency. A small set of thin wrapper components (line chart, bar chart, drop-off/waterfall chart, KPI card) lives alongside other shared UI components and absorbs Recharts' API surface so route pages don't repeat chart wiring.
- **Query strategy**: All queries run live against SQLite on each request. No caching, no precomputed aggregate tables, no background jobs.
- **Video watch-through derivation**: Watch-through percentage is derived per `(user, lesson)` as `MAX(videoWatchEvents.positionSeconds) / (lessons.durationMinutes * 60)`, clamped to `[0, 1]`. Lessons without `durationMinutes` are excluded from the average. This is the only non-obvious aggregation in the spec and is called out here so every phase that touches video data uses the same definition.
- **Testing**: Only `analyticsService` is tested. Tests follow the existing `bookmarkService.test.ts` pattern: `vi.mock("~/db")` injects a per-test SQLite database, the service is imported after the mock, the test seeds known rows and asserts on returned aggregates. Route loaders, chart wrappers, and the sidebar change are not tested.
- **Empty states**: KPI cards display `0` or `—`. Charts show a centered empty-state message. Tables show a "no data yet" row. No dummy or placeholder data is ever rendered.
- **Time range**: v1 ships "all time" only. The service signatures accept an optional `dateRange` parameter that the v1 UI never passes.

---

## Phase 1: Foundation — route shell, sidebar entry, access control, first two KPIs

**User stories**: 1, 2, 27, 28, 29, 30, 32

### What to build

The thinnest possible end-to-end slice that proves the whole stack lights up. An instructor can click a new "Analytics" entry in the sidebar and land on `/instructor/analytics`, where two KPI cards display real numbers pulled from the database — total revenue across all of their courses, and total students enrolled across all of their courses. Students who try to access the route are denied. Admins can reach the route but the admin instructor picker is not yet wired (that arrives in Phase 7).

This phase establishes the `analyticsService` deep module shape. Every later phase will plug additional functions into a pipeline that already works end-to-end, rather than discovering integration problems late. The two KPIs are deliberately chosen to touch two different tables (`purchases` and `enrollments`) so the service's scoping behavior is exercised from the start.

No charting library is introduced in this phase — KPI cards are plain styled components. Recharts arrives in Phase 2, isolating that risk to a single slice.

### Acceptance criteria — Phase 1

- [ ] An "Analytics" entry appears in the sidebar for users with the `instructor` role, alongside (not replacing) "My Courses".
- [ ] Visiting `/instructor/analytics` as an instructor renders a page with two KPI cards: total revenue and total enrollments, scoped to the current user's courses.
- [ ] The numbers shown on the page match a hand-counted aggregate of the seed data.
- [ ] Visiting `/instructor/analytics` as a student returns a 403 error page.
- [ ] Visiting `/instructor/analytics` as an admin loads the page successfully (showing platform-wide totals or zeros — admin scoping is finalized in Phase 7, this phase only requires the route not to throw).
- [ ] The `analyticsService` module exposes the two aggregate functions, both accepting an optional `instructorId` parameter, and a `dateRange` parameter that is currently ignored.
- [ ] `analyticsService.test.ts` exists and asserts the correct aggregate values for: instructor with one course, instructor with multiple courses, instructor with zero courses, scoping correctly excludes other instructors' data.
- [ ] The page loads in a single round trip — no client-side data fetching.

---

## Phase 2: Overview trend lines and remaining top-line KPIs (introduces Recharts)

**User stories**: 3, 4, 5, 6, 7, 31

### What to build — Phase 2

The overview page gains the rest of its top-line numbers (average completion rate, average quiz pass rate, average rating across the instructor's courses) and two trend line charts: revenue over time and enrollments over time, each bucketed by month (or by week if total span is short — the bucket choice is part of this phase).

This phase introduces Recharts as a dependency and creates the first reusable chart wrapper components — at minimum a line chart wrapper and (continuing from Phase 1) a KPI card wrapper. The line chart wrapper is styled to match the existing shadcn/Tailwind look and feel and handles its own empty state. Phase 2 is also where we verify Recharts integrates cleanly with Tailwind 4 and shadcn; if it doesn't, the PRD explicitly authorizes revisiting the choice and only this phase is impacted.

Empty-state behavior is required for the trend lines: a brand-new instructor with no purchases or enrollments must see a clean "no data yet" message, not a broken chart.

### Acceptance criteria — Phase 2

- [ ] Recharts is installed and a quick smoke test confirms it renders correctly inside the existing layout.
- [ ] The overview page shows five top-line KPIs: total revenue, total enrollments, average completion rate, average quiz pass rate, average rating.
- [ ] A revenue trend line chart renders on the overview page with one point per time bucket.
- [ ] An enrollment trend line chart renders on the overview page with one point per time bucket.
- [ ] The trend chart wrapper component is reused for both charts — no duplicated Recharts wiring.
- [ ] An instructor with zero data sees an empty-state message inside each chart, not a broken or blank chart frame.
- [ ] `analyticsService` gains time-series functions and additional KPI functions, each accepting optional `instructorId` and `dateRange` parameters.
- [ ] Tests cover: time-series buckets are produced in the correct order, buckets with zero activity still appear as zero (or are correctly omitted, whichever the chosen design says), and the average KPIs correctly weight across courses.

---

## Phase 3: Sortable course table on the overview

**User stories**: 8, 9

### What to build — Phase 3

Below the KPIs and trend charts on the overview page, an instructor sees a sortable table listing all of their courses. Each row shows the course's title and its key metrics at a glance: enrollments, completion rate, average rating, total revenue. Clicking a column header sorts by that column. Clicking a course row navigates to that course's per-course analytics page (which does not exist yet — the link is wired now and will start working in Phase 4).

This phase finishes the cross-course overview. After it ships, the entire `/instructor/analytics` route is feature-complete from the instructor's perspective.

### Acceptance criteria — Phase 3

- [ ] The overview page shows a course table below the trends, with one row per course owned by the current instructor.
- [ ] The table is client-side sortable by every metric column.
- [ ] Each row links to `/instructor/:courseId/analytics`, even though that route may 404 until Phase 4.
- [ ] An instructor with zero courses sees an empty-state row instead of an empty table.
- [ ] `analyticsService` gains a per-course summary function that returns one row per course with the metrics needed by the table.
- [ ] Tests cover: summary rows correctly aggregate per-course metrics, only courses owned by the scoped instructor are returned, and zero-data courses appear with zeros (not omitted).

---

## Phase 4: Per-course deep dive shell + Engagement tab

**User stories**: 10, 11, 12, 13

### What to build — Phase 4

A new route at `/instructor/:courseId/analytics` renders a tabbed layout with four tabs: Engagement, Quizzes, Revenue, Ratings. Only the Engagement tab is wired in this phase; the other three are visible but show a placeholder. The Engagement tab is the per-course KPI cards (course-scoped versions of the overview KPIs) plus two visualizations:

1. A drop-off funnel showing student progression at the lesson level, grouped visually by module so an instructor can see whether one specific lesson within a module is the problem versus the whole module losing students.
2. A per-lesson video watch-through view showing the average watch-through percentage for each lesson (using the derivation defined in Architectural Decisions).

Access control matters here in a new way: the per-course route must verify `course.instructorId === currentUserId` for instructors, and admins bypass that check. A student is denied. An instructor trying to view another instructor's course is denied with a 403, not a 404.

The links from the Phase 3 course table now resolve to a working page. After this phase, the overview-to-deep-dive journey is fully demoable.

A drop-off / step / waterfall chart wrapper component is added to the chart components started in Phase 2.

> **Implementation note for the user — meaningful design choice ahead.** The drop-off funnel computation has more than one valid definition. When this phase starts, expect to be asked which one to use:
>
> - "Number of students who completed lesson N" (strictest — only counts completions)
> - "Number of students who reached lesson N" (counts anyone who completed lesson N or any later lesson, treating skip-ahead behavior as having reached the earlier lesson)
> - "Number of students who started lesson N" (loosest — counts any progress record)
>
> Each gives a different funnel shape and tells a slightly different story. This is exactly the kind of business-logic decision the PRD leaves open and the implementing engineer (you) should pick deliberately.

### Acceptance criteria — Phase 4

- [ ] Visiting `/instructor/:courseId/analytics` as the course's owner renders the tabbed layout with Engagement selected by default.
- [ ] Visiting the route as an instructor who does not own the course returns 403.
- [ ] Visiting the route as an admin loads any course successfully.
- [ ] Visiting the route as a student returns 403.
- [ ] The Engagement tab displays per-course KPI cards.
- [ ] The Engagement tab displays a drop-off visualization where lessons are visibly grouped by module and lesson order matches module/lesson position.
- [ ] The Engagement tab displays per-lesson average video watch-through percentages, with lessons that have no `durationMinutes` excluded.
- [ ] Empty states render correctly for a course with zero enrollments and a course with no video data.
- [ ] Clicking a row in the Phase 3 overview table navigates to this page and the page loads.
- [ ] `analyticsService` gains drop-off and video watch-through functions, each scoped by `courseId`.
- [ ] Tests cover: drop-off counts are accurate against seeded `lessonProgress` data and ordered correctly across modules; video watch-through correctly handles users with multiple events per lesson, lessons with no events, and lessons with no `durationMinutes`.

---

## Phase 5: Per-course Quizzes tab

**User stories**: 14, 15, 16

### What to build — Phase 5

The Quizzes tab on the per-course analytics page becomes functional. For each quiz in the course it shows the pass rate. Drilling into a quiz shows each question's correct-answer rate and, for multiple-choice questions, how students distributed their answers across the available options — so an instructor can see the misconception behind a wrong answer, not just that students got it wrong.

A bar chart wrapper component is added (or reused if already created) to render the option distribution.

### Acceptance criteria — Phase 5

- [ ] The Quizzes tab lists every quiz in the course with its pass rate.
- [ ] For each quiz, the instructor can see each question with its correct-answer rate.
- [ ] For each multiple-choice question, the option distribution is visualized as a bar chart with a clear indication of which option was the correct one.
- [ ] Quizzes with zero attempts render an empty state, not divide-by-zero or `NaN`.
- [ ] Questions where every student picked the same option still render correctly.
- [ ] `analyticsService` gains quiz pass rate, per-question correct rate, and per-option distribution functions, each scoped by `courseId`.
- [ ] Tests cover: pass rate matches seeded `quizAttempts`, per-question correct rates are accurate, option distributions sum to the total answer count for that question, and a question with zero answers returns an empty distribution rather than throwing.

---

## Phase 6: Per-course Revenue + Ratings tabs

**User stories**: 17, 18, 19, 20, 21

### What to build — Phase 6

The two remaining per-course tabs become functional:

- **Revenue tab**: a revenue trend line for the single course (course-scoped version of the overview trend), an enrollment trend for the single course, and — when the course has PPP pricing enabled — a breakdown of revenue by buyer country. Purchases with no `country` value are bucketed as "Unknown".
- **Ratings tab**: a histogram of star ratings (counts of 1, 2, 3, 4, 5 star reviews) and a line chart showing how the average rating has trended over time. The histogram uses the bar chart wrapper from Phase 5; the trend uses the line chart wrapper from Phase 2.

After this phase, the per-course deep dive is fully feature-complete for instructors.

### Acceptance criteria — Phase 6

- [ ] The Revenue tab shows revenue and enrollment trend charts scoped to the single course.
- [ ] When a course has PPP enabled, the Revenue tab shows a country revenue breakdown; purchases with no recorded country appear under "Unknown".
- [ ] When a course does not have PPP enabled, the country breakdown is hidden (or replaced with a clear "PPP not enabled for this course" message).
- [ ] The Ratings tab shows a histogram with one bar per star value (1 through 5) and counts that sum to the total number of reviews on the course.
- [ ] The Ratings tab shows a line chart of average rating over time.
- [ ] A course with zero reviews shows empty states on the Ratings tab — no broken charts.
- [ ] `analyticsService` gains country revenue, rating distribution, and rating trend functions, each scoped by `courseId`.
- [ ] Tests cover: the revenue and enrollment trends correctly scope to a single course; the country breakdown buckets nulls under "Unknown" and sums to the course total; the rating histogram bins sum to the total review count; and the rating trend is ordered chronologically.

---

## Phase 7: Admin instructor picker + aggregate view

**User stories**: 22, 23, 24, 25, 26

### What to build — Phase 7

The overview page (`/instructor/analytics`) gains an instructor picker dropdown that is only rendered for users with the `admin` role. The picker has three modes:

1. A specific instructor — page shows that instructor's view, identical to what the instructor themselves would see.
2. "All instructors" — page shows platform-wide aggregates, where every metric sums or averages across every instructor and course.
3. (Default on first load — choose either "All instructors" or the first instructor alphabetically; pick whichever feels less surprising during implementation.)

This phase exercises the optional `instructorId` parameter that every service function has carried since Phase 1. If anything was secretly hardcoded along the way, this phase is where it surfaces. Per-course analytics also confirms that admin access bypasses the ownership check (already implemented in Phase 4 — this phase is the integration test for that).

After this phase, the dashboard is feature-complete and the PRD ships.

### Acceptance criteria — Phase 7

- [ ] When an admin loads `/instructor/analytics`, an instructor picker appears at the top of the page.
- [ ] When an instructor or student loads `/instructor/analytics`, no picker is rendered.
- [ ] Selecting a specific instructor in the picker re-renders the page with that instructor's KPIs, trends, and course table.
- [ ] Selecting "All instructors" renders platform-wide aggregates across every course on the platform.
- [ ] An admin can navigate from the platform-wide view into any course's per-course analytics page.
- [ ] Every `analyticsService` function works correctly when called with `instructorId` undefined (platform-wide) and with a specific `instructorId`.
- [ ] Tests cover: unscoped (platform-wide) aggregates correctly include data from all instructors; scoping to one instructor returns the same numbers as that instructor would see in their own view; and platform-wide trends are bucketed identically to instructor-scoped trends.

---

## Out of scope (carried from PRD)

- Time range filtering, date pickers, "last N days" filters
- CSV / PDF / any other data export
- Pre-computed aggregates, caching layers, background jobs
- Real-time updates or push notifications
- Cohort comparisons
- Predictive analytics or forecasting
- Mobile-specific layouts
- New data collection (no new events, columns, or tables)
- Per-student drill-down from analytics — the existing `/instructor/:courseId/students` roster owns that
