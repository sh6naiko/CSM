import { CSM } from "../../services/client.js";
import {
  IconClose,
  IconHighlighter,
  IconSearch,
  IconSparkles,
} from "../../components/icons.jsx";
import { FlashcardReviewModal } from "../study/FlashcardReviewModal.jsx";
import { LearningWorkspaceSidebar } from "./LearningWorkspaceSidebar.jsx";
import { PdfPagination } from "./PdfPagination.jsx";
import { PdfStudyViewer } from "./PdfStudyViewer.jsx";
import React from "react";
export function PdfWorkspaceScreen({
  activeDocument,
  activeDocumentDeck,
  activeStudyDeckId,
  aiAssistantResponse,
  aiExplainLevel,
  aiThinking,
  cardComposerOpen,
  cardFormAnswer,
  cardFormExplanation,
  cardFormQuestion,
  cardFormSourcePage,
  cardFormTags,
  createPdfBombcard,
  decks,
  documentNotes,
  documentNotesLoading,
  handleAiAsk,
  handleAiExplain,
  handleAiFlashcards,
  handleAiNotes,
  handleAiQuestions,
  handleAiSummarize,
  handleBackToDocumentLibrary,
  handleClearHighlights,
  handleCreateStudyDeck,
  handleDeleteDocumentNote,
  handleDeleteStudyCard,
  handleOpenAiGenerator,
  handleOpenDocument,
  handlePdfSearch,
  handlePdfTextSelection,
  handleQuickAction,
  handleRemoveHighlight,
  handleSaveDocumentNote,
  handleSaveStudyCard,
  highlightColor,
  highlights,
  isGuest,
  noteComposerOpen,
  noteEditingId,
  noteFormContent,
  noteFormPage,
  noteFormTitle,
  pdfCardComposerOpen,
  pdfCounterpart,
  pdfPage,
  pdfPageCount,
  pdfSaving,
  pdfSearchOpen,
  pdfSearchQuery,
  pdfSearchResults,
  pdfSearching,
  pdfSelection,
  pdfSelectionRole,
  pdfZoom,
  recordActivity,
  reviewingDeck,
  savePdfSelection,
  setActiveStudyDeckId,
  setAiAssistantResponse,
  setAiExplainLevel,
  setCardComposerOpen,
  setCardFormAnswer,
  setCardFormExplanation,
  setCardFormQuestion,
  setCardFormSourcePage,
  setCardFormTags,
  setHighlightColor,
  setNoteComposerOpen,
  setNoteEditingId,
  setNoteFormContent,
  setNoteFormPage,
  setNoteFormTitle,
  setPdfCardComposerOpen,
  setPdfCounterpart,
  setPdfPage,
  setPdfPageCount,
  setPdfSearchOpen,
  setPdfSearchQuery,
  setPdfSearchResults,
  setPdfSelection,
  setPdfSelectionRole,
  setPdfZoom,
  setReviewingDeck,
  setStudyCards,
  setWorkspaceSidebarTab,
  studyCards,
  studyCardsLoading,
  studyDecks,
  triggerToast,
  workspaceSidebarTab,
}) {
  return (
    <div className="csm-screen csm-highlighter-screen csm-pdf-ai-theme custom-scroll">
      <div className="csm-page-head csm-pdf-page-head">
        <div>
          <span className="csm-kicker">DOCUMENT STUDY WORKSPACE</span>
          <h1>Study Workspace</h1>
          <p>
            {isGuest
              ? "Read shared reviewer PDFs. Sign in to add highlights, notes, or flashcards."
              : "Read reviewer PDFs, mark key concepts with the Magic Marker, and build active-recall flashcards & notes."}
          </p>
        </div>
        <div className="csm-page-actions flex items-center gap-2">
          {activeDocument && !isGuest && (
            <button
              type="button"
              className="csm-primary-button csm-ai-gradient-button flex items-center gap-1.5 cursor-pointer"
              onClick={() =>
                handleOpenAiGenerator(activeDocument.deckId, activeDocument)
              }
              title="Extract text from this PDF and generate Bombcards with Gemini AI"
            >
              <IconSparkles className="w-3.5 h-3.5 text-white" />
              <span>Generate AI Flashcards</span>
            </button>
          )}
          <button
            type="button"
            className="csm-secondary-button"
            onClick={handleBackToDocumentLibrary}
          >
            Back to{" "}
            {activeDocumentDeck?.code || activeDocumentDeck?.title || "library"}
          </button>
        </div>
      </div>

      <div className="csm-highlighter-layout">
        {/* Left Column: PDF Viewer Stage & Tools */}
        <section className="csm-pdf-card flex flex-col">
          {/* PDF Viewer Header Toolbar */}
          <div className="csm-pdf-toolbar flex flex-wrap items-center justify-between gap-3">
            <div className="csm-pdf-document-title">
              <strong title={activeDocument?.title || "Choose a PDF to study"}>
                {activeDocument?.title || "Choose a PDF to study"}
              </strong>
              <span
                title={
                  activeDocument
                    ? `${decks.find((deck) => deck.id === activeDocument.deckId)?.title || "Your reviewer"} · private to your account`
                    : ""
                }
              >
                {activeDocument
                  ? `${decks.find((deck) => deck.id === activeDocument.deckId)?.title || "Your reviewer"} · private to your account`
                  : "Choose from your saved reviewer documents"}
              </span>
            </div>

            <div className="csm-pdf-tools flex items-center gap-2 flex-wrap">
              {/* Search in document toggle */}
              {activeDocument && (
                <button
                  type="button"
                  onClick={() => setPdfSearchOpen(!pdfSearchOpen)}
                  className={`h-8 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${pdfSearchOpen ? "bg-purple-600 text-white border-purple-600 shadow-xs" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"}`}
                  title="Search within document text"
                >
                  <IconSearch />
                  <span>Search</span>
                </button>
              )}

              {/* Zoom Controls */}
              {activeDocument && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold text-slate-700 shadow-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPdfZoom((z) =>
                        Math.max(0.5, Math.round((z - 0.2) * 10) / 10),
                      )
                    }
                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="Zoom out"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfZoom(1.0)}
                    className="px-2 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-[11px] cursor-pointer"
                    title="Reset zoom to 100%"
                  >
                    {Math.round(pdfZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPdfZoom((z) =>
                        Math.min(2.5, Math.round((z + 0.2) * 10) / 10),
                      )
                    }
                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Document Selector if none active */}
              {!activeDocument && (
                <select
                  className="csm-pdf-document-select"
                  value=""
                  aria-label="Choose a PDF"
                  onChange={(event) => {
                    const found = decks
                      .flatMap((deck) =>
                        (deck.documents || []).map((document) => ({
                          deck,
                          document,
                        })),
                      )
                      .find((item) => item.document.id === event.target.value);
                    if (found) handleOpenDocument(found.deck, found.document);
                  }}
                >
                  <option value="">Choose PDF…</option>
                  {decks.flatMap((deck) =>
                    (deck.documents || []).map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title} · {deck.title}
                      </option>
                    )),
                  )}
                </select>
              )}

              {/* Color Swatches */}
              {["#f5a23a", "#8dc7ef", "#a8d8a8"].map((color, index) => (
                <button
                  key={color}
                  type="button"
                  className={`csm-pdf-color ${highlightColor === color ? "active" : ""}`}
                  onClick={() => setHighlightColor(color)}
                  aria-label={
                    ["Orange", "Blue", "Green"][index] + " highlight color"
                  }
                  aria-pressed={highlightColor === color}
                  style={{
                    "--swatch": color,
                  }}
                />
              ))}

              {activeDocument && (
                <a
                  className="csm-pdf-open-link"
                  href={activeDocument.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open PDF ↗
                </a>
              )}
            </div>
          </div>

          {/* Search In-Document Bar */}
          {pdfSearchOpen && activeDocument && (
            <div className="bg-purple-50/80 border-b border-purple-200 p-3 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={pdfSearchQuery}
                    onChange={(e) => setPdfSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePdfSearch();
                    }}
                    placeholder="Search keywords or concepts across document..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium"
                  />
                  <div className="absolute left-2.5 top-2 text-slate-400 pointer-events-none">
                    <IconSearch />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePdfSearch()}
                  disabled={pdfSearching || !pdfSearchQuery.trim()}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {pdfSearching ? "Searching…" : "Find"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfSearchOpen(false);
                    setPdfSearchResults([]);
                    setPdfSearchQuery("");
                  }}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  title="Close search"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Results Summary & Page Jumps */}
              {pdfSearchResults.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-purple-900">
                    Matches on pages:
                  </span>
                  {pdfSearchResults.map((res, rIdx) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => setPdfPage(Number(res.page_number))}
                      className="px-2 py-0.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-600 hover:text-white text-[11px] font-extrabold text-purple-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      Page {res.page_number}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions helper banner */}
          <div className="csm-pdf-instructions">
            <span className="csm-pdf-instructions-icon">
              <IconHighlighter className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <span>
              {isGuest
                ? "Read-only shared PDF. Sign in to save highlights, notes, or flashcards."
                : "Highlight any text in the PDF with the Magic Marker to create flashcards, add notes, or color-code key excerpts."}
            </span>
          </div>

          <PdfPagination
            page={pdfPage}
            pageCount={pdfPageCount}
            onPageChange={setPdfPage}
            disabled={!activeDocument}
            position="top"
          />

          {/* Enhanced PDF Canvas & Text Layer Viewer */}
          <PdfStudyViewer
            document={activeDocument}
            pageNumber={pdfPage}
            onPageCount={setPdfPageCount}
            highlights={highlights}
            onSelection={isGuest ? undefined : handlePdfTextSelection}
            zoom={pdfZoom}
            onQuickAction={isGuest ? undefined : handleQuickAction}
          />
          <PdfPagination
            page={pdfPage}
            pageCount={pdfPageCount}
            onPageChange={setPdfPage}
            disabled={!activeDocument}
          />
        </section>

        {/* Right Column: PDF Learning Workspace Sidebar (Assistant, Notes, Flashcards, Highlights) */}
        {isGuest ? (
          <aside className="csm-guest-pdf-tools">
            <span className="csm-kicker">READ-ONLY PREVIEW</span>
            <h2>PDF tools are locked</h2>
            <p>
              You can read and download this shared PDF. Sign in to create
              notes, highlights, and flashcards.
            </p>
            <a href="login.html?mode=signin">Sign in to unlock</a>
          </aside>
        ) : (
          <LearningWorkspaceSidebar
            activeTab={workspaceSidebarTab}
            setActiveTab={setWorkspaceSidebarTab}
            activeDocument={activeDocument}
            decks={decks}
            pdfPage={pdfPage}
            setPdfPage={setPdfPage}
            pdfSelection={pdfSelection}
            setPdfSelection={setPdfSelection}
            // AI assist
            aiThinking={aiThinking}
            aiAssistantResponse={aiAssistantResponse}
            setAiAssistantResponse={setAiAssistantResponse}
            aiExplainLevel={aiExplainLevel}
            setAiExplainLevel={setAiExplainLevel}
            onAiExplain={handleAiExplain}
            onAiSummarize={handleAiSummarize}
            onAiQuestions={handleAiQuestions}
            onAiNotes={handleAiNotes}
            onAiFlashcards={handleAiFlashcards}
            onAiAsk={handleAiAsk}
            // Notes
            documentNotes={documentNotes}
            documentNotesLoading={documentNotesLoading}
            noteComposerOpen={noteComposerOpen}
            setNoteComposerOpen={setNoteComposerOpen}
            noteFormTitle={noteFormTitle}
            setNoteFormTitle={setNoteFormTitle}
            noteFormContent={noteFormContent}
            setNoteFormContent={setNoteFormContent}
            noteFormPage={noteFormPage}
            setNoteFormPage={setNoteFormPage}
            noteEditingId={noteEditingId}
            setNoteEditingId={setNoteEditingId}
            onSaveNote={handleSaveDocumentNote}
            onDeleteNote={handleDeleteDocumentNote}
            // Flashcards
            studyDecks={studyDecks}
            activeStudyDeckId={activeStudyDeckId}
            setActiveStudyDeckId={setActiveStudyDeckId}
            onCreateStudyDeck={handleCreateStudyDeck}
            studyCards={studyCards}
            studyCardsLoading={studyCardsLoading}
            cardComposerOpen={cardComposerOpen}
            setCardComposerOpen={setCardComposerOpen}
            cardFormQuestion={cardFormQuestion}
            setCardFormQuestion={setCardFormQuestion}
            cardFormAnswer={cardFormAnswer}
            setCardFormAnswer={setCardFormAnswer}
            cardFormExplanation={cardFormExplanation}
            setCardFormExplanation={setCardFormExplanation}
            cardFormTags={cardFormTags}
            setCardFormTags={setCardFormTags}
            cardFormSourcePage={cardFormSourcePage}
            setCardFormSourcePage={setCardFormSourcePage}
            onSaveStudyCard={handleSaveStudyCard}
            onDeleteStudyCard={handleDeleteStudyCard}
            onStartFlashcardReview={(deck) =>
              setReviewingDeck(
                deck || {
                  title: activeDocument?.title
                    ? `${activeDocument.title} Cards`
                    : "Review Deck",
                },
              )
            }
            // Highlights
            highlights={highlights}
            highlightColor={highlightColor}
            setHighlightColor={setHighlightColor}
            savePdfSelection={savePdfSelection}
            createPdfBombcard={createPdfBombcard}
            handleRemoveHighlight={handleRemoveHighlight}
            handleClearHighlights={handleClearHighlights}
            pdfSaving={pdfSaving}
            pdfCardComposerOpen={pdfCardComposerOpen}
            setPdfCardComposerOpen={setPdfCardComposerOpen}
            pdfSelectionRole={pdfSelectionRole}
            setPdfSelectionRole={setPdfSelectionRole}
            pdfCounterpart={pdfCounterpart}
            setPdfCounterpart={setPdfCounterpart}
            onOpenAiGenerator={() =>
              handleOpenAiGenerator(activeDocument?.deckId, activeDocument)
            }
            triggerToast={triggerToast}
          />
        )}
      </div>

      {/* Flashcard Active Recall Practice Session Modal */}
      {reviewingDeck && (
        <FlashcardReviewModal
          deck={reviewingDeck}
          cards={studyCards}
          onClose={() => setReviewingDeck(null)}
          onFinish={() => {
            recordActivity({
              material: reviewingDeck?.title || "Flashcard Review",
              mode: "Flashcard Review",
              screen: "flashcards",
              status: "Completed",
            });
            if (activeStudyDeckId) {
              CSM.api(
                "study-cards&deckId=" + encodeURIComponent(activeStudyDeckId),
              )
                .then((r) => setStudyCards(r?.cards || []))
                .catch(() => {});
            }
          }}
          onJumpToPage={(p) => setPdfPage(p)}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
