import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users, CommentStatus } from "~/db/schema";

// ─── Lesson Comment Service ───
// Handles CRUD and moderation for lesson comments.
// Uses positional parameters (project convention).

export type CommentRow = {
  id: number;
  lessonId: number;
  userId: number;
  parentId: number | null;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userAvatarUrl: string | null;
};

export type ThreadedComment = CommentRow & {
  replies: CommentRow[];
};

export function getCommentsForLesson(
  lessonId: number,
  includeHidden: boolean
): ThreadedComment[] {
  // Fetch all comments including deleted (needed to preserve threads
  // where a deleted parent still has visible replies)
  const rows = db
    .select({
      id: lessonComments.id,
      lessonId: lessonComments.lessonId,
      userId: lessonComments.userId,
      parentId: lessonComments.parentId,
      content: lessonComments.content,
      status: lessonComments.status,
      createdAt: lessonComments.createdAt,
      updatedAt: lessonComments.updatedAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(lessonComments.createdAt)
    .all();

  // Determine which statuses are visible for replies
  const visibleStatuses = new Set(
    includeHidden
      ? [CommentStatus.Visible, CommentStatus.Hidden]
      : [CommentStatus.Visible]
  );

  // Group into threads, filtering replies by visibility
  const topLevelAll = new Map<number, ThreadedComment>();
  const replyMap = new Map<number, CommentRow[]>();

  for (const row of rows) {
    if (row.parentId === null) {
      topLevelAll.set(row.id, { ...row, replies: [] });
    } else if (visibleStatuses.has(row.status as CommentStatus)) {
      const existing = replyMap.get(row.parentId) ?? [];
      existing.push(row);
      replyMap.set(row.parentId, existing);
    }
  }

  // Attach replies and filter: keep top-level if visible, OR if deleted
  // but has surviving replies (to preserve thread context)
  const result: ThreadedComment[] = [];
  for (const comment of topLevelAll.values()) {
    comment.replies = replyMap.get(comment.id) ?? [];
    const isVisible = visibleStatuses.has(comment.status as CommentStatus);
    const isDeletedWithReplies =
      comment.status === CommentStatus.Deleted && comment.replies.length > 0;

    if (isVisible || isDeletedWithReplies) {
      result.push(comment);
    }
  }

  return result;
}

export function getCommentById(commentId: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, commentId))
    .get();
}

export function createComment(
  lessonId: number,
  userId: number,
  content: string,
  parentId: number | null = null
) {
  return db
    .insert(lessonComments)
    .values({
      lessonId,
      userId,
      content,
      parentId,
      status: CommentStatus.Visible,
    })
    .returning()
    .get();
}

export function hideComment(commentId: number) {
  return db
    .update(lessonComments)
    .set({ status: CommentStatus.Hidden, updatedAt: new Date().toISOString() })
    .where(eq(lessonComments.id, commentId))
    .returning()
    .get();
}

export function unhideComment(commentId: number) {
  return db
    .update(lessonComments)
    .set({
      status: CommentStatus.Visible,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lessonComments.id, commentId))
    .returning()
    .get();
}

export function deleteComment(commentId: number) {
  return db
    .update(lessonComments)
    .set({
      status: CommentStatus.Deleted,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lessonComments.id, commentId))
    .returning()
    .get();
}
