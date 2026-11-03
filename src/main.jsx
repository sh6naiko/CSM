import { CSM } from "./services/client.js";
import { App } from "./App.jsx";
import {
  renderAdminAccessDenied,
  renderSharedDeckUnavailable,
} from "./bootstrap/errors.js";
import { WorkspaceErrorBoundary } from "./components/WorkspaceErrorBoundary.jsx";
import React from "react";
import ReactDOM from "react-dom";
(async function bootstrap() {
  const root = document.getElementById("root");
  const shareToken =
    window.CSM_GUEST_SHARE_TOKEN ||
    window.location.pathname.match(/\/shared\/deck\/([a-zA-Z0-9_-]+)/i)?.[1] ||
    new URLSearchParams(window.location.search).get("share_token") ||
    new URLSearchParams(window.location.search).get("token");
  if (shareToken) {
    try {
      const res = await fetch(
        `api/index.php?r=shared/deck&token=${encodeURIComponent(shareToken)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.deck) {
        throw new Error(
          data.error || "This shared reviewer deck is unavailable.",
        );
      }
      const sharedDeck = {
        ...data.deck,
        code: data.deck.code || data.deck.title,
        owner: data.deck.owner || "Shared Reviewer",
        section: "recent",
        share: data.share || {
          token: shareToken,
          isActive: true,
          url: window.location.href,
        },
      };
      let session = {
        authenticated: false,
      };
      try {
        session = await CSM.api("auth/session");
      } catch {
        session = {
          authenticated: false,
        };
      }
      const isGuest = !session.authenticated;
      const profile =
        session.authenticated && session.profile
          ? session.profile
          : {
              displayName: "Guest Student",
              username: "guest",
              role: "guest",
              avatar: "ember",
            };
      window.CSM.isGuest = isGuest;
      if (session.authenticated) CSM.startIdleMonitor();
      window.CSM.guestSharedDeck = sharedDeck;
      window.CSM.initial = {
        profile,
        decks: [sharedDeck],
        stats: {
          totalDecks: 1,
          totalCards: sharedDeck.cards?.length || 0,
          totalDocuments: sharedDeck.documents?.length || 0,
        },
      };
      root.classList.remove("csm-startup-root");
      root.removeAttribute("aria-busy");
      ReactDOM.render(
        <WorkspaceErrorBoundary>
          <App isGuest={isGuest} sharedDeck={sharedDeck} />
        </WorkspaceErrorBoundary>,
        root,
      );
      window.__CSM_APP_READY__ = true;
    } catch (error) {
      window.__CSM_APP_READY__ = true;
      renderSharedDeckUnavailable(error.message);
    }
    return;
  }
  CSM.api("auth/session")
    .then(async (session) => {
      const adminPath = /\/admin\/?$/i.test(window.location.pathname);
      if (!session.authenticated) {
        const reason =
          session.reason || (session.timedOut ? "idle_timeout" : "");
        window.location.replace(
          `login.html?mode=signin${adminPath ? "&next=admin" : ""}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`,
        );
        return;
      }
      if (
        adminPath &&
        !["admin", "superadmin"].includes(session.profile?.role)
      ) {
        renderAdminAccessDenied();
        return;
      }
      window.CSM.adminUrl = session.adminUrl || "admin";
      CSM.initial = await CSM.api("workspace");
      CSM.startIdleMonitor();
      root.classList.remove("csm-startup-root");
      root.removeAttribute("aria-busy");
      ReactDOM.render(
        <WorkspaceErrorBoundary>
          <App isGuest={false} sharedDeck={null} />
        </WorkspaceErrorBoundary>,
        root,
      );
      window.__CSM_APP_READY__ = true;
    })
    .catch((error) => {
      window.__CSM_APP_READY__ = true;
      root.innerHTML = `<div style="margin:auto;padding:24px;max-width:560px;background:white;border:1px solid #dbe3ee;border-radius:16px;color:#18233a;font:16px system-ui"><h2>Workspace unavailable</h2><p>${String(
        error.message || "Could not load your account data.",
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
      )}</p><button onclick="location.href='login.html'">Back to sign in</button></div>`;
    });
})();
