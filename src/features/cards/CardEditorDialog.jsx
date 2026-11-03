import { IconPdf, IconPlus, IconTrash } from "../../components/icons.jsx";
import React from "react";
export function CardEditorDialog({
  editingDeck,
  editorCards,
  editorDocuments,
  handleAddQuestionToEditor,
  handlePdfUpload,
  handleRemoveCardFromEditor,
  handleRemoveDocFromEditor,
  handleSaveDeck,
  isDraggingPdf,
  newQAlternates,
  newQAnswer,
  newQCorrectIndex,
  newQHint,
  newQOptions,
  newQPrompt,
  newQType,
  pdfInputRef,
  setEditorDocuments,
  setIsDeckEditorOpen,
  setIsDraggingPdf,
  setNewQAlternates,
  setNewQAnswer,
  setNewQCorrectIndex,
  setNewQHint,
  setNewQOptions,
  setNewQPrompt,
  setNewQType,
  triggerToast,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[26px] p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-[#f04824] uppercase tracking-wider block">
              ADD MATERIAL
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              {editingDeck
                ? editingDeck.code || editingDeck.title
                : "Reviewer Materials"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Folder:{" "}
              <span className="font-semibold text-slate-700">
                {editingDeck?.code} -{" "}
                {editingDeck?.title || editingDeck?.subject}
              </span>
            </p>
          </div>
          <button
            onClick={() => setIsDeckEditorOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto custom-scroll py-4 space-y-5 pr-1">
          {/* Section 1: Import PDFs */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <IconPdf />
                <span className="text-xs font-bold text-slate-800">
                  Import PDFs ({editorDocuments.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="h-7 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <IconPlus className="w-3 h-3 text-[#f04824]" />
                <span>Browse PDF</span>
              </button>
            </div>

            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handlePdfUpload}
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingPdf(true);
              }}
              onDragLeave={() => setIsDraggingPdf(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingPdf(false);
                const files = Array.from(e.dataTransfer.files || []).filter(
                  (f) =>
                    f.type === "application/pdf" ||
                    f.name.toLowerCase().endsWith(".pdf"),
                );
                if (files.length > 0) {
                  const newDocs = files.map((file) => ({
                    id:
                      "doc-" +
                      Date.now() +
                      "-" +
                      Math.random().toString(36).substring(2, 6),
                    title: file.name,
                    file,
                  }));
                  setEditorDocuments((prev) => [...prev, ...newDocs]);
                  triggerToast(
                    `Imported ${files.length} PDF file${files.length > 1 ? "s" : ""}`,
                  );
                } else {
                  triggerToast("Please drop PDF files only");
                }
              }}
              onClick={() => pdfInputRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${isDraggingPdf ? "border-[#f04824] bg-orange-50/50" : "border-slate-300/80 bg-white/70 hover:bg-white hover:border-[#f04824]/50"}`}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <svg
                  className="w-7 h-7 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Click to browse or drag & drop PDF files
                </p>
                <p className="text-[11px] text-slate-400">
                  Attach lecture modules, handouts, or notes
                </p>
              </div>
            </div>

            {/* Attached PDFs List */}
            {editorDocuments.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto custom-scroll pr-1">
                {editorDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <IconPdf />
                      <span className="font-bold text-slate-800 truncate">
                        {doc.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocFromEditor(doc.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors"
                      title="Remove PDF"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Form: Add New BombCard */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-[#f04824] uppercase tracking-wider block mb-2">
              + Add Question Pair (BombCard)
            </span>

            {/* Question Type Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setNewQType("MULTIPLE_CHOICE")}
                className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === "MULTIPLE_CHOICE" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => setNewQType("TRUE_FALSE")}
                className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === "TRUE_FALSE" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                True / False
              </button>
              <button
                type="button"
                onClick={() => setNewQType("IDENTIFICATION")}
                className={`h-7 px-3 rounded-md text-xs font-bold transition-colors ${newQType === "IDENTIFICATION" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Identification
              </button>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={newQPrompt}
                onChange={(e) => setNewQPrompt(e.target.value)}
                placeholder="Enter Question / Prompt..."
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
              />

              <input
                type="text"
                value={newQHint}
                onChange={(e) => setNewQHint(e.target.value)}
                placeholder="Optional Hint / Module Tag (e.g. 4 Letters, Chapter 1)..."
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
              />

              {/* Mode A: MCQ 4 Options with Radio Key */}
              {newQType === "MULTIPLE_CHOICE" ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Select radio to designate the correct answer:
                  </span>
                  {newQOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctKey"
                        checked={newQCorrectIndex === i}
                        onChange={() => setNewQCorrectIndex(i)}
                        className="w-4 h-4 text-[#f04824] focus:ring-[#f04824] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-400 w-4">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const copy = [...newQOptions];
                          copy[i] = e.target.value;
                          setNewQOptions(copy);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                      />
                    </div>
                  ))}
                </div>
              ) : newQType === "TRUE_FALSE" ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Choose the correct answer:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {["True", "False"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setNewQAnswer(value)}
                        className={`h-9 rounded-lg text-xs font-bold border transition-colors ${newQAnswer === value ? "border-[#f04824] bg-orange-50 text-[#f04824]" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div> /* Mode B: Identification Single & Alternates */
              ) : (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Target Answer:
                    </label>
                    <input
                      type="text"
                      value={newQAnswer}
                      onChange={(e) => setNewQAnswer(e.target.value)}
                      placeholder="e.g. Star"
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Alternate acceptable answers (comma-separated):
                    </label>
                    <input
                      type="text"
                      value={newQAlternates}
                      onChange={(e) => setNewQAlternates(e.target.value)}
                      placeholder="e.g. star, star topology"
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#f04824]"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddQuestionToEditor}
                className="mt-2 h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
              >
                + Append Card to Deck
              </button>
            </div>
          </div>

          {/* Existing BombCards in this Deck */}
          <div>
            <span className="text-xs font-bold text-slate-700 block mb-2">
              Questions in this Deck ({editorCards.length})
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
              {editorCards.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">
                  No cards added yet.
                </div>
              ) : (
                editorCards.map((c, idx) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-900 block">
                        Q{idx + 1}: {c.prompt}
                      </span>
                      <span className="text-[11px] text-slate-500 ">
                        Ans: {c.correctAnswer} &bull; Type:{" "}
                        {c.type === "MULTIPLE_CHOICE"
                          ? "MCQ"
                          : c.type === "TRUE_FALSE"
                            ? "T/F"
                            : "ID"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCardFromEditor(c.id)}
                      className="text-rose-500 hover:text-rose-700 font-bold p-1"
                      title="Remove Card"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={() => setIsDeckEditorOpen(false)}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDeck}
            className="h-10 px-5 bg-[#f04824] hover:bg-[#e03e1b] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            Save Materials
          </button>
        </div>
      </div>
    </div>
  );
}
