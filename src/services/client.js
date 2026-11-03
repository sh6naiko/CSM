// api.js is loaded before the application bundle on both workspace entry pages.
// Keep its session, CSRF and idle-monitor behavior in one shared client.
export const CSM = window.CSM;
