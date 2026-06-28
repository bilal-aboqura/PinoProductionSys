import { NextResponse } from "next/server";
import { buildTraceabilityUrl } from "@/features/batches/qr";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProductionLabelPdf } from "@/lib/pdf/simple-label";
import type { PrintPayload } from "@/features/printing/types";
import {
  VIEW_ALL_PRODUCTION_ORDERS,
  VIEW_PRODUCTION_ORDERS,
  hasProductionOrderPermission
} from "@/features/production-orders/lib/permissions";

function error(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function publicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function decimalToString(value: { toString(): string } | null | undefined) {
  return value == null ? undefined : value.toString();
}

function servingSize(order: {
  recipeVersion: {
    servingQuantity: { toString(): string } | null;
    servingUnit: string | null;
    servingLabel: string | null;
  };
}) {
  const { servingQuantity, servingUnit, servingLabel } = order.recipeVersion;
  if (!servingQuantity) return undefined;
  return `${servingQuantity.toString()} ${servingUnit ?? ""}${servingLabel ? ` (${servingLabel})` : ""}`.trim();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestUrl = new URL(request.url);
  const { id } = await context.params;
  const orderTraceabilityTarget = await prisma.productionOrder.findUnique({
    where: { id },
    include: { productionBatch: { include: { containers: { orderBy: { containerNumber: "asc" } } } } }
  });
  const productionBatch = orderTraceabilityTarget?.productionBatch;
  if (productionBatch && !requestUrl.searchParams.has("pdf")) {
    const requestedContainer = requestUrl.searchParams.get("container");
    const container = requestedContainer
      ? productionBatch.containers.find((item) => item.id === requestedContainer || item.containerNumber === requestedContainer)
      : null;
    return NextResponse.redirect(
      buildTraceabilityUrl(
        productionBatch.batchNumber,
        "ar",
        requestUrl.origin,
        container?.containerNumber
      )
    );
  }

  const session = await getServerSession();
  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const canView = hasProductionOrderPermission(session.user.permissions, VIEW_PRODUCTION_ORDERS);
  if (!canView && !canViewAll) return error("You do not have permission to view this label.", 403);

  const order = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...(canViewAll ? {} : { assignedToId: session.user.id })
    },
    include: {
      downstreamActions: true,
      recipe: true,
      recipeVersion: true,
      productionBatch: { include: { warehouse: true } }
    }
  });
  if (!order) return error("Order not found.", 404);
  if (order.status !== "COMPLETED") return error("Order must be completed before printing a label.", 400);

  const batch = order.downstreamActions.find((action) => action.actionType === "BATCH_RECORD");
  const label = order.downstreamActions.find((action) => action.actionType === "LABEL_PRINT");
  const batchReference = order.productionBatch?.batchNumber ?? batch?.referenceId ?? `BATCH-${order.orderNumber}`;
  const traceUrl = order.productionBatch
    ? `${publicBaseUrl()}/inventory/batches/${encodeURIComponent(order.productionBatch.batchNumber)}?view=scan`
    : `${publicBaseUrl()}/production-orders/${encodeURIComponent(order.id)}`;
  const payload: Omit<PrintPayload, "qrCodeImage"> = {
    title: order.recipeNameSnapshot,
    subtitle: "BATCH LABEL",
    productName: order.recipeNameSnapshot,
    batchNumber: batchReference,
    warehouseName: order.productionBatch?.warehouse.name,
    productionDate: order.productionBatch?.productionDate.toISOString() ?? order.completedAt?.toISOString(),
    expiryDate: order.productionBatch?.expiryDate.toISOString(),
    quantity: order.productionBatch?.producedQuantity.toString() ?? order.producedQuantity?.toString(),
    unit: order.productionBatch?.unit ?? order.yieldUnit,
    storageInstructions: order.recipe.storageNotes,
    servingSize: servingSize(order),
    caloriesPerServing: decimalToString(order.recipeVersion.caloriesPerServing),
    caloriesPerUnit: decimalToString(order.recipeVersion.caloriesPerYieldUnit),
    totalCalories: decimalToString(order.recipeVersion.totalCalories),
    costPerUnit: decimalToString(order.recipeVersion.costPerYieldUnit),
    totalCost: decimalToString(order.recipeVersion.totalCost),
    sellingPrice: decimalToString(order.recipeVersion.sellingPriceSnapshot),
    profit: decimalToString(order.recipeVersion.profitAmountSnapshot),
    margin: decimalToString(order.recipeVersion.profitMarginSnapshot),
    qrCodeData: traceUrl
  };
  const pdf = await buildProductionLabelPdf({
    payload,
    orderNumber: order.orderNumber,
    labelReference: label?.referenceId ?? `LABEL-${order.orderNumber}`,
    completedAt: order.completedAt?.toISOString() ?? ""
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.orderNumber}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
