import { createClient } from "@supabase/supabase-js";

export const PRODUCTION_EVIDENCE_BUCKET = "production-evidence";
export const REPORTS_ARCHIVE_BUCKET = "reports-archive";
const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoBytes = 10 * 1024 * 1024;
const reportMimeTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const maxReportBytes = 25 * 1024 * 1024;

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function ensureProductionEvidenceBucket(client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const existing = await client.storage.getBucket(PRODUCTION_EVIDENCE_BUCKET);
  if (!existing.error) {
    return { success: true as const };
  }

  const created = await client.storage.createBucket(PRODUCTION_EVIDENCE_BUCKET, {
    public: false,
    allowedMimeTypes: photoMimeTypes,
    fileSizeLimit: maxPhotoBytes
  });

  if (created.error) {
    return { success: false as const, error: created.error.message };
  }

  return { success: true as const };
}

export async function ensureReportsArchiveBucket(client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const existing = await client.storage.getBucket(REPORTS_ARCHIVE_BUCKET);
  if (!existing.error) {
    return { success: true as const };
  }

  const created = await client.storage.createBucket(REPORTS_ARCHIVE_BUCKET, {
    public: false,
    allowedMimeTypes: reportMimeTypes,
    fileSizeLimit: maxReportBytes
  });

  if (created.error) {
    return { success: false as const, error: created.error.message };
  }

  return { success: true as const };
}
