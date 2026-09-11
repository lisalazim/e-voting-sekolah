import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../types/database";

export const CANDIDATE_PHOTO_BUCKET = "candidate-photos";
export const MAX_CANDIDATE_PHOTO_SIZE = 2 * 1024 * 1024;
export const CANDIDATE_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const fileExtensions: Record<(typeof CANDIDATE_PHOTO_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getCandidatePhotoPath(
  schoolId: string,
  candidateId: string,
  file: File,
): string {
  const mimeType = file.type as (typeof CANDIDATE_PHOTO_MIME_TYPES)[number];
  const extension = fileExtensions[mimeType] ?? "jpg";

  return `${schoolId}/${candidateId}/${crypto.randomUUID()}.${extension}`;
}

export function getCandidatePhotoPathFromPublicUrl(
  publicUrl: string | null,
): string | null {
  if (!publicUrl) {
    return null;
  }

  const marker = `/object/public/${CANDIDATE_PHOTO_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

export async function removeCandidatePhoto(
  supabase: SupabaseClient<Database>,
  publicUrl: string | null,
): Promise<void> {
  const path = getCandidatePhotoPathFromPublicUrl(publicUrl);

  if (!path) {
    return;
  }

  await supabase.storage.from(CANDIDATE_PHOTO_BUCKET).remove([path]);
}
