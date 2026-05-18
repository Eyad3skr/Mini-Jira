/** Express 5 types params as string | string[]; our routes use a single segment. */
export function routeParam(value: string | string[] | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? (value[0] ?? '') : value;
}
