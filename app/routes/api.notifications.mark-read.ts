import { data } from "react-router";
import * as v from "valibot";
import type { Route } from "./+types/api.notifications.mark-read";
import { getCurrentUserId } from "~/lib/session";
import { parseJsonBody } from "~/lib/validation";
import { markAsRead } from "~/services/notificationService";
import { db } from "~/db";
import { notifications } from "~/db/schema";
import { eq } from "drizzle-orm";

const markReadSchema = v.object({
  notificationId: v.number(),
});

export async function action({ request }: Route.ActionArgs) {
  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("Unauthorized", { status: 401 });
  }

  const parsed = await parseJsonBody(request, markReadSchema);
  if (!parsed.success) {
    throw data("Invalid parameters", { status: 400 });
  }

  const { notificationId } = parsed.data;

  // Verify the notification belongs to the current user
  const notification = db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .get();

  if (!notification) {
    throw data("Notification not found", { status: 404 });
  }

  if (notification.recipientUserId !== currentUserId) {
    throw data("Forbidden", { status: 403 });
  }

  markAsRead(notificationId);

  return { success: true };
}
