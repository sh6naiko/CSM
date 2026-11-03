import {
  IconDownload,
  IconPlus,
  IconSparkles,
} from "../../components/icons.jsx";
import { downloadAiReviewerPdf } from "./reviewerPdf.js";
import React from "react";
export function AiReviewerDialog({
  aiReviewerImporting,
  aiReviewerReady,
  handleImportAiReviewer,
  setAiReviewerReady,
}) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="presentation"
      onClick={() => {
        if (!aiReviewerImporting) setAiReviewerReady(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-reviewer-ready-title"
        aria-describedby="ai-reviewer-ready-description"
        onClick={(event) => event.stopPropagation()}
        className="csm-ai-theme w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
          <IconSparkles className="h-7 w-7" />
        </div>
        <div className="mb-2 flex justify-center">
          <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700">
            AI-generated
          </span>
        </div>
        <h2
          id="ai-reviewer-ready-title"
          className="text-center text-xl font-black tracking-tight text-slate-900"
        >
          Your study reviewer is ready
        </h2>
        <p
          id="ai-reviewer-ready-description"
          className="mt-2 text-center text-sm leading-relaxed text-slate-500"
        >
          Save the AI-generated reviewer PDF to{" "}
          <strong className="text-slate-700">
            {aiReviewerReady.deckTitle}
          </strong>{" "}
          Reference Notes, or download it for offline study.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleImportAiReviewer}
            disabled={!aiReviewerReady.deckId || aiReviewerImporting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f04824] px-4 text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#e03e1b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiReviewerImporting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <IconPlus className="h-4 w-4" />
            )}
            {aiReviewerImporting
              ? "Adding to notes…"
              : "Add to Reference Notes"}
          </button>
          <button
            type="button"
            onClick={() => {
              downloadAiReviewerPdf(aiReviewerReady);
              setAiReviewerReady(null);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            <IconDownload className="h-4 w-4" /> Download PDF
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAiReviewerReady(null)}
          disabled={aiReviewerImporting}
          className="mx-auto mt-4 block px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
