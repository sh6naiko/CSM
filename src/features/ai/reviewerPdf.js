export const createAiReviewerPdf = (reviewer, deckTitle) => {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const gutter = 24;
  const columnWidth = (pageWidth - margin * 2 - gutter) / 2;
  const leftX = margin;
  const rightX = margin + columnWidth + gutter;
  const dividerX = margin + columnWidth + gutter / 2;
  const topLimit = 96;
  const bottomLimit = 795;
  const cp1252 = {
    "€": 0x80,
    "‚": 0x82,
    ƒ: 0x83,
    "„": 0x84,
    "…": 0x85,
    "†": 0x86,
    "‡": 0x87,
    ˆ: 0x88,
    "‰": 0x89,
    Š: 0x8a,
    "‹": 0x8b,
    Œ: 0x8c,
    Ž: 0x8e,
    "‘": 0x91,
    "’": 0x92,
    "“": 0x93,
    "”": 0x94,
    "•": 0x95,
    "–": 0x96,
    "—": 0x97,
    "˜": 0x98,
    "™": 0x99,
    š: 0x9a,
    "›": 0x9b,
    œ: 0x9c,
    ž: 0x9e,
    Ÿ: 0x9f,
  };
  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/[\u2192]/g, "->")
      .replace(/[\u2190]/g, "<-")
      .replace(/[\u00d7]/g, "x")
      .replace(/[\u2264]/g, "<=")
      .replace(/[\u2265]/g, ">=")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(
        /[^\x20-\x7e\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]/g,
        " ",
      );
  const pdfHex = (value) =>
    `<${Array.from(normalizeText(value), (character) => {
      const code = cp1252[character] ?? character.charCodeAt(0);
      return code.toString(16).padStart(2, "0").toUpperCase();
    }).join("")}>`;
  const estimateWidth = (value, size, bold = false) =>
    Array.from(normalizeText(value)).reduce((sum, character) => {
      const factor = " il.,:;!'|".includes(character)
        ? 0.25
        : "MW@%&".includes(character)
          ? 0.82
          : "frt()[]".includes(character)
            ? 0.36
            : character === " "
              ? 0.28
              : 0.52;
      return sum + factor * size * (bold ? 1.035 : 1);
    }, 0);
  const wrapText = (value, size, width, bold = false) => {
    const words = normalizeText(value).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    words.forEach((word) => {
      if (estimateWidth(word, size, bold) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        let piece = "";
        Array.from(word).forEach((character) => {
          if (piece && estimateWidth(piece + character, size, bold) > width) {
            lines.push(piece);
            piece = character;
          } else piece += character;
        });
        line = piece;
        return;
      }
      const nextLine = line ? `${line} ${word}` : word;
      if (line && estimateWidth(nextLine, size, bold) > width) {
        lines.push(line);
        line = word;
      } else line = nextLine;
    });
    if (line) lines.push(line);
    return lines;
  };
  const pages = [];
  let commands;
  let column = 0;
  let cursorY = topLimit;
  const drawText = (
    text,
    x,
    yFromTop,
    size,
    bold = false,
    color = "0.12 0.17 0.25",
  ) => {
    commands.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${(pageHeight - yFromTop).toFixed(2)} Tm ${pdfHex(text)} Tj ET`,
    );
  };
  const drawRule = (x1, y1, x2, y2, color = "0.86 0.89 0.93", width = 0.6) => {
    commands.push(
      `q ${color} RG ${width} w ${x1.toFixed(2)} ${(pageHeight - y1).toFixed(2)} m ${x2.toFixed(2)} ${(pageHeight - y2).toFixed(2)} l S Q`,
    );
  };
  const startPage = () => {
    commands = [];
    pages.push(commands);
    drawText(
      reviewer.title || "Study Reviewer",
      margin,
      37,
      17,
      true,
      "0.08 0.13 0.22",
    );
    const titleLines = wrapText(
      deckTitle || "Generated reviewer",
      margin,
      pageWidth - margin * 2 - 115,
      false,
    );
    titleLines
      .slice(0, 2)
      .forEach((line, index) =>
        drawText(line, margin, 54 + index * 12, 9, false, "0.34 0.41 0.51"),
      );
    drawText(
      new Date().toLocaleDateString(),
      pageWidth - margin - 93,
      53,
      8,
      false,
      "0.42 0.49 0.59",
    );
    drawRule(margin, 72, pageWidth - margin, 72, "0.82 0.86 0.91", 0.8);
    drawRule(dividerX, 87, dividerX, 807, "0.86 0.89 0.93", 0.6);
    column = 0;
    cursorY = topLimit;
  };
  const advanceColumn = () => {
    if (column === 0) {
      column = 1;
      cursorY = topLimit;
    } else startPage();
  };
  const sectionsToRender = Array.isArray(reviewer.sections)
    ? reviewer.sections
    : [];
  startPage();
  sectionsToRender.forEach((section) => {
    const textWidth = columnWidth - 2;
    const blocks = [
      {
        text: section.heading,
        size: 10.2,
        bold: true,
        color: "0.42 0.31 0.62",
        gap: 0,
        leading: 14,
        kind: "heading",
      },
    ];
    (Array.isArray(section.blocks) ? section.blocks : []).forEach((block) => {
      if (block.type === "definition") {
        blocks.push({
          text: block.term,
          size: 9.2,
          bold: true,
          color: "0.10 0.13 0.19",
          gap: 5,
          leading: 12,
        });
        blocks.push({
          text: block.explanation,
          size: 9,
          bold: false,
          color: "0.12 0.15 0.20",
          gap: 1,
          leading: 12,
        });
      } else if (block.text) {
        const isBullet = block.type === "bullet";
        const isTakeaway = block.type === "key_takeaway";
        blocks.push({
          text: `${isBullet ? "-  " : ""}${block.text}`,
          size: 9,
          bold: isTakeaway,
          color: isTakeaway ? "0.10 0.13 0.19" : "0.12 0.15 0.20",
          gap: 4,
          leading: 12,
        });
      }
    });
    const prepared = blocks.map((block) => ({
      ...block,
      lines: wrapText(block.text, block.size, textWidth, block.bold),
    }));
    const blockHeight =
      prepared.reduce(
        (height, block) =>
          height + block.gap + block.lines.length * block.leading,
        0,
      ) + 10;
    if (
      blockHeight <= bottomLimit - topLimit &&
      cursorY + blockHeight > bottomLimit
    )
      advanceColumn();
    prepared.forEach((block) => {
      cursorY += block.gap;
      block.lines.forEach((line) => {
        if (cursorY + block.leading > bottomLimit) advanceColumn();
        const lineX =
          (column === 0 ? leftX : rightX) + (block.kind === "heading" ? 0 : 4);
        drawText(
          line,
          lineX,
          cursorY + block.leading - 2,
          block.size,
          block.bold,
          block.color,
        );
        cursorY += block.leading;
      });
    });
    cursorY += 7;
    drawRule(
      column === 0 ? leftX : rightX,
      cursorY,
      (column === 0 ? leftX : rightX) + columnWidth,
      cursorY,
      "0.91 0.93 0.96",
      0.45,
    );
    cursorY += 11;
  });
  pages.forEach((pageCommands, index) => {
    pageCommands.push(
      `BT /F1 8 Tf 0.48 0.54 0.62 rg 1 0 0 1 ${(pageWidth - margin - 42).toFixed(2)} 20 Tm ${pdfHex(`Page ${index + 1} of ${pages.length}`)} Tj ET`,
    );
  });
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((pageCommands, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    const stream = `${pageCommands.join("\n")}\n`;
    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] =
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });
  let pdf = "%PDF-1.4\n%CSM-PDF\n";
  const offsets = [0];
  for (let objectNumber = 1; objectNumber < objects.length; objectNumber++) {
    offsets[objectNumber] = pdf.length;
    pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let objectNumber = 1; objectNumber < objects.length; objectNumber++)
    pdf += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const blob = new Blob([pdf], {
    type: "application/pdf",
  });
  const safeTitle =
    String(deckTitle || "generated-reviewer")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "generated-reviewer";
  return {
    blob,
    filename: `AI-generated-${safeTitle}-reviewer.pdf`,
  };
};
export const downloadAiReviewerPdf = (artifact) => {
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
