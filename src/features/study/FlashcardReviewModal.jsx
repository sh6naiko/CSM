import { CSM } from "../../services/client.js";
import { IconClose, IconTrophy } from "../../components/icons.jsx";
import React, { useState } from "react";
export function FlashcardReviewModal({
  deck,
  cards,
  onClose,
  onFinish,
  onJumpToPage,
  triggerToast,
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [completed, setCompleted] = useState(false);
  const total = cards?.length || 0;
  const card = cards?.[index];
  const handleRate = async (rating) => {
    if (!card) return;
    try {
      await CSM.api("study-cards/review", "POST", {
        cardId: card.id,
        rating,
      });
      setRatings((prev) => ({
        ...prev,
        [rating]: prev[rating] + 1,
      }));
      if (index + 1 < total) {
        setIndex(index + 1);
        setFlipped(false);
      } else {
        setCompleted(true);
        if (onFinish) onFinish();
      }
    } catch (err) {
      triggerToast("Review progress not saved: " + err.message);
    }
  };
  if (!card && !completed) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block">
              Flashcard Study Session
            </span>
            <h3 className="font-black text-slate-900 text-base">
              {deck?.title || "Review Deck"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
            title="Close review session"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {completed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
              <IconTrophy className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-black text-slate-900">
              Deck Review Complete!
            </h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              You reviewed all {total} cards in this deck. Spaced repetition
              schedules have been updated!
            </p>
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto py-2">
              <div className="bg-red-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-red-600 block">
                  {ratings.again}
                </span>
                <span className="text-[9px] text-red-500 uppercase font-black">
                  Again
                </span>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-amber-600 block">
                  {ratings.hard}
                </span>
                <span className="text-[9px] text-amber-500 uppercase font-black">
                  Hard
                </span>
              </div>
              <div className="bg-blue-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-blue-600 block">
                  {ratings.good}
                </span>
                <span className="text-[9px] text-blue-500 uppercase font-black">
                  Good
                </span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl text-center">
                <span className="text-xs font-bold text-emerald-600 block">
                  {ratings.easy}
                </span>
                <span className="text-[9px] text-emerald-500 uppercase font-black">
                  Easy
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setFlipped(false);
                  setCompleted(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-black text-xs text-white shadow-sm cursor-pointer"
              >
                Back to Document
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>
                  Card {index + 1} of {total}
                </span>
                <span>{Math.round((index / total) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((index + 1) / total) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* The Flashcard itself */}
            <div
              onClick={() => setFlipped(!flipped)}
              className="min-h-56 p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer flex flex-col justify-between shadow-xs select-none relative group"
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>{flipped ? "Back • Answer" : "Front • Question"}</span>
                {card.source_page && (
                  <span className="text-purple-600 font-bold">
                    Page {card.source_page}
                  </span>
                )}
              </div>

              <div className="my-auto py-4 text-center">
                {!flipped ? (
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                    {card.question}
                  </h4>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-base font-black text-purple-950 leading-snug">
                      {card.answer}
                    </h4>
                    {card.explanation && (
                      <p className="text-xs text-slate-600 italic mt-2">
                        {card.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] font-bold text-slate-400">
                {!flipped
                  ? "Tap or click to reveal answer"
                  : "Choose your recall difficulty below"}
              </div>
            </div>

            {/* Rating Buttons */}
            {!flipped ? (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs transition-all shadow-sm cursor-pointer"
              >
                Reveal Answer (Space)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate("again")}
                    className="py-2.5 px-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Again</span>
                    <span className="text-[9px] opacity-75">&lt;10m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate("hard")}
                    className="py-2.5 px-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Hard</span>
                    <span className="text-[9px] opacity-75">1d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate("good")}
                    className="py-2.5 px-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Good</span>
                    <span className="text-[9px] opacity-75">3d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate("easy")}
                    className="py-2.5 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                  >
                    <span className="block font-black">Easy</span>
                    <span className="text-[9px] opacity-75">6d</span>
                  </button>
                </div>
                {card.source_page && onJumpToPage && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToPage(Number(card.source_page));
                        onClose();
                      }}
                      className="text-[11px] text-purple-600 hover:underline font-bold cursor-pointer"
                    >
                      Jump to source on page {card.source_page} in PDF ↗
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
