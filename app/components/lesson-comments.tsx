import { useState, useEffect, useRef } from "react";
import { Form, useFetcher, useRevalidator, useNavigation } from "react-router";
import { toast } from "sonner";
import {
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  Reply,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { UserAvatar } from "~/components/user-avatar";
import { cn, formatRelativeTime } from "~/lib/utils";
import { CommentStatus } from "~/db/schema";
import type { ThreadedComment, CommentRow } from "~/services/lessonCommentService";

interface LessonCommentsProps {
  lessonId: number;
  comments: ThreadedComment[];
  currentUserId: number | null;
  isInstructor: boolean;
  isAdmin: boolean;
  enrolled: boolean;
}

export function LessonComments({
  lessonId,
  comments,
  currentUserId,
  isInstructor,
  isAdmin,
  enrolled,
}: LessonCommentsProps) {
  const visibleCount = comments.filter(
    (c) => c.status === CommentStatus.Visible
  ).length;
  const canComment = enrolled || isInstructor || isAdmin;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Discussion{visibleCount > 0 ? ` (${visibleCount})` : ""}
        </h2>
      </div>

      {canComment && currentUserId && (
        <CommentForm lessonId={lessonId} />
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to start a discussion.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              lessonId={lessonId}
              currentUserId={currentUserId}
              isInstructor={isInstructor}
              isAdmin={isAdmin}
              canComment={canComment}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const MAX_CHARS = 2000;

function CommentForm({
  lessonId,
  parentId,
  placeholder = "Add to the discussion...",
  onCancel,
}: {
  lessonId: number;
  parentId?: number;
  placeholder?: string;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigation = useNavigation();
  const formKey = parentId ? `reply-${parentId}` : "top-level";
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "create-comment" &&
    (navigation.formData?.get("parentId") ?? "") === (parentId?.toString() ?? "");

  // Focus textarea on mount for reply forms
  useEffect(() => {
    if (parentId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [parentId]);

  // Clear form after successful submission
  const prevSubmitting = useRef(false);
  useEffect(() => {
    if (prevSubmitting.current && !isSubmitting) {
      setContent("");
      formRef.current?.reset();
      toast.success(parentId ? "Reply posted" : "Comment posted");
      onCancel?.();
    }
    prevSubmitting.current = isSubmitting;
  }, [isSubmitting]);

  return (
    <Form ref={formRef} method="post" className={cn("mb-4", parentId && "mb-0")}>
      <input type="hidden" name="intent" value="create-comment" />
      <input type="hidden" name="lessonId" value={lessonId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <Textarea
        ref={textareaRef}
        name="content"
        placeholder={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_CHARS}
        className={cn("mb-2", parentId ? "min-h-[60px]" : "min-h-[80px]")}
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs text-muted-foreground",
            content.length > MAX_CHARS * 0.9 && "text-amber-500",
            content.length >= MAX_CHARS && "text-destructive"
          )}
        >
          {content.length > 0 && `${content.length}/${MAX_CHARS}`}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={content.trim().length === 0 || isSubmitting}
          >
            {isSubmitting ? "Posting..." : parentId ? "Reply" : "Post Comment"}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function CommentThread({
  comment,
  lessonId,
  currentUserId,
  isInstructor,
  isAdmin,
  canComment,
}: {
  comment: ThreadedComment;
  lessonId: number;
  currentUserId: number | null;
  isInstructor: boolean;
  isAdmin: boolean;
  canComment: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div>
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        isInstructor={isInstructor}
        isAdmin={isAdmin}
        canReply={canComment && !!currentUserId}
        onReply={() => setShowReplyForm(true)}
      />

      {/* Replies */}
      {(comment.replies.length > 0 || showReplyForm) && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isInstructor={isInstructor}
              isAdmin={isAdmin}
              canReply={false}
              isReply
            />
          ))}

          {showReplyForm && (
            <div className="pt-1">
              <CommentForm
                lessonId={lessonId}
                parentId={comment.id}
                placeholder="Write a reply..."
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  isInstructor,
  isAdmin,
  canReply,
  isReply,
  onReply,
}: {
  comment: CommentRow;
  currentUserId: number | null;
  isInstructor: boolean;
  isAdmin: boolean;
  canReply: boolean;
  isReply?: boolean;
  onReply?: () => void;
}) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canModerate = isInstructor || isAdmin;
  const isHidden = comment.status === CommentStatus.Hidden;
  const isDeleted = comment.status === CommentStatus.Deleted;
  const isAuthor = currentUserId === comment.userId;
  const canDelete = isAdmin || isAuthor;

  const prevFetcherState = useRef(fetcher.state);
  useEffect(() => {
    if (prevFetcherState.current !== "idle" && fetcher.state === "idle") {
      revalidator.revalidate();
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state]);

  function moderate(intent: "hide" | "unhide" | "delete") {
    fetcher.submit(
      { intent, commentId: comment.id },
      {
        method: "POST",
        action: "/api/lesson-comments",
        encType: "application/json",
      }
    );
    setConfirmDelete(false);
  }

  // Deleted comment placeholder (shown when parent was deleted but has replies)
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex gap-3 rounded-lg border border-dashed border-muted p-4",
          isReply && "border-0 bg-muted/20 p-3"
        )}
      >
        <UserAvatar
          name={comment.userName}
          avatarUrl={comment.userAvatarUrl}
          className={cn("mt-0.5 shrink-0 opacity-50", isReply && "size-6")}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn("font-medium text-muted-foreground", isReply ? "text-xs" : "text-sm")}>
              {comment.userName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className={cn("italic text-muted-foreground", isReply ? "text-xs" : "text-sm")}>
            This comment was deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        isReply && "border-0 bg-muted/30 p-3",
        isHidden && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <UserAvatar
        name={comment.userName}
        avatarUrl={comment.userAvatarUrl}
        className={cn("mt-0.5 shrink-0", isReply && "size-6")}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={cn("font-medium", isReply ? "text-xs" : "text-sm")}>
            {comment.userName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {isHidden && canModerate && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-600">
              Hidden
            </span>
          )}
        </div>
        <p className={cn("whitespace-pre-wrap", isReply ? "text-xs" : "text-sm")}>
          {comment.content}
        </p>

        <div className="mt-2 flex items-center gap-1">
          {canReply && onReply && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onReply}
              className="text-muted-foreground"
            >
              <Reply className="mr-1 size-3" />
              Reply
            </Button>
          )}

          {canModerate && (
            <>
              {isHidden ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => moderate("unhide")}
                  disabled={fetcher.state !== "idle"}
                  className="text-muted-foreground"
                >
                  <Eye className="mr-1 size-3" />
                  Unhide
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => moderate("hide")}
                  disabled={fetcher.state !== "idle"}
                  className="text-muted-foreground"
                >
                  <EyeOff className="mr-1 size-3" />
                  Hide
                </Button>
              )}
            </>
          )}

          {canDelete &&
            (confirmDelete ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => moderate("delete")}
                disabled={fetcher.state !== "idle"}
                className="text-destructive"
              >
                <Trash2 className="mr-1 size-3" />
                Confirm?
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground"
              >
                <Trash2 className="mr-1 size-3" />
                Delete
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
