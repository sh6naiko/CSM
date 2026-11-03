import React, { useEffect, useState } from "react";
import { CSM } from "../../services/client.js";
import { IconPlay } from "../../components/icons.jsx";
import { ProgressBar } from "../../components/ui/ProgressBar.jsx";

export function DailyStudyGoal({ onStudy }) {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let disposed = false;
    let request;
    let midnightTimer;
    const load = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      setLoading(true);
      setError("");
      try {
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const result = await CSM.api(
          `study/daily-goal&timezone=${encodeURIComponent(timezone)}`,
          "GET",
          undefined,
          { signal: controller.signal },
        );
        if (disposed || controller.signal.aborted) return;
        setGoal(result);
        window.clearTimeout(midnightTimer);
        const untilReset = Date.parse(result.resetsAt) - Date.now();
        if (untilReset > 0)
          midnightTimer = window.setTimeout(
            load,
            Math.min(untilReset + 100, 2147483647),
          );
      } catch (failure) {
        if (!disposed && !controller.signal.aborted)
          setError(failure.message || "Could not load your study goal.");
      } finally {
        if (!disposed && !controller.signal.aborted) setLoading(false);
      }
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) load();
    };
    load();
    const interval = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("csm:study-reviewed", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      disposed = true;
      request?.abort();
      window.clearTimeout(midnightTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("csm:study-reviewed", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [retry]);

  const ready = !loading && !error && goal;
  const target = goal?.target || 20;
  const percent = ready ? goal.percent : 0;
  return (
    <section
      className="csm-daily-goal-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between"
      aria-labelledby="daily-study-goal-title"
    >
      <div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#f04824]">
          DAILY FOCUS
        </span>
        <h2
          id="daily-study-goal-title"
          className="text-xl font-bold text-zinc-900 mt-1"
        >
          Today's Study Goal
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Review {target} different Bombcards today across your decks.
        </p>
        <div
          className="my-5 p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-orange-50/40 border border-zinc-100 flex items-center justify-between"
          aria-live="polite"
          aria-busy={loading}
        >
          <div>
            <div className="text-2xl font-black text-zinc-900">
              {ready ? goal.reviewed : "—"}{" "}
              <span className="text-sm font-semibold text-zinc-400">
                / {target} cards
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-500">
              {loading ? (
                "Loading today’s reviews…"
              ) : error ? (
                "Progress unavailable"
              ) : percent >= 100 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                  <i className="bi bi-check-circle-fill" /> Goal accomplished
                  today!
                </span>
              ) : (
                `${Math.max(0, target - (goal?.reviewed || 0))} more cards to hit goal`
              )}
            </span>
          </div>
          <span className="text-lg font-black text-[#f04824]">
            {ready ? `${percent}%` : "—"}
          </span>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600 mb-3">
            {error}{" "}
            <button
              type="button"
              className="underline font-bold"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        <ProgressBar
          value={percent}
          label="Today's study goal"
          fillAs="div"
          className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden mb-3"
          fillClassName="bg-gradient-to-r from-orange-500 to-[#f04824] h-2.5 rounded-full transition-all duration-500"
        />
        <p className="text-[11px] text-zinc-500 leading-relaxed inline-flex items-center gap-1.5">
          <i className="bi bi-lightbulb-fill text-amber-500 shrink-0" />
          <span>
            Reveal an answer in Study or answer in Challenge. Each Bombcard counts
            once per day, in your local time zone.
          </span>
        </p>
        {ready && goal.arenaIncluded === false && (
          <p className="text-[11px] text-amber-700 mt-2" role="status">
            Challenge review history is temporarily unavailable; Study reviews still count.
          </p>
        )}
      </div>
      <div className="pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onStudy}
          className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <IconPlay className="w-3.5 h-3.5 text-[#f04824]" />
          <span>Study Bombcards</span>
        </button>
      </div>
    </section>
  );
}
