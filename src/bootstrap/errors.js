export function renderSharedDeckUnavailable(msg) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="width:100%;height:100vh;background:#f6f8fb;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
      <div style="background:#fff;border:1px solid #dce5ee;border-radius:20px;box-shadow:0 20px 45px rgba(15,23,42,0.1);max-width:440px;width:100%;padding:32px 28px;text-align:center;">
        <div style="width:58px;height:58px;border-radius:16px;background:#fff1ee;border:1px solid #ffd7cf;color:#f04824;display:grid;place-items:center;margin:0 auto 16px;">
          <svg style="width:28px;height:28px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <span style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#f04824;text-transform:uppercase;">SHARED REVIEWER</span>
        <h2 style="font-size:20px;font-weight:800;color:#18233a;margin:6px 0 10px;font-family:'Outfit',sans-serif;">Reviewer Deck Unavailable</h2>
        <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 24px;">${String(
          msg ||
            "This deck link may have been deactivated by its owner or does not exist.",
        ).replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        )}</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="login.html" style="display:block;width:100%;padding:11px 16px;background:#f04824;color:#fff;font-weight:700;font-size:12px;border-radius:12px;text-decoration:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(240,72,36,0.25);">
            Sign In to Co-StudyMaxx
          </a>
          <a href="login.html?mode=signup" style="display:block;width:100%;padding:11px 16px;background:#f1f5f9;color:#334155;font-weight:700;font-size:12px;border-radius:12px;text-decoration:none;box-sizing:border-box;">
            Create Free Account
          </a>
        </div>
      </div>
    </div>
  `;
}
export function renderAdminAccessDenied() {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML =
    '<div style="width:100%;height:100vh;background:#f6f8fb;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif"><div style="max-width:440px;width:100%;padding:32px;border:1px solid #dce5ee;border-radius:20px;background:#fff;box-shadow:0 20px 45px rgba(15,23,42,.1);text-align:center"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#f04824;text-transform:uppercase">Restricted area</div><h2 style="margin:8px 0 10px;color:#18233a">Administrator access required</h2><p style="margin:0 0 22px;color:#64748b;line-height:1.6">This access path is reserved for authorized administrators.</p><a href="index.html" style="display:inline-block;padding:11px 18px;border-radius:12px;background:#f04824;color:#fff;font-weight:700;text-decoration:none">Return to workspace</a></div></div>';
}
