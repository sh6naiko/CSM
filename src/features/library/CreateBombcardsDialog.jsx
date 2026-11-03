import { IconCards, IconSparkles } from "../../components/icons.jsx";
import React from "react";

export function CreateBombcardsDialog({
  handleChooseAiCreation,
  handleChooseManualCreation,
  setIsCreateBombcardsPopupOpen,
  targetDeckForCreateBombcards,
}) {
  const deckName =
    targetDeckForCreateBombcards?.code ||
    targetDeckForCreateBombcards?.title ||
    "your reviewer";

  return (
    <div
      className="csm-modal-backdrop"
      role="presentation"
      onClick={() => setIsCreateBombcardsPopupOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-bombcards-title"
        onClick={(event) => event.stopPropagation()}
        className="csm-ai-theme w-full max-w-md bg-white rounded-[26px] p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col relative"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-extrabold text-[#f04824] uppercase tracking-wider block">
              CREATE BOMBCARDS
            </span>
            <h3
              id="create-bombcards-title"
              className="text-xl font-black text-slate-900 tracking-tight"
            >
              Choose a creation method
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateBombcardsPopupOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer text-xl"
            title="Close"
            aria-label="Close create Bombcards dialog"
          >
            &times;
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Add cards to <strong className="text-slate-700">{deckName}</strong>{" "}
          manually or let Gemini generate a starting set from your notes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={handleChooseManualCreation}
            className="bg-[#f8f9fa] hover:bg-white border border-slate-200/90 hover:border-[#f04824]/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 group-hover:bg-[#f04824] transition-colors shadow-sm">
              <IconCards className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-900 group-hover:text-[#f04824] transition-colors">
                Create manually
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                Write your own questions and answers.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleChooseAiCreation}
            className="bg-[#f8f9fa] hover:bg-[#fff1ec] border border-slate-200/90 hover:border-[#f4a18b] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
          >
            <span className="csm-ai-gradient-icon w-10 h-10 rounded-xl text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <IconSparkles className="w-5 h-5" />
            </span>
            <span>
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900 group-hover:text-[#d93616] transition-colors">
                  Generate with AI
                </span>
                <span className="csm-ai-gradient-badge text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white">
                  Gemini
                </span>
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                Turn notes or PDFs into draft cards.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
