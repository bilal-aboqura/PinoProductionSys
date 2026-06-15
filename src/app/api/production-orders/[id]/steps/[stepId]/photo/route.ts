import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_EVIDENCE_BUCKET, ensureProductionEvidenceBucket, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { writeProductionAuditLog } from "@/features/production-orders/lib/audit";
import { EXECUTE_PRODUCTION_ORDERS, hasProductionOrderPermission } from "@/features/production-orders/lib/permissions";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

function error(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, code, error: message }, { status });
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request, context: { params: Promise<{ id: string; stepId: string }> }) {
  try {
    const session = await getServerSession();
    if (!hasProductionOrderPermission(session.user.permissions, EXECUTE_PRODUCTION_ORDERS)) {
      return error("UNAUTHORIZED", "You do not have permission to upload step photos.", 403);
    }
    const { id, stepId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return error("VALIDATION", "Photo file is required.", 400);
    if (!acceptedTypes.has(file.type)) return error("VALIDATION", "Only JPEG, PNG, and WEBP photos are accepted.", 400);
    if (file.size > maxBytes) return error("VALIDATION", "Photo must be 10 MB or smaller.", 400);

    const order = await prisma.productionOrder.findUnique({ where: { id }, include: { steps: { where: { id: stepId }, take: 1 } } });
    if (!order || order.steps.length === 0) return error("NOT_FOUND", "Order or step not found.", 404);
    if (order.assignedToId !== session.user.id) return error("UNAUTHORIZED", "You are not assigned to this order.", 403);
    if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") {
      return error("VALIDATION", "Photos can only be uploaded before completion.", 400);
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      return error("INTERNAL", "Missing SUPABASE_SECRET_KEY. Add a server-only Supabase secret key to .env.local and restart the dev server.", 500);
    }

    const bucket = await ensureProductionEvidenceBucket(client);
    if (!bucket.success) {
      return error("INTERNAL", `Unable to prepare Supabase bucket: ${bucket.error}`, 500);
    }

    const storagePath = `orders/${id}/steps/${stepId}/${Date.now()}-${randomUUID()}.${extensionFor(file.type)}`;
    const bytes = await file.arrayBuffer();
    const upload = await client.storage.from(PRODUCTION_EVIDENCE_BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false
    });
    if (upload.error) return error("INTERNAL", upload.error.message, 500);

    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.productionOrderStepPhoto.create({
        data: {
          stepId,
          storagePath,
          mimeType: file.type,
          uploadedById: session.user.id
        }
      });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_PHOTO_UPLOADED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId: id,
        orderNumber: order.orderNumber,
        newValue: created
      });
      return created;
    });

    return NextResponse.json({ success: true, data: { id: photo.id, storagePath: photo.storagePath } });
  } catch (caught) {
    const status = caught instanceof Error && caught.message === "UNAUTHORIZED" ? 401 : 500;
    return error(status === 401 ? "UNAUTHORIZED" : "INTERNAL", caught instanceof Error ? caught.message : "Unexpected error.", status);
  }
}
