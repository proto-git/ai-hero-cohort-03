import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("courses", "routes/courses.tsx"),
  route("courses/:slug", "routes/courses.$slug.tsx"),
  route("courses/:slug/lessons/:lessonId", "routes/courses.$slug.lessons.$lessonId.tsx"),
  route("instructor", "routes/instructor.tsx"),
  route("instructor/new", "routes/instructor.new.tsx"),
  route("instructor/:courseId", "routes/instructor.$courseId.tsx"),
  route("instructor/:courseId/students", "routes/instructor.$courseId.students.tsx"),
  route("admin/users", "routes/admin.users.tsx"),
  route("admin/courses", "routes/admin.courses.tsx"),
  route("api/switch-user", "routes/api.switch-user.ts"),
] satisfies RouteConfig;
