import { data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/api.lesson-comments";
import { getCurrentUserId } from "~/lib/session";
import { parseJsonBody } from "~/lib/validation";
import { getUserById } from "~/services/userService";
import { getLessonById } from "~/services/lessonService";
import { getModuleById } from "~/services/moduleService";
import { getCourseById } from "~/services/courseService";
import {
  getCommentById,
  hideComment,
  unhideComment,
  deleteComment,
} from "~/services/lessonCommentService";
import { UserRole } from "~/db/schema";

const moderateCommentSchema = z.object({
  intent: z.enum(["hide", "unhide", "delete"]),
  commentId: z.number(),
});

export async function action({ request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  const parsed = await parseJsonBody(request, moderateCommentSchema);
  if (!parsed.success) {
    throw data("Invalid parameters", { status: 400 });
  }

  const { intent, commentId } = parsed.data;

  const comment = getCommentById(commentId);
  if (!comment) {
    throw data("Comment not found", { status: 404 });
  }

  // Resolve comment → lesson → module → course for authorization
  const lesson = getLessonById(comment.lessonId);
  if (!lesson) {
    throw data("Lesson not found", { status: 404 });
  }

  const mod = getModuleById(lesson.moduleId);
  if (!mod) {
    throw data("Module not found", { status: 404 });
  }

  const course = getCourseById(mod.courseId);
  if (!course) {
    throw data("Course not found", { status: 404 });
  }

  const user = getUserById(currentUserId);
  const isAdmin = user?.role === UserRole.Admin;
  const isInstructor = course.instructorId === currentUserId;

  const isAuthor = comment.userId === currentUserId;

  // Hide/unhide: instructors + admins only
  // Delete: admins, or the comment author
  if (intent === "hide" || intent === "unhide") {
    if (!isAdmin && !isInstructor) {
      throw data("Forbidden", { status: 403 });
    }
  } else if (intent === "delete") {
    if (!isAdmin && !isAuthor) {
      throw data("Forbidden", { status: 403 });
    }
  }

  if (intent === "hide") {
    hideComment(commentId);
  } else if (intent === "unhide") {
    unhideComment(commentId);
  } else {
    deleteComment(commentId);
  }

  return { success: true };
}
