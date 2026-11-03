import { IconArrowRight, IconLock } from "../icons.jsx";
import React from "react";
export function GuestLockedModal({ section, onClose }) {
  if (!section) return null;
  const configs = {
    home: {
      title: "Home Dashboard is Locked",
      kicker: "GUEST ACCESS",
      description:
        "The personalized overview, study streak analytics, and activity history are available for registered members.",
    },
    creator: {
      title: "Deck Creator is Locked",
      kicker: "GUEST ACCESS",
      description:
        "Creating custom Bombcard decks, building new reviewer questions, and importing study notes requires a free Co-StudyMaxx account.",
    },
    profile: {
      title: "Account Profile is Locked",
      kicker: "GUEST ACCESS",
      description:
        "Profile customizations, avatars, password management, and study statistics are only accessible to signed-in accounts.",
    },
    arena: {
      title: "Bombstyle Challenge is Locked",
      kicker: "SIGN IN TO PLAY",
      description:
        "Timed pressure recall rounds and personal score tracking require an account. Sign in or create a free account to unlock Play Bombstyle!",
    },
  };
  const info = configs[section] || configs.home;
  return (
    <div className="csm-locked-modal-overlay animate-fadeIn" onClick={onClose}>
      <div
        className="csm-locked-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-modal-title"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#fff1ee] border border-[#ffd7cf] text-[#f04824] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <IconLock className="w-6 h-6" />
        </div>

        <span className="csm-kicker text-[#f04824] tracking-widest text-[10px] font-extrabold uppercase">
          {info.kicker}
        </span>
        <h2
          id="locked-modal-title"
          className="text-xl font-extrabold text-slate-800 font-display mt-1 mb-2"
        >
          {info.title}
        </h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {info.description}
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href="login.html?mode=signup"
            className="w-full py-2.5 px-4 bg-[#f04824] hover:bg-[#e03e1b] text-white font-bold text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Create Free Account</span>
            <IconArrowRight />
          </a>
          <a
            href="login.html?mode=signin"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all text-center"
          >
            Sign In with Existing Account
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mt-1"
          >
            Continue Reviewing Deck
          </button>
        </div>
      </div>
    </div>
  );
}
