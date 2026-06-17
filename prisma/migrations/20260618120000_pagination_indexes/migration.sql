-- Supporting indexes for high-volume server-side pagination and filtered counts.
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");
CREATE INDEX "users_isActive_createdAt_idx" ON "users"("isActive", "createdAt");
CREATE INDEX "recipes_updatedAt_idx" ON "recipes"("updatedAt");
CREATE INDEX "production_orders_status_createdAt_idx" ON "production_orders"("status", "createdAt");
CREATE INDEX "inventory_items_isActive_code_idx" ON "inventory_items"("isActive", "code");
CREATE INDEX "production_batches_createdAt_idx" ON "production_batches"("createdAt");
CREATE INDEX "print_history_status_createdAt_idx" ON "print_history"("status", "createdAt");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
