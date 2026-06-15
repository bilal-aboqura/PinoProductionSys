import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProductionLabelPdf } from "@/lib/pdf/simple-label";
import {
  VIEW_ALL_PRODUCTION_ORDERS,
  VIEW_PRODUCTION_ORDERS,
  hasProductionOrderPermission
} from "@/features/production-orders/lib/permissions";

function error(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const { id } = await context.params;
  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const canView = hasProductionOrderPermission(session.user.permissions, VIEW_PRODUCTION_ORDERS);
  if (!canView && !canViewAll) return error("You do not have permission to view this label.", 403);

  const order = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...(canViewAll ? {} : { assignedToId: session.user.id })
    },
    include: { downstreamActions: true }
  });
  if (!order) return error("Order not found.", 404);
  if (order.status !== "COMPLETED") return error("Order must be completed before printing a label.", 400);

  const batch = order.downstreamActions.find((action) => action.actionType === "BATCH_RECORD");
  const label = order.downstreamActions.find((action) => action.actionType === "LABEL_PRINT");
  const pdf = buildProductionLabelPdf({
    orderNumber: order.orderNumber,
    recipeName: order.recipeNameSnapshot,
    batchReference: batch?.referenceId ?? `BATCH-${order.orderNumber}`,
    labelReference: label?.referenceId ?? `LABEL-${order.orderNumber}`,
    producedQuantity: order.producedQuantity?.toString() ?? "0",
    yieldUnit: order.yieldUnit,
    completedAt: order.completedAt?.toISOString() ?? ""
  });

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.orderNumber}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
