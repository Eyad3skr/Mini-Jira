import { apiFetch } from './api';
import type { Task } from './types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateTaskImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Use JPEG, PNG, WebP, or GIF';
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 5 MB or smaller';
  }
  return null;
}

export async function uploadTaskImage(taskId: string, file: File): Promise<void> {
  const err = validateTaskImageFile(file);
  if (err) throw new Error(err);

  const { uploadUrl } = await apiFetch<{ uploadUrl: string; key: string; version: number }>(
    `/api/tasks/${taskId}/image/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name.replace(/[^\w.-]+/g, '_'),
        contentType: file.type,
      }),
    }
  );

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }
}

/** Poll until Lambda writes resizedKey and API returns imageUrl. */
export async function waitForTaskImage(
  taskId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<Task> {
  const maxAttempts = options.maxAttempts ?? 15;
  const intervalMs = options.intervalMs ?? 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const task = await apiFetch<Task>(`/api/tasks/${taskId}`);
    if (task.imageUrl) return task;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return apiFetch<Task>(`/api/tasks/${taskId}`);
}
