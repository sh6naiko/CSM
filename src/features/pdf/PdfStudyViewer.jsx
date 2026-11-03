import { CSM } from "../../services/client.js";
import {
  IconCards,
  IconClose,
  IconFileText,
  IconHighlighter,
} from "../../components/icons.jsx";
import React, { useEffect, useRef, useState } from "react";
export function PdfStudyViewer({
  document,
  pageNumber,
  onPageCount,
  highlights,
  onSelection,
  zoom = 1.0,
  onQuickAction,
}) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState({
    width: 0,
    height: 0,
  });
  const [stageWidth, setStageWidth] = useState(760);
  const [selectedText, setSelectedText] = useState("");
  const stageRef = useRef(null);
  const paperRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    let current = true;
    let task = null;
    setPdf(null);
    setLoadError("");
    setPageSize({
      width: 0,
      height: 0,
    });
    setSelectedText("");
    if (!document?.url)
      return () => {
        current = false;
      };
    setLoading(true);
    (async () => {
      try {
        const pdfjsLib = window.pdfjsLib || (await window.pdfjsReady);
        if (!current) return;
        if (!pdfjsLib)
          throw new Error(
            "The PDF text tools could not load. Check your connection and try again.",
          );
        task = pdfjsLib.getDocument({
          url: document.url,
          withCredentials: true,
        });
        const value = await task.promise;
        if (current) {
          setPdf(value);
          onPageCount(value.numPages);
        }
      } catch (error) {
        if (current)
          setLoadError(error?.message || "This PDF could not be opened.");
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
      task?.destroy();
    };
  }, [document?.url]);

  // Stage resize observer
  useEffect(() => {
    const node = stageRef.current;
    if (!node || !window.ResizeObserver) return;
    const observer = new ResizeObserver((entries) =>
      setStageWidth(Math.max(320, entries[0].contentRect.width - 44)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [document?.url]);

  // Background full document text extraction for search & AI context
  useEffect(() => {
    if (!pdf || !document?.id) return;
    let current = true;
    (async () => {
      try {
        const check = await CSM.api(
          "documents/extract&documentId=" + encodeURIComponent(document.id),
        );
        if (check?.extracted && check.pages?.length > 0) return;
        const extractedPages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (!current) break;
          const p = await pdf.getPage(i);
          const tc = await p.getTextContent();
          const txt = tc.items
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (txt) {
            extractedPages.push({
              page: i,
              text: txt,
            });
          }
        }
        if (current && extractedPages.length > 0) {
          await CSM.api("documents/extract", "POST", {
            documentId: document.id,
            pageCount: pdf.numPages,
            pages: extractedPages,
          });
        }
      } catch (err) {
        console.warn("PDF background text extraction:", err);
      }
    })();
    return () => {
      current = false;
    };
  }, [pdf, document?.id]);

  // Render current page with zoom scale & high-DPI support
  useEffect(() => {
    let current = true;
    let renderTask = null;
    let textTask = null;
    const render = async () => {
      if (!pdf || !canvasRef.current || !textLayerRef.current) return;
      setLoading(true);
      setLoadError("");
      try {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({
          scale: 1,
        });
        const scale = Math.min(
          3.0,
          Math.max(0.4, (stageWidth / baseViewport.width) * (zoom || 1.0)),
        );
        const viewport = page.getViewport({
          scale,
        });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", {
          alpha: false,
        });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const layer = textLayerRef.current;
        layer.innerHTML = "";
        layer.style.width = `${viewport.width}px`;
        layer.style.height = `${viewport.height}px`;
        setPageSize({
          width: viewport.width,
          height: viewport.height,
        });
        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
        if (!current) return;
        const textContent = await page.getTextContent();
        textTask = new window.pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: layer,
          viewport,
        });
        await textTask.render();
      } catch (error) {
        if (current && error?.name !== "RenderingCancelledException")
          setLoadError(error?.message || "This page could not be rendered.");
      } finally {
        if (current) setLoading(false);
      }
    };
    render();
    return () => {
      current = false;
      renderTask?.cancel();
      textTask?.cancel?.();
    };
  }, [pdf, pageNumber, stageWidth, highlights, zoom]);
  const captureSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, " ").trim();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (
      !text ||
      !range ||
      !textLayerRef.current?.contains(range.commonAncestorContainer)
    ) {
      setSelectedText("");
      return;
    }
    const paper = paperRef.current?.getBoundingClientRect();
    if (!paper?.width || !paper?.height) return;
    const rectangles = Array.from(range.getClientRects())
      .map((rect) => ({
        x: Math.max(0, (rect.left - paper.left) / paper.width),
        y: Math.max(0, (rect.top - paper.top) / paper.height),
        width: Math.min(rect.width / paper.width, 1),
        height: Math.min(rect.height / paper.height, 1),
      }))
      .filter((rect) => rect.width > 0 && rect.height > 0);
    if (rectangles.length) {
      setSelectedText(text);
      onSelection({
        text,
        page: pageNumber,
        selection: rectangles,
      });
    }
  };
  return (
    <div className="relative w-full">
      <div
        className="csm-pdf-stage"
        ref={stageRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
      >
        {!document && (
          <div className="csm-pdf-empty">
            <span className="csm-pdf-empty-icon">PDF</span>
            <strong>Choose a reviewer PDF to begin</strong>
            <p>
              Open a saved document from your Library. Highlight text with the
              Magic Marker to create flashcards, save notes, or mark key
              concepts.
            </p>
          </div>
        )}
        {document && loading && (
          <div className="csm-pdf-loading">
            <span className="csm-spinner" />
            Loading page…
          </div>
        )}
        {document && loadError && (
          <div className="csm-pdf-load-error">
            <strong>We couldn’t display this PDF</strong>
            <p>{loadError}</p>
            <a href={document.url} target="_blank" rel="noreferrer">
              Open the PDF in a new tab
            </a>
          </div>
        )}
        {document && !loadError && (
          <div
            className="csm-pdf-paper-wrap"
            style={{
              minHeight: Math.max(420, pageSize.height + 36),
            }}
          >
            <div
              className="csm-pdf-paper relative"
              ref={paperRef}
              style={{
                width: pageSize.width || "auto",
                height: pageSize.height || "auto",
              }}
            >
              <canvas ref={canvasRef} aria-hidden="true" />
              <div className="csm-pdf-saved-marks" aria-hidden="true">
                {highlights
                  .filter((item) => Number(item.page) === Number(pageNumber))
                  .flatMap((item) =>
                    (item.selection || []).map((rect, index) => (
                      <i
                        key={`${item.id}-${index}`}
                        style={{
                          left: `${rect.x * 100}%`,
                          top: `${rect.y * 100}%`,
                          width: `${rect.width * 100}%`,
                          height: `${rect.height * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    )),
                  )}
              </div>
              <div
                className="textLayer csm-pdf-text-layer"
                ref={textLayerRef}
                aria-label={`Selectable PDF page ${pageNumber}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vaia Magic Marker Floating Bar */}
      {selectedText && onQuickAction && (
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl border border-slate-700/80 text-xs font-semibold whitespace-nowrap"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300 uppercase tracking-wider pl-1 pr-2.5 border-r border-slate-700/90 shrink-0">
            <IconHighlighter className="w-3.5 h-3.5 text-amber-400" />
            <span>Magic Marker</span>
          </div>

          <button
            type="button"
            onClick={() => onQuickAction("card", selectedText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-all text-xs font-bold cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Create study flashcard from this selection"
          >
            <IconCards className="w-3.5 h-3.5 text-white" />
            <span>Create Flashcard</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickAction("note", selectedText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all text-xs font-semibold cursor-pointer border border-slate-700 active:scale-95 shrink-0"
            title="Save selected text to document notes"
          >
            <IconFileText className="w-3.5 h-3.5 text-slate-300" />
            <span>Add to Notes</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700/90 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-0.5">
              Highlight:
            </span>
            {[
              {
                color: "#f5a23a",
                label: "Orange",
              },
              {
                color: "#8dc7ef",
                label: "Blue",
              },
              {
                color: "#a8d8a8",
                label: "Green",
              },
              {
                color: "#f472b6",
                label: "Pink",
              },
            ].map(({ color, label }) => (
              <button
                key={color}
                type="button"
                onClick={() => onQuickAction("highlight", selectedText, color)}
                className="w-4 h-4 rounded-full border border-white/50 cursor-pointer hover:scale-125 transition-transform shadow-xs"
                style={{
                  backgroundColor: color,
                }}
                title={`Highlight in ${label}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedText("");
              if (window.getSelection) window.getSelection().removeAllRanges();
            }}
            className="ml-1 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
            title="Dismiss selection"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
