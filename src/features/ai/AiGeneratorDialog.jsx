import {
  IconBulb,
  IconFileText,
  IconPdf,
  IconPlus,
  IconSparkles,
  IconUpload,
} from "../../components/icons.jsx";
import React from "react";
export function AiGeneratorDialog({
  aiDeckLocked,
  aiExtractingPdf,
  aiFocus,
  aiFormat,
  aiGeneratedCards,
  aiLoading,
  aiNotes,
  aiPdfDragActive,
  aiPdfEndPage,
  aiPdfExtractProgress,
  aiPdfExtractedSummary,
  aiPdfFileInputRef,
  aiPdfPageRangeType,
  aiPdfSourceMode,
  aiPdfStartPage,
  aiPdfTotalPages,
  aiReviewerDownloading,
  aiSavePdfToDeck,
  aiSelectedLibraryDoc,
  aiShowNotesPreview,
  aiSourceType,
  aiStage,
  aiTargetDeckId,
  aiUploadedPdfFile,
  decks,
  extractPdfText,
  handleGenerateAiReviewer,
  handleGenerateWithAi,
  handleLoadSampleNotes,
  handlePdfDrop,
  handlePdfFileSelect,
  handleSaveAiCardsToDeck,
  handleTargetDeckChange,
  setAiFocus,
  setAiFormat,
  setAiGeneratedCards,
  setAiGeneratorOpen,
  setAiNotes,
  setAiPdfDragActive,
  setAiPdfEndPage,
  setAiPdfPageRangeType,
  setAiPdfSourceMode,
  setAiPdfStartPage,
  setAiSavePdfToDeck,
  setAiSelectedLibraryDoc,
  setAiShowNotesPreview,
  setAiSourceType,
  setAiStage,
}) {
  const targetDeck =
    decks.find((deck) => deck.id === aiTargetDeckId) || decks[0];
  const [sourcePickerOpen, setSourcePickerOpen] = React.useState(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = React.useState(false);
  const compactPdfSource = Boolean(
    aiSourceType === "pdf" &&
      aiPdfSourceMode === "library" &&
      aiSelectedLibraryDoc &&
      !sourcePickerOpen,
  );

  React.useEffect(() => {
    if (aiSelectedLibraryDoc) setSourcePickerOpen(false);
  }, [aiSelectedLibraryDoc?.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => {
        if (!aiLoading) setAiGeneratorOpen(false);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="csm-ai-theme w-full max-w-2xl bg-white rounded-[26px] p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <IconSparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  AI Bombcard Maker
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {aiStage === "input"
                  ? "Paste lecture notes or summaries to forge high-retention questions."
                  : `Review & approve ${aiGeneratedCards.length} generated Bombcards before adding to deck.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => setAiGeneratorOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scroll py-5 space-y-5 pr-1">
          {aiStage === "input" ? (
            <>
              {/* Top Source Mode Tabs */}
              {!compactPdfSource && (
                <div className="flex p-1 bg-slate-100/90 rounded-2xl gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setAiSourceType("pdf")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${aiSourceType === "pdf" ? "bg-white text-purple-900 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <IconPdf className="w-3.5 h-4 text-purple-600" />
                  <span>From PDF Document</span>
                  {aiPdfExtractedSummary && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold ml-1">
                      ✓ Ready
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAiSourceType("text")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${aiSourceType === "text" ? "bg-white text-purple-900 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <IconFileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>From Pasted Text / Notes</span>
                </button>
                </div>
              )}

              {/* Target Reviewer Deck Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Target deck
                  </label>
                </div>
                {aiDeckLocked && (
                  <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-[#f4b3a2] bg-[#fff7f3] px-3.5">
                    <span className="truncate text-xs font-black text-slate-800">
                      {targetDeck?.code || targetDeck?.title || "Selected deck"}
                      {" — "}
                      {targetDeck?.title || targetDeck?.subject || "Reviewer"}
                    </span>
                    <span className="flex-shrink-0 text-[11px] font-bold text-[#b82d13]">
                      Cards will be added here
                    </span>
                  </div>
                )}
                {!aiDeckLocked && (
                <select
                  value={aiTargetDeckId}
                  onChange={(e) => handleTargetDeckChange(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-400 focus:bg-white transition-all cursor-pointer"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.title || d.subject} ({d.cards?.length || 0}{" "}
                      cards · {d.documents?.length || 0} PDFs)
                    </option>
                  ))}
                </select>
                )}
              </div>

              {compactPdfSource && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f4b3a2] bg-[#fff7f3] p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff1ec] text-[#d93616]">
                      <IconPdf className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#b82d13]">
                        Source PDF
                      </span>
                      <p className="truncate text-xs font-black text-slate-900">
                        {aiSelectedLibraryDoc.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                        Attached to this deck
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourcePickerOpen(true)}
                    className="flex-shrink-0 rounded-xl border border-[#f4b3a2] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#d93616] transition-colors hover:bg-[#fff1ec] cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* SOURCE 1: FROM PDF DOCUMENT */}
              {aiSourceType === "pdf" ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Sub-selector: Upload New PDF vs Pick Attached Document */}
                  {(() => {
                    const currentDeck = decks.find(
                      (d) => d.id === aiTargetDeckId,
                    );
                    const deckDocs = currentDeck?.documents || [];
                    return (
                      <div className="space-y-3">
                        {deckDocs.length > 0 && !compactPdfSource && (
                          <div className="flex items-center gap-2 pb-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAiPdfSourceMode("upload");
                                if (aiUploadedPdfFile) {
                                  extractPdfText({
                                    type: "file",
                                    file: aiUploadedPdfFile,
                                  });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${aiPdfSourceMode === "upload" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >
                              Upload / Drop PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAiPdfSourceMode("library");
                                const defaultDoc =
                                  aiSelectedLibraryDoc || deckDocs[0];
                                setAiSelectedLibraryDoc(defaultDoc);
                                extractPdfText({
                                  type: "doc",
                                  doc: defaultDoc,
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${aiPdfSourceMode === "library" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >
                              <span>Deck PDFs ({deckDocs.length})</span>
                            </button>
                          </div>
                        )}

                        {/* Option A: Dropzone / Upload View */}
                        {aiPdfSourceMode === "upload" && (
                          <div>
                            <input
                              type="file"
                              ref={aiPdfFileInputRef}
                              accept=".pdf,application/pdf"
                              onChange={handlePdfFileSelect}
                              className="hidden"
                            />

                            {!aiUploadedPdfFile ? (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setAiPdfDragActive(true);
                                }}
                                onDragLeave={() => setAiPdfDragActive(false)}
                                onDrop={handlePdfDrop}
                                onClick={() =>
                                  aiPdfFileInputRef.current?.click()
                                }
                                className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center ${aiPdfDragActive ? "border-purple-600 bg-purple-50/70 shadow-inner" : "border-slate-300 bg-[#f8fafc] hover:bg-purple-50/30 hover:border-purple-400"}`}
                              >
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 shadow-xs">
                                  <IconUpload className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-black text-slate-900">
                                  Drag & drop your PDF file here, or click to
                                  browse
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                  Supports lecture slides, textbook chapters,
                                  study summaries, and course notes (.pdf)
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    aiPdfFileInputRef.current?.click();
                                  }}
                                  className="mt-3.5 h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
                                >
                                  Browse PDF Files
                                </button>
                              </div> /* Active Uploaded File Card */
                            ) : (
                              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs flex-shrink-0">
                                      <IconPdf className="w-5 h-6 text-purple-700" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-black text-slate-900 truncate">
                                        {aiUploadedPdfFile.name}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-semibold">
                                        <span>
                                          {(
                                            aiUploadedPdfFile.size / 1024
                                          ).toFixed(0)}{" "}
                                          KB
                                        </span>
                                        {aiPdfTotalPages > 0 && (
                                          <>
                                            <span>·</span>
                                            <span className="text-purple-700 font-bold">
                                              {aiPdfTotalPages}{" "}
                                              {aiPdfTotalPages === 1
                                                ? "page"
                                                : "pages"}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      aiPdfFileInputRef.current?.click()
                                    }
                                    className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white border border-purple-200 px-3 py-1.5 rounded-xl shadow-xs hover:bg-purple-50 transition-all cursor-pointer flex-shrink-0"
                                  >
                                    Change PDF
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Option B: Choose Attached Deck Document */}
                        {aiPdfSourceMode === "library" &&
                          deckDocs.length > 0 &&
                          !compactPdfSource && (
                            <div className="space-y-2">
                              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                                Select Deck PDF Document
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {deckDocs.map((doc) => {
                                  const isSelected =
                                    aiSelectedLibraryDoc?.id === doc.id;
                                  return (
                                    <div
                                      key={doc.id}
                                      onClick={() => {
                                        setAiSelectedLibraryDoc(doc);
                                        extractPdfText({
                                          type: "doc",
                                          doc,
                                        });
                                      }}
                                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${isSelected ? "border-purple-500 bg-purple-50 shadow-xs" : "border-slate-200 bg-[#f8fafc] hover:bg-slate-50"}`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <IconPdf
                                          className={`w-4 h-5 ${isSelected ? "text-purple-700" : "text-slate-500"}`}
                                        />
                                        <div className="min-w-0">
                                          <p
                                            className={`text-xs font-black truncate ${isSelected ? "text-purple-950" : "text-slate-800"}`}
                                          >
                                            {doc.title}
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            Attached reviewer doc
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })()}

                  {/* Page Range Controls (Active when a PDF is loaded and has multiple pages) */}
                  {aiPdfTotalPages > 1 && (
                    <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Page range
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAiPdfPageRangeType("all");
                              const src =
                                aiPdfSourceMode === "upload"
                                  ? {
                                      type: "file",
                                      file: aiUploadedPdfFile,
                                    }
                                  : {
                                      type: "doc",
                                      doc: aiSelectedLibraryDoc,
                                    };
                              extractPdfText(src, {
                                type: "all",
                                start: 1,
                                end: aiPdfTotalPages,
                              });
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiPdfPageRangeType === "all" ? "bg-purple-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          >
                            All ({aiPdfTotalPages} pages)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiPdfPageRangeType("custom")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiPdfPageRangeType === "custom" ? "bg-purple-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          >
                            Custom Range
                          </button>
                        </div>
                      </div>

                      {aiPdfPageRangeType === "custom" && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                            <span>Page</span>
                            <input
                              type="number"
                              min="1"
                              max={aiPdfEndPage}
                              value={aiPdfStartPage}
                              onChange={(e) =>
                                setAiPdfStartPage(
                                  Math.max(
                                    1,
                                    Math.min(
                                      Number(e.target.value) || 1,
                                      aiPdfTotalPages,
                                    ),
                                  ),
                                )
                              }
                              className="w-14 h-8 px-2 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                            />
                            <span>to</span>
                            <input
                              type="number"
                              min={aiPdfStartPage}
                              max={aiPdfTotalPages}
                              value={aiPdfEndPage}
                              onChange={(e) =>
                                setAiPdfEndPage(
                                  Math.max(
                                    aiPdfStartPage,
                                    Math.min(
                                      Number(e.target.value) || 1,
                                      aiPdfTotalPages,
                                    ),
                                  ),
                                )
                              }
                              className="w-14 h-8 px-2 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                            />
                            <span className="text-slate-400">
                              of {aiPdfTotalPages}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={aiExtractingPdf}
                            onClick={() => {
                              const src =
                                aiPdfSourceMode === "upload"
                                  ? {
                                      type: "file",
                                      file: aiUploadedPdfFile,
                                    }
                                  : {
                                      type: "doc",
                                      doc: aiSelectedLibraryDoc,
                                    };
                              extractPdfText(src, {
                                type: "custom",
                                start: aiPdfStartPage,
                                end: aiPdfEndPage,
                              });
                            }}
                            className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all cursor-pointer ml-auto"
                          >
                            {aiExtractingPdf
                              ? "Extracting..."
                              : "Extract Range"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extraction Status Bar */}
                  {aiExtractingPdf && (
                    <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-3 animate-pulse">
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <div className="text-xs font-bold text-purple-900">
                        {aiPdfExtractProgress || "Reading PDF text layers..."}
                      </div>
                    </div>
                  )}

                  {/* Extraction Success & Preview Card */}
                  {aiPdfExtractedSummary && !aiExtractingPdf && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">
                            ✓
                          </span>
                          <span className="text-xs font-bold text-emerald-950">
                            Extracted{" "}
                            {aiPdfExtractedSummary.wordCount.toLocaleString()}{" "}
                            words from {aiPdfExtractedSummary.pages}{" "}
                            {aiPdfExtractedSummary.pages === 1
                              ? "page"
                              : "pages"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAiShowNotesPreview(!aiShowNotesPreview)
                          }
                          className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                        >
                          {aiShowNotesPreview
                            ? "Hide Text ▲"
                            : "View / Edit Text ▼"}
                        </button>
                      </div>

                      {aiShowNotesPreview && (
                        <div className="pt-2 border-t border-emerald-200/60">
                          <textarea
                            value={aiNotes}
                            onChange={(e) => setAiNotes(e.target.value)}
                            rows="5"
                            className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 font-mono outline-none focus:border-emerald-400 custom-scroll leading-relaxed"
                            placeholder="Extracted text from PDF..."
                          />
                          <p className="text-[10px] text-emerald-700 mt-1">
                            You can trim, modify, or add notes before generating
                            cards.
                          </p>
                        </div>
                      )}

                      {aiPdfSourceMode === "upload" && aiUploadedPdfFile && (
                        <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={aiSavePdfToDeck}
                            onChange={(e) =>
                              setAiSavePdfToDeck(e.target.checked)
                            }
                            className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                          />
                          <span>
                            Also attach this PDF to reviewer materials in{" "}
                            <strong>
                              {decks.find((d) => d.id === aiTargetDeckId)
                                ?.title || "selected deck"}
                            </strong>
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div> /* SOURCE 2: FROM RAW PASTED TEXT */
              ) : (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Study Material / Notes *
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleNotes}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                    >
                      Load Sample Notes
                    </button>
                  </div>

                  <textarea
                    value={aiNotes}
                    onChange={(e) => setAiNotes(e.target.value)}
                    rows="6"
                    placeholder="Paste your study notes, textbook summary, definitions, or exam guide here... Gemini will distill it into crisp Multiple Choice and Identification flashcards."
                    className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:bg-white transition-all leading-relaxed custom-scroll"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Minimum ~50 words recommended for highest question quality
                    </span>
                    <span>{aiNotes.length} characters</span>
                  </div>
                </div>
              )}

              {/* Advanced Generation Controls */}
              <div className="rounded-2xl border border-slate-200 bg-[#f8fafc]">
                <button
                  type="button"
                  aria-expanded={advancedOptionsOpen}
                  onClick={() => setAdvancedOptionsOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left cursor-pointer"
                >
                  <span>
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Customize generation
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                      {aiFormat === "MIXED"
                        ? "Mixed"
                        : aiFormat === "MULTIPLE_CHOICE"
                          ? "MCQ only"
                          : aiFormat === "TRUE_FALSE"
                            ? "True / False only"
                            : "Identification only"}{" "}
                      ·{" "}
                      {aiFocus === "comprehensive"
                        ? "Comprehensive"
                        : aiFocus === "key_terms"
                          ? "Key terms"
                          : "Application"}
                    </span>
                  </span>
                  <span
                    className="text-base font-bold text-slate-400"
                    aria-hidden="true"
                  >
                    {advancedOptionsOpen ? "−" : "+"}
                  </span>
                </button>

                {advancedOptionsOpen && (
                  <div className="space-y-4 border-t border-slate-200 px-3.5 pb-3.5 pt-3.5">
              <div className="pt-1">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Question Format
                  </label>
                  <div className="flex items-center p-1 bg-[#f1f5f9] border border-slate-200 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setAiFormat("MIXED")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === "MIXED" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Mixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiFormat("MULTIPLE_CHOICE")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === "MULTIPLE_CHOICE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      MCQ Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiFormat("TRUE_FALSE")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === "TRUE_FALSE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      T/F Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiFormat("IDENTIFICATION")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${aiFormat === "IDENTIFICATION" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      ID Only
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Card count adapts to the selected study material. You’ll
                  choose which Bombcards to add after generation.
                </p>
              </div>

              {/* Study Focus */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Focus Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiFocus("comprehensive")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === "comprehensive" ? "border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs" : "border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="block font-black">Comprehensive</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Balanced mix of cards
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiFocus("key_terms")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === "key_terms" ? "border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs" : "border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="block font-black">Key Terms</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Definitions & acronyms
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiFocus("conceptual")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${aiFocus === "conceptual" ? "border-purple-400 bg-purple-50/60 font-bold text-purple-900 shadow-xs" : "border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="block font-black">Application</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Scenarios & concepts
                    </span>
                  </button>
                </div>
              </div>
                  </div>
                )}
              </div>
            </> /* --- PREVIEW STAGE --- */
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between bg-purple-50/80 border border-purple-200 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span className="text-xs font-bold text-purple-950">
                    {aiGeneratedCards.filter((c) => c.selected).length} of{" "}
                    {aiGeneratedCards.length} cards selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAiGeneratedCards((cards) =>
                        cards.map((c) => ({
                          ...c,
                          selected: true,
                        })),
                      )
                    }
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-purple-300">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAiGeneratedCards((cards) =>
                        cards.map((c) => ({
                          ...c,
                          selected: false,
                        })),
                      )
                    }
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <span className="text-purple-300">·</span>
                  <button
                    type="button"
                    onClick={handleGenerateAiReviewer}
                    disabled={aiReviewerDownloading}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    aria-label="Generate an AI study reviewer"
                    title="Generate an AI study reviewer"
                  >
                    <IconSparkles className="w-3.5 h-3.5" />{" "}
                    {aiReviewerDownloading
                      ? "Creating reviewer…"
                      : "Generate study reviewer"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {aiGeneratedCards.map((card, idx) => {
                  return (
                    <div
                      key={card.id || idx}
                      onClick={() => {
                        const updated = [...aiGeneratedCards];
                        updated[idx].selected = !updated[idx].selected;
                        setAiGeneratedCards(updated);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${card.selected ? "border-purple-300 bg-purple-50/20 shadow-xs" : "border-slate-200 bg-slate-50 opacity-60"}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!card.selected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              #{idx + 1}{" "}
                              {card.type === "MULTIPLE_CHOICE"
                                ? "Multiple Choice"
                                : card.type === "TRUE_FALSE"
                                  ? "True / False"
                                  : "Identification"}
                            </span>
                            {card.hint && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                <IconBulb className="w-2.5 h-2.5 text-amber-600" />{" "}
                                Hint: {card.hint}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {card.prompt}
                          </p>

                          {card.type === "MULTIPLE_CHOICE" && card.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5">
                              {card.options.map((opt, oIdx) => {
                                const isCorrect =
                                  oIdx === card.correctIndex ||
                                  opt === card.correctAnswer;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${isCorrect ? "bg-orange-50 text-[#f04824] border border-orange-200 font-bold" : "bg-white border border-slate-200/80 text-slate-600"}`}
                                  >
                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                    {isCorrect && (
                                      <span className="ml-auto text-[9px] font-black text-[#f04824]">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {card.type === "TRUE_FALSE" && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400">
                                Correct Answer:
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#f04824] border border-orange-200 text-xs font-bold">
                                {card.correctAnswer}
                              </span>
                            </div>
                          )}

                          {card.type === "IDENTIFICATION" && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400">
                                Correct Answer:
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#f04824] border border-orange-200 text-xs font-bold">
                                {card.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          {aiStage === "input" ? (
            <>
              <button
                type="button"
                onClick={() => setAiGeneratorOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiLoading || aiExtractingPdf || !aiNotes.trim()}
                onClick={handleGenerateWithAi}
                className={`h-11 px-6 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${aiLoading || aiExtractingPdf || !aiNotes.trim() ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25 active:scale-95"}`}
              >
                {aiLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Gemini is forging Bombcards...</span>
                  </>
                ) : aiExtractingPdf ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                    <span>Reading PDF...</span>
                  </>
                ) : (
                  <>
                    <IconSparkles className="w-4 h-4" />
                    <span>Forge Bombcards with Gemini</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAiStage("input")}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ← Back to Notes
              </button>
              <button
                type="button"
                disabled={
                  aiLoading ||
                  aiGeneratedCards.filter((c) => c.selected).length === 0
                }
                onClick={handleSaveAiCardsToDeck}
                className="h-11 px-6 rounded-xl bg-[#f04824] hover:bg-[#e03e1b] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Saving to deck...</span>
                  </>
                ) : (
                  <>
                    <IconPlus className="w-4 h-4" />
                    <span>
                      Add {aiGeneratedCards.filter((c) => c.selected).length}{" "}
                      Bombcards to Deck
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
