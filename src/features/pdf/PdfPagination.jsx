import { IconArrowLeft, IconArrowRight } from "../../components/icons.jsx";
import React from "react";
import { Button } from "../../components/ui/Button.jsx";
export function PdfPagination({
  page,
  pageCount,
  onPageChange,
  disabled = false,
  position = "bottom",
}) {
  return (
    <nav
      className={`csm-pdf-pagination ${position === "top" ? "is-top" : ""}`}
      aria-label={`${position === "top" ? "Top" : "Bottom"} PDF page navigation`}
    >
      <Button
        onClick={() => onPageChange((current) => Math.max(1, current - 1))}
        disabled={disabled || page <= 1}
      >
        <IconArrowLeft className="w-4 h-4" />
        <span>Previous</span>
      </Button>
      <label>
        <span>Page</span>
        <input
          type="number"
          min="1"
          max={pageCount || undefined}
          value={page}
          onChange={(event) => {
            const nextPage = Number(event.target.value);
            if (
              Number.isInteger(nextPage) &&
              nextPage > 0 &&
              (!pageCount || nextPage <= pageCount)
            )
              onPageChange(nextPage);
          }}
          disabled={disabled}
          aria-label="PDF page number"
        />
        <span>of {pageCount || "—"}</span>
      </label>
      <Button
        onClick={() =>
          onPageChange((current) =>
            pageCount ? Math.min(pageCount, current + 1) : current + 1,
          )
        }
        disabled={disabled || (pageCount > 0 && page >= pageCount)}
      >
        <span>Next</span>
        <IconArrowRight className="w-4 h-4" />
      </Button>
    </nav>
  );
}
