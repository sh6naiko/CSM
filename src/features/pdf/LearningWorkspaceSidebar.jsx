import {
  IconBulb,
  IconCards,
  IconClose,
  IconEdit,
  IconFileText,
  IconHighlighter,
  IconPlay,
  IconSparkles,
  IconTrash,
} from "../../components/icons.jsx";
import React, { useMemo, useState } from "react";
export function LearningWorkspaceSidebar({
  activeTab,
  setActiveTab,
  activeDocument,
  pdfPage,
  setPdfPage,
  pdfSelection,
  setPdfSelection,
  // AI assist
  aiThinking,
  aiAssistantResponse,
  setAiAssistantResponse,
  aiExplainLevel,
  setAiExplainLevel,
  onAiExplain,
  onAiSummarize,
  onAiQuestions,
  onAiNotes,
  onAiFlashcards,
  onAiAsk,
  // Notes
  documentNotes,
  documentNotesLoading,
  noteComposerOpen,
  setNoteComposerOpen,
  noteFormTitle,
  setNoteFormTitle,
  noteFormContent,
  setNoteFormContent,
  noteFormPage,
  setNoteFormPage,
  noteEditingId,
  setNoteEditingId,
  onSaveNote,
  onDeleteNote,
  // Flashcards
  studyDecks,
  activeStudyDeckId,
  setActiveStudyDeckId,
  onCreateStudyDeck,
  studyCards,
  studyCardsLoading,
  cardComposerOpen,
  setCardComposerOpen,
  cardFormQuestion,
  setCardFormQuestion,
  cardFormAnswer,
  setCardFormAnswer,
  cardFormExplanation,
  setCardFormExplanation,
  cardFormTags,
  setCardFormTags,
  cardFormSourcePage,
  setCardFormSourcePage,
  onSaveStudyCard,
  onDeleteStudyCard,
  onStartFlashcardReview,
  // Highlights
  highlights,
  highlightColor,
  setHighlightColor,
  savePdfSelection,
  createPdfBombcard,
  handleRemoveHighlight,
  handleClearHighlights,
  pdfSaving,
  pdfCardComposerOpen,
  setPdfCardComposerOpen,
  pdfSelectionRole,
  setPdfSelectionRole,
  pdfCounterpart,
  setPdfCounterpart,
  onOpenAiGenerator,
  triggerToast,
}) {
  const [notesFilter, setNotesFilter] = useState("");
  const [notesPageOnly, setNotesPageOnly] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const activeDeck =
    (studyDecks || []).find((d) => d.id === activeStudyDeckId) ||
    studyDecks?.[0];

  // Filtered notes
  const filteredNotes = (documentNotes || []).filter((n) => {
    if (notesPageOnly && Number(n.page_number) !== Number(pdfPage))
      return false;
    if (notesFilter.trim()) {
      const q = notesFilter.toLowerCase();
      return (
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Flashcards mastery breakdown
  const masteryStats = useMemo(() => {
    const total = (studyCards || []).length;
    let mastered = 0,
      known = 0,
      learning = 0,
      newCards = 0;
    (studyCards || []).forEach((c) => {
      const st = c.review?.review_status || "new";
      if (st === "mastered") mastered++;
      else if (st === "known") known++;
      else if (st === "learning") learning++;
      else newCards++;
    });
    return {
      total,
      mastered,
      known,
      learning,
      newCards,
    };
  }, [studyCards]);
  return (
    <aside className="csm-highlights-card csm-pdf-notes-panel flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* 3 Vaia-Style Study Rail Tabs Header */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "flashcards" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <IconCards className="w-4 h-4" />
          <span>Cards</span>
          {studyCards?.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "flashcards" ? "bg-purple-800 text-white" : "bg-slate-200 text-slate-700"}`}
            >
              {studyCards.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "notes" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <IconFileText className="w-4 h-4" />
          <span>Notes</span>
          {documentNotes?.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "notes" ? "bg-purple-800 text-white" : "bg-slate-200 text-slate-700"}`}
            >
              {documentNotes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("highlights")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "highlights" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <IconHighlighter className="w-4 h-4" />
          <span>Marks</span>
          {highlights?.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "highlights" ? "bg-purple-800 text-white" : "bg-slate-200 text-slate-700"}`}
            >
              {highlights.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 2: Document Notes */}
      {activeTab === "notes" && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          {/* Header & Note Creator Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Document Notes
              </h3>
              <p className="text-[10px] text-slate-500">
                Persisted study notes linked to this PDF
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNoteFormTitle(`Note on Page ${pdfPage}`);
                setNoteFormContent(
                  pdfSelection ? `“${pdfSelection.text}”\n\n` : "",
                );
                setNoteFormPage(pdfPage);
                setNoteEditingId(null);
                setNoteComposerOpen(true);
              }}
              className="py-1 px-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>+ Add Note</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={notesFilter}
              onChange={(e) => setNotesFilter(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setNotesPageOnly(!notesPageOnly)}
              className={`px-2 py-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${notesPageOnly ? "bg-purple-600 text-white border-purple-600" : "bg-slate-100 text-slate-600 border-slate-200"}`}
            >
              Page {pdfPage} only
            </button>
          </div>

          {/* Note Composer Modal / Inline Box */}
          {noteComposerOpen && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3 space-y-2.5 animate-fadeIn">
              <span className="text-[11px] font-extrabold text-purple-900 block">
                {noteEditingId
                  ? "Edit Document Note"
                  : "Create New Document Note"}
              </span>
              <input
                type="text"
                value={noteFormTitle}
                onChange={(e) => setNoteFormTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-bold"
              />
              <textarea
                rows="4"
                value={noteFormContent}
                onChange={(e) => setNoteFormContent(e.target.value)}
                placeholder="Write your notes, insights, or takeaways here..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <span>Linked to Page:</span>
                  <input
                    type="number"
                    min="1"
                    value={noteFormPage || 1}
                    onChange={(e) => setNoteFormPage(Number(e.target.value))}
                    className="w-12 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNoteComposerOpen(false)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!noteFormContent.trim())
                        return triggerToast("Note content cannot be empty.");
                      onSaveNote({
                        id: noteEditingId,
                        title: noteFormTitle.trim() || "Untitled Note",
                        content: noteFormContent.trim(),
                        page: noteFormPage || pdfPage,
                      });
                      setNoteComposerOpen(false);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List */}
          {documentNotesLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading notes…
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
              No notes found. Highlight text in the PDF with the Magic Marker to
              add notes, or click <strong>+ Add Note</strong> above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotes.map((note) => (
                <article
                  key={note.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5 group hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-xs truncate flex-1">
                      {note.title}
                    </span>
                    <div className="flex items-center gap-1">
                      {note.page_number && (
                        <button
                          type="button"
                          onClick={() => setPdfPage(Number(note.page_number))}
                          className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer"
                          title="Jump to this page in the PDF"
                        >
                          Page {note.page_number} ↗
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNoteEditingId(note.id);
                          setNoteFormTitle(note.title);
                          setNoteFormContent(note.content);
                          setNoteFormPage(note.page_number);
                          setNoteComposerOpen(true);
                        }}
                        className="text-slate-400 hover:text-purple-600 text-xs p-1 cursor-pointer"
                        title="Edit note"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="text-slate-400 hover:text-red-600 text-xs p-1 cursor-pointer"
                        title="Delete note"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Study Flashcards & Decks */}
      {activeTab === "flashcards" && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          {/* Deck selector & Practice CTA */}
          <div className="space-y-2 bg-slate-50/80 border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Study Deck
              </span>
              <button
                type="button"
                onClick={() => setNewDeckOpen(!newDeckOpen)}
                className="text-[11px] text-purple-600 font-bold hover:underline cursor-pointer"
              >
                + New Deck
              </button>
            </div>

            {/* Deck dropdown */}
            {(studyDecks || []).length > 0 && (
              <select
                value={activeStudyDeckId || ""}
                onChange={(e) => setActiveStudyDeckId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-purple-500"
              >
                {(studyDecks || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.card_count || 0} cards)
                  </option>
                ))}
              </select>
            )}

            {/* New Deck Inline Form */}
            {newDeckOpen && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="New deck name..."
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-xl bg-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newDeckTitle.trim()) return;
                    if (await onCreateStudyDeck(newDeckTitle)) {
                      setNewDeckTitle("");
                      setNewDeckOpen(false);
                    }
                  }}
                  className="px-2.5 py-1 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Create
                </button>
              </div>
            )}

            {/* Mastery breakdown bar */}
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>{masteryStats.total} Total Cards</span>
                <span className="text-emerald-700 font-extrabold">
                  {masteryStats.mastered} Mastered
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${masteryStats.total ? (masteryStats.mastered / masteryStats.total) * 100 : 0}%`,
                  }}
                  className="bg-emerald-500 h-full"
                  title="Mastered"
                />
                <div
                  style={{
                    width: `${masteryStats.total ? (masteryStats.known / masteryStats.total) * 100 : 0}%`,
                  }}
                  className="bg-blue-500 h-full"
                  title="Known"
                />
                <div
                  style={{
                    width: `${masteryStats.total ? (masteryStats.learning / masteryStats.total) * 100 : 0}%`,
                  }}
                  className="bg-amber-500 h-full"
                  title="Learning"
                />
              </div>
            </div>

            {/* Big Launch Review Button */}
            <button
              type="button"
              onClick={() => onStartFlashcardReview(activeDeck)}
              disabled={!studyCards?.length}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <IconPlay className="w-3.5 h-3.5 fill-current" />
              <span>Practice Flashcards ({studyCards?.length || 0})</span>
            </button>
          </div>

          {/* Add Manual Card Toggle & AI Generator */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900">
              Deck Flashcards
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenAiGenerator && (
                <button
                  type="button"
                  onClick={onOpenAiGenerator}
                  className="py-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 border border-purple-200"
                  title="Generate flashcards from document with AI"
                >
                  <IconSparkles className="w-3 h-3 text-purple-600" />
                  <span>Generate AI Cards</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCardFormQuestion(pdfSelection ? pdfSelection.text : "");
                  setCardFormAnswer("");
                  setCardFormExplanation("");
                  setCardFormTags("");
                  setCardFormSourcePage(pdfPage);
                  setCardComposerOpen(true);
                }}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                + Add Card
              </button>
            </div>
          </div>

          {/* Card Composer Box */}
          {cardComposerOpen && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 space-y-2 animate-fadeIn">
              <span className="text-[11px] font-extrabold text-purple-900 block">
                Create Flashcard
              </span>
              <input
                type="text"
                value={cardFormQuestion}
                onChange={(e) => setCardFormQuestion(e.target.value)}
                placeholder="Question / Front of card..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold"
              />
              <textarea
                rows="2"
                value={cardFormAnswer}
                onChange={(e) => setCardFormAnswer(e.target.value)}
                placeholder="Answer / Back of card..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                value={cardFormExplanation}
                onChange={(e) => setCardFormExplanation(e.target.value)}
                placeholder="Memory cue or explanation (optional)..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
              />
              <input
                type="text"
                value={cardFormTags}
                onChange={(e) => setCardFormTags(e.target.value)}
                placeholder="Tags (comma separated, e.g. Concept, Exam)..."
                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-bold">
                  Source: Page {cardFormSourcePage || pdfPage}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCardComposerOpen(false)}
                    className="px-2 py-1 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cardFormQuestion.trim() || !cardFormAnswer.trim())
                        return triggerToast(
                          "Please enter both question and answer.",
                        );
                      onSaveStudyCard({
                        deckId: activeStudyDeckId,
                        question: cardFormQuestion.trim(),
                        answer: cardFormAnswer.trim(),
                        explanation: cardFormExplanation.trim(),
                        tags: cardFormTags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                        sourceDocumentId: activeDocument?.id,
                        sourcePage: cardFormSourcePage || pdfPage,
                      });
                      setCardComposerOpen(false);
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save Card
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards List */}
          {studyCardsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading cards…
            </div>
          ) : (studyCards || []).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
              No flashcards in this deck yet. Highlight text in the PDF with the
              Magic Marker to create flashcards, or click{" "}
              <strong>+ Add Card</strong> above.
            </div>
          ) : (
            <div className="space-y-2">
              {studyCards.map((c) => {
                const status = c.review?.review_status || "new";
                const statusColor =
                  status === "mastered"
                    ? "bg-emerald-100 text-emerald-800"
                    : status === "known"
                      ? "bg-blue-100 text-blue-800"
                      : status === "learning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600";
                return (
                  <article
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs flex-1">
                        {c.question}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusColor}`}
                        >
                          {status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteStudyCard(c.id)}
                          className="text-slate-400 hover:text-red-600 text-xs p-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-purple-700 bg-purple-50/50 p-2 rounded-lg border border-purple-100/60">
                      {c.answer}
                    </div>
                    {c.explanation && (
                      <p className="text-[11px] text-slate-500 italic">
                        {c.explanation}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {c.source_page && (
                        <button
                          type="button"
                          onClick={() => setPdfPage(Number(c.source_page))}
                          className="text-purple-600 hover:underline font-bold cursor-pointer"
                        >
                          Page {c.source_page} ↗
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Color Highlights & Bombcard Maker (Preserved & Integrated) */}
      {activeTab === "highlights" && (
        <div className="p-4 flex-1 overflow-y-auto custom-scroll space-y-3.5">
          <div className="csm-pdf-notes-heading flex items-center justify-between">
            <div>
              <span className="csm-kicker">MAGIC MARKERS</span>
              <h2 className="text-sm font-bold">
                {highlights.length} saved{" "}
                {highlights.length === 1 ? "highlight" : "highlights"}
              </h2>
            </div>
            <button
              type="button"
              className="csm-row-menu"
              onClick={handleClearHighlights}
              disabled={!activeDocument || !highlights.length}
            >
              Clear
            </button>
          </div>

          {pdfSelection ? (
            <section className="csm-pdf-selection-card">
              <div className="csm-pdf-selection-label">
                <span
                  className="csm-selection-dot"
                  style={{
                    background: highlightColor,
                  }}
                />
                SELECTED TEXT · PAGE {pdfSelection.page}
              </div>
              <blockquote>“{pdfSelection.text}”</blockquote>
              <div className="csm-pdf-selection-actions">
                <button
                  type="button"
                  className="csm-secondary-button"
                  onClick={savePdfSelection}
                  disabled={pdfSaving}
                >
                  Save highlight
                </button>
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => {
                    setPdfCardComposerOpen((value) => !value);
                    setPdfCounterpart("");
                  }}
                  disabled={pdfSaving}
                >
                  {pdfCardComposerOpen ? "Close card form" : "Make a Bombcard"}
                </button>
              </div>
              {pdfCardComposerOpen && (
                <div className="csm-pdf-card-composer">
                  <strong>Use this excerpt as the…</strong>
                  <div className="csm-pdf-role-switch" role="group">
                    <button
                      type="button"
                      className={
                        pdfSelectionRole === "question" ? "active" : ""
                      }
                      onClick={() => {
                        setPdfSelectionRole("question");
                        setPdfCounterpart("");
                      }}
                    >
                      Question
                    </button>
                    <button
                      type="button"
                      className={pdfSelectionRole === "answer" ? "active" : ""}
                      onClick={() => {
                        setPdfSelectionRole("answer");
                        setPdfCounterpart("");
                      }}
                    >
                      Answer
                    </button>
                  </div>
                  <label htmlFor="pdf-card-counterpart">
                    {pdfSelectionRole === "question"
                      ? "Write the answer"
                      : "Write the question"}
                  </label>
                  <textarea
                    id="pdf-card-counterpart"
                    rows="3"
                    maxLength="10000"
                    value={pdfCounterpart}
                    onChange={(event) => setPdfCounterpart(event.target.value)}
                    placeholder={
                      pdfSelectionRole === "question"
                        ? "Enter the correct answer…"
                        : "Enter a question for this answer…"
                    }
                  />
                  <small>
                    Creates an Identification Bombcard in your reviewer deck.
                  </small>
                  <button
                    type="button"
                    className="csm-primary-button csm-pdf-create-card"
                    onClick={createPdfBombcard}
                    disabled={pdfSaving || !pdfCounterpart.trim()}
                  >
                    {pdfSaving ? "Saving…" : "Create Bombcard"}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="csm-pdf-selection-empty">
              <span>
                <IconBulb className="w-3.5 h-3.5" />
              </span>
              <strong>Select text in the PDF</strong>
              <p>
                Your selection will appear here. Save it as a color highlight or
                use it to create a question-and-answer Bombcard.
              </p>
            </div>
          )}

          <div className="csm-pdf-saved-list space-y-2">
            {highlights.map((item) => (
              <article key={item.id} className="csm-pdf-saved-item">
                <div className="csm-pdf-saved-item-top flex items-center justify-between">
                  <span
                    className="csm-pdf-note-tag"
                    style={{
                      "--swatch": item.color,
                    }}
                  >
                    {item.purpose === "question"
                      ? "Question card"
                      : item.purpose === "answer"
                        ? "Answer card"
                        : "Study note"}
                  </span>
                  <button
                    type="button"
                    className="csm-row-menu"
                    onClick={() => handleRemoveHighlight(item.id)}
                    title="Remove mark"
                  >
                    <IconClose className="w-3 h-3" />
                  </button>
                </div>
                <p>{item.text}</p>
                <button
                  type="button"
                  className="csm-pdf-page-jump text-purple-600 font-bold"
                  onClick={() => setPdfPage(Number(item.page) || 1)}
                >
                  Go to page {item.page}
                  {item.cardId ? " · linked Bombcard" : ""}
                </button>
              </article>
            ))}
          </div>
          {!!highlights.length && (
            <button
              type="button"
              className="csm-add-highlight w-full mt-2"
              onClick={handleClearHighlights}
            >
              Clear all saved highlights
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
