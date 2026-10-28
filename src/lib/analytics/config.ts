/**
 * OpenPanel (self-hosted analytics). Off unless OPENPANEL_ENABLED=true, so local work and previews send nothing.
 * The client id is public (it ships to the browser); the API URL stays on the server, because the browser only ever
 * talks to this site's own `/api/op` proxy.
 */
export function analyticsConfig() {
  const clientId = process.env.OPENPANEL_CLIENT_ID;
  if (process.env.OPENPANEL_ENABLED !== "true" || !clientId || !process.env.OPENPANEL_API_URL) return null;
  return { clientId, apiUrl: process.env.OPENPANEL_API_URL };
}
