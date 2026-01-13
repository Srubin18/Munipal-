import { createAdminClient } from './supabase/server';

const BUCKET_NAME = 'documents';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  folder: string = 'bills'
): Promise<{ path: string; url: string }> {
  const supabase = createAdminClient();

  const filePath = `${folder}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
