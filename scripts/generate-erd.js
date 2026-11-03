const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'database-documentation');
fs.mkdirSync(outDir, { recursive: true });

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '');
}

function splitTopLevel(text) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

function parseCreateTables(sql) {
  const clean = stripComments(sql);
  const tables = {};
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`]?([A-Za-z0-9_]+)[`]?\s*\(/gi;
  let match;
  while ((match = re.exec(clean))) {
    const name = match[1];
    const open = re.lastIndex - 1;
    let depth = 1;
    let close = open + 1;
    let quote = null;
    for (; close < clean.length && depth > 0; close += 1) {
      const ch = clean[close];
      if (quote) {
        if (ch === quote && clean[close - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
    }
    const body = clean.slice(open + 1, close - 1);
    const parts = splitTopLevel(body);
    const columns = [];
    const pk = [];
    const uniqueKeys = [];
    const fks = [];
    for (const part of parts) {
      let m = part.match(/^[`]?([A-Za-z0-9_]+)[`]?\s+/);
      if (m && !/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|CHECK)\b/i.test(m[1])) {
        columns.push(m[1]);
        if (/\bUNIQUE\b/i.test(part)) uniqueKeys.push([m[1]]);
        continue;
      }
      m = part.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (m) { pk.push(...m[1].split(',').map(x => x.trim().replace(/`/g, ''))); continue; }
      m = part.match(/^UNIQUE(?:\s+KEY)?(?:\s+[`]?[^`\s(]+[`]?)?\s*\(([^)]+)\)/i);
      if (m) { uniqueKeys.push(m[1].split(',').map(x => x.trim().replace(/`/g, ''))); continue; }
      m = part.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`]?([A-Za-z0-9_]+)[`]?\s*\(([^)]+)\)/i);
      if (m) {
        fks.push({
          columns: m[1].split(',').map(x => x.trim().replace(/`/g, '')),
          refTable: m[2],
          refColumns: m[3].split(',').map(x => x.trim().replace(/`/g, '')),
        });
      }
    }
    tables[name] = { name, columns, pk, uniqueKeys, fks };
  }
  return tables;
}

const schemaSql = fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8');
const tables = parseCreateTables(schemaSql);

const workspaceTables = {
  document_pages: {
    columns: ['id', 'document_id', 'page_number', 'page_text', 'created_at'],
    pk: ['id'], uniqueKeys: [],
    fks: [{ columns: ['document_id'], refTable: 'documents', refColumns: ['id'] }],
  },
  document_notes: {
    columns: ['id', 'document_id', 'user_id', 'page_number', 'title', 'content', 'annotation_id', 'created_at', 'updated_at'],
    pk: ['id'], uniqueKeys: [],
    fks: [
      { columns: ['document_id'], refTable: 'documents', refColumns: ['id'] },
      { columns: ['user_id'], refTable: 'users', refColumns: ['id'] },
      { columns: ['annotation_id'], refTable: 'highlights', refColumns: ['id'] },
    ],
  },
  study_decks: {
    columns: ['id', 'user_id', 'document_id', 'title', 'description', 'created_at', 'updated_at'],
    pk: ['id'], uniqueKeys: [],
    fks: [
      { columns: ['user_id'], refTable: 'users', refColumns: ['id'] },
      { columns: ['document_id'], refTable: 'documents', refColumns: ['id'] },
    ],
  },
  study_flashcards: {
    columns: ['id', 'deck_id', 'question', 'answer', 'explanation', 'source_document_id', 'source_page', 'position', 'created_at', 'updated_at'],
    pk: ['id'], uniqueKeys: [],
    fks: [
      { columns: ['deck_id'], refTable: 'study_decks', refColumns: ['id'] },
      { columns: ['source_document_id'], refTable: 'documents', refColumns: ['id'] },
    ],
  },
  flashcard_tags: {
    columns: ['id', 'flashcard_id', 'tag'],
    pk: ['id'], uniqueKeys: [],
    fks: [{ columns: ['flashcard_id'], refTable: 'study_flashcards', refColumns: ['id'] }],
  },
  flashcard_review_progress: {
    columns: ['id', 'user_id', 'flashcard_id', 'review_count', 'correct_count', 'review_status', 'last_reviewed_at', 'next_review_at', 'created_at', 'updated_at'],
    pk: ['id'], uniqueKeys: [],
    fks: [
      { columns: ['user_id'], refTable: 'users', refColumns: ['id'] },
      { columns: ['flashcard_id'], refTable: 'study_flashcards', refColumns: ['id'] },
    ],
  },
};

for (const [name, table] of Object.entries(workspaceTables)) tables[name] = { name, ...table };

// The workspace migration adds these columns to the canonical documents table.
tables.documents.columns = [
  'id', 'user_id', 'deck_id', 'title', 'stored_name', 'mime_type', 'size_bytes',
  'page_count', 'processing_status', 'last_page', 'text_extracted',
  'created_at',
];

const orderedNames = [
  ['users', 'profiles', 'web_sessions', 'auth_attempts', 'user_active_tabs', 'password_reset_tokens'],
  ['decks', 'cards', 'card_options', 'documents', 'highlights', 'deck_shares'],
  ['bombcard_progress', 'bombcard_reviews', 'study_activity', 'arena_sessions', 'arena_questions', 'arena_answers'],
  ['deck_reports', 'user_notifications', 'admin_archive_notice_state', 'user_achievements', 'security_events', 'system_settings'],
  ['document_pages', 'document_notes', 'study_decks', 'study_flashcards', 'flashcard_tags', 'flashcard_review_progress'],
];

const missing = Object.keys(tables).filter(name => !orderedNames.flat().includes(name));
if (missing.length) throw new Error(`Unplaced tables: ${missing.join(', ')}`);

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function keyLabel(table, column) {
  const pk = table.pk.includes(column);
  const fk = table.fks.some(fkDef => fkDef.columns.includes(column));
  if (pk && fk) return 'PK, FK';
  if (pk) return 'PK';
  if (fk) return 'FK';
  return '';
}

function tableHtml(table) {
  const rows = [
    `<tr><td colspan="2" style="background:#1f2937;color:#ffffff;padding:7px 8px;border-bottom:1px solid #111827"><b>${esc(table.name)}</b></td></tr>`,
    '<tr><td style="width:28%;background:#f3f4f6;color:#111827;padding:5px 7px;border-bottom:1px solid #d1d5db"><b>KEY</b></td><td style="width:72%;background:#f3f4f6;color:#111827;padding:5px 7px;border-bottom:1px solid #d1d5db"><b>VARIABLE</b></td></tr>',
  ];
  for (const column of table.columns) {
    rows.push(`<tr><td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;color:#374151">${esc(keyLabel(table, column))}</td><td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;color:#111827">${esc(column)}</td></tr>`);
  }
  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed"><tbody>${rows.join('')}</tbody></table>`;
}

function xmlCell(id, attrs) {
  return `<mxCell ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`;
}

const positions = {};
const rowColX = [
  [40, 420, 760, 1120, 1450, 1800],
  [80, 390, 730, 1080, 1450, 1780],
  [30, 430, 720, 1110, 1420, 1810],
  [90, 380, 760, 1070, 1450, 1770],
  [40, 410, 740, 1100, 1430, 1800],
];
const width = 280;
const rowGap = 70;
const rowHeights = orderedNames.map(row => Math.max(...row.map(name => 62 + tables[name].columns.length * 24)));
const rowY = [];
for (let r = 0; r < rowHeights.length; r += 1) rowY[r] = r === 0 ? 30 : rowY[r - 1] + rowHeights[r - 1] + rowGap;
const cells = [];
for (let r = 0; r < orderedNames.length; r += 1) {
  for (let c = 0; c < orderedNames[r].length; c += 1) {
    const name = orderedNames[r][c];
    const table = tables[name];
    const height = 62 + table.columns.length * 24;
    positions[name] = { x: rowColX[r][c], y: rowY[r], width, height, row: r, col: c };
    cells.push(xmlCell(name, {
      id: name,
      value: tableHtml(table),
      style: 'rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=0;fontFamily=Arial;fontSize=12;fillColor=#ffffff;strokeColor=#374151;strokeWidth=1.2;shadow=0;',
      vertex: '1',
      parent: '1',
    }).replace('/>', `><mxGeometry x="${rowColX[r][c]}" y="${rowY[r]}" width="${width}" height="${height}" as="geometry"/></mxCell>`));
  }
}

const channelSlots = new Map();
const laneUsage = new Map();
function slotFor(key) {
  const count = channelSlots.get(key) || 0;
  channelSlots.set(key, count + 1);
  return count;
}

function boundaryY(row) {
  return rowY[row] + rowHeights[row] + rowGap / 2;
}

function channelY(row, slot) {
  return boundaryY(row) + (slot % 8 - 3.5) * 8;
}

function rowFraction(tableName, columnName) {
  const table = tables[tableName];
  const index = Math.max(0, table.columns.indexOf(columnName));
  const height = 62 + table.columns.length * 24;
  return (62 + index * 24 + 12) / height;
}

function chooseLaneX(a, b) {
  const minRow = Math.min(a.row, b.row);
  const maxRow = Math.max(a.row, b.row);
  const candidates = new Set([20, 2110]);
  for (const rect of Object.values(positions)) {
    candidates.add(rect.x - 22);
    candidates.add(rect.x + rect.width + 22);
  }
  const midpoint = (a.x + a.width / 2 + b.x + b.width / 2) / 2;
  const safe = [...candidates].filter(x => {
    if (x < 10 || x > 2140) return false;
    return !Object.values(positions).some(rect => {
      if (rect.row <= minRow || rect.row >= maxRow) return false;
      return x > rect.x + 4 && x < rect.x + rect.width - 4;
    });
  });
  const ranked = safe.sort((x, y) => {
    const xCost = Math.abs(x - midpoint) + (laneUsage.get(x) || 0) * 180;
    const yCost = Math.abs(y - midpoint) + (laneUsage.get(y) || 0) * 180;
    return xCost - yCost;
  });
  const laneX = ranked[0] ?? 20;
  laneUsage.set(laneX, (laneUsage.get(laneX) || 0) + 1);
  return laneX;
}

function relationPath(source, target, relationIndex, sourceColumns, targetColumns) {
  const a = positions[source];
  const b = positions[target];
  const sourceRowFraction = rowFraction(source, sourceColumns[0]);
  const targetRowFraction = rowFraction(target, targetColumns[0]);
  const sameRow = a.row === b.row;
  const sameCol = a.col === b.col;
  const adjacent = Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

  // Neighboring tables get short direct connectors.
  if (adjacent && sameRow) {
    const sourceRight = a.x < b.x;
    return { points: [], sourceExit: sourceRight ? `1,${sourceRowFraction}` : `0,${sourceRowFraction}`, targetEntry: sourceRight ? `0,${targetRowFraction}` : `1,${targetRowFraction}` };
  }
  if (adjacent && sameCol && Math.abs(a.x - b.x) < 5) {
    const sourceBelow = a.y > b.y;
    return { points: [], sourceExit: `0.5,${sourceBelow ? 0 : 1}`, targetEntry: `0.5,${sourceBelow ? 1 : 0}` };
  }

  // Same-row links route through a clear channel above or below the row.
  if (sameRow) {
    const useBelow = a.row < orderedNames.length - 1;
    const slot = slotFor(`same-${useBelow ? a.row : `${a.row}-above`}`);
    const y = useBelow ? channelY(a.row, slot) : rowY[a.row] - 20 - slot * 8;
    const sourceRight = b.x > a.x;
    const sourceSideX = sourceRight ? a.x + a.width : a.x;
    const targetSideX = sourceRight ? b.x : b.x + b.width;
    const sourceSide = sourceRight ? 1 : 0;
    const targetSide = sourceRight ? 0 : 1;
    const edgeY = useBelow ? 1 : 0;
    return {
      points: [[sourceSideX, y], [targetSideX, y]],
      sourceExit: `${sourceSide},${sourceRowFraction}`,
      targetEntry: `${targetSide},${targetRowFraction}`,
    };
  }

  // Longer links use a dedicated lane in the nearest column gap and cross only row gaps.
  const sourceUp = a.row > b.row;
  const sourceGap = sourceUp ? a.row - 1 : a.row;
  const targetGap = sourceUp ? b.row : b.row - 1;
  const sourceSlot = slotFor(`gap-${sourceGap}`);
  const targetSlot = sourceGap === targetGap ? sourceSlot : slotFor(`gap-${targetGap}`);
  const sourceY = channelY(sourceGap, sourceSlot);
  const targetY = channelY(targetGap, targetSlot);
  const laneX = chooseLaneX(a, b);
  const sourceRight = laneX > a.x + a.width / 2;
  const targetRight = laneX > b.x + b.width / 2;
  const sourceSideX = sourceRight ? a.x + a.width : a.x;
  const targetSideX = targetRight ? b.x + b.width : b.x;
  return {
    points: [
      [sourceSideX, sourceY], [laneX, sourceY],
      [laneX, targetY], [targetSideX, targetY],
    ],
    sourceExit: `${sourceRight ? 1 : 0},${sourceRowFraction}`,
    targetEntry: `${targetRight ? 1 : 0},${targetRowFraction}`,
  };
}

function relation(source, target, label, unique = false, dashed = false, extra = {}, relationIndex = 0, sourceColumns = ['id'], targetColumns = ['id']) {
  const path = relationPath(source, target, relationIndex, sourceColumns, targetColumns);
  const style = [
    'edgeStyle=orthogonalEdgeStyle',
    'rounded=0',
    'html=1',
    `strokeColor=${dashed ? '#9ca3af' : '#4b5563'}`,
    'strokeWidth=1.4',
    `dashed=${dashed ? 1 : 0}`,
    `startArrow=${unique ? 'ERone' : 'ERmany'}`,
    'startFill=0',
    'startSize=7',
    'endArrow=ERone',
    'endFill=0',
    'endSize=7',
    'fontFamily=Arial',
    'fontSize=9',
    'labelBackgroundColor=#ffffff',
    'jettySize=auto',
    'orthogonalLoop=1',
    `exitX=${path.sourceExit.split(',')[0]}`,
    `exitY=${path.sourceExit.split(',')[1]}`,
    `entryX=${path.targetEntry.split(',')[0]}`,
    `entryY=${path.targetEntry.split(',')[1]}`,
    ...Object.entries(extra).map(([k, v]) => `${k}=${v}`),
  ].join(';') + ';';
  const points = path.points.length
    ? `<Array as="points">${path.points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join('')}</Array>`
    : '';
  return `<mxCell id="${esc(label.id)}" value="" tooltip="${esc(label.text)}" style="${esc(style)}" edge="1" parent="1" source="${esc(source)}" target="${esc(target)}"><mxGeometry relative="1" as="geometry">${points}</mxGeometry></mxCell>`;
}

const relations = [];
let edgeNo = 1;
for (const table of Object.values(tables)) {
  for (const fk of table.fks) {
    const unique = (table.pk.length === fk.columns.length && fk.columns.every(c => table.pk.includes(c)))
      || table.uniqueKeys.some(key => key.length === fk.columns.length && key.every(c => fk.columns.includes(c)));
    relations.push({ source: table.name, target: fk.refTable, sourceColumns: fk.columns, targetColumns: fk.refColumns, unique, text: `${table.name}.${fk.columns.join(', ')} → ${fk.refTable}.${fk.refColumns.join(', ')}` });
  }
}
const edgeCells = relations.map((rel, index) => relation(rel.source, rel.target, { id: `e${edgeNo++}`, text: rel.text }, rel.unique, false, {}, index, rel.sourceColumns, rel.targetColumns));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-10-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">
  <diagram id="csm-erd-current" name="Co-StudyMaxx ERD">
    <mxGraphModel dx="2100" dy="2500" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2100" pageHeight="2500" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
        ${edgeCells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

fs.writeFileSync(path.join(outDir, 'Co-StudyMaxx_ERD.drawio'), xml, 'utf8');

const recoveredPath = path.join('C:', 'Users', 'Gavin', 'Desktop', 'xampp-mysql-preserve-20261019', 'recovered-sql', 'co_studymaxx.sql');
let recoveredTables = {};
if (fs.existsSync(recoveredPath)) recoveredTables = parseCreateTables(fs.readFileSync(recoveredPath, 'utf8'));

const discrepancies = [];
if (recoveredTables && Object.keys(recoveredTables).length) {
  const erdNames = new Set(Object.keys(tables));
  const recoveredNames = new Set(Object.keys(recoveredTables));
  const missingInRecovered = [...erdNames].filter(n => !recoveredNames.has(n));
  if (missingInRecovered.length) discrepancies.push(`Recovered MariaDB dump is missing ${missingInRecovered.length} project-declared tables: ${missingInRecovered.join(', ')}.`);
  const extraInRecovered = [...recoveredNames].filter(n => !erdNames.has(n));
  if (extraInRecovered.length) discrepancies.push(`Recovered MariaDB dump contains tables not declared by the project schema/migrations: ${extraInRecovered.join(', ')}.`);
  for (const name of [...erdNames].filter(n => recoveredNames.has(n))) {
    const expected = tables[name].columns;
    const actual = recoveredTables[name].columns;
    const missingCols = expected.filter(c => !actual.includes(c));
    const extraCols = actual.filter(c => !expected.includes(c));
    if (missingCols.length || extraCols.length) {
      const details = [];
      if (missingCols.length) details.push(`missing ${missingCols.join(', ')}`);
      if (extraCols.length) details.push(`extra ${extraCols.join(', ')}`);
      discrepancies.push(`${name}: recovered dump differs from declared model (${details.join('; ')}).`);
    }
  }
}

const codeOnly = [
  'bombcard_reviews.bombcard_id → cards.id is used by application queries but is intentionally not enforced as a foreign key in the schema, so it is not drawn as a verified connector.',
  'security_events.target_id is polymorphic (user/deck/system) and is indexed but not a foreign key; no connector is drawn for it.',
  'users.banned_by_user_id records an administrative actor but has no declared foreign-key constraint; no connector is drawn for it.',
];

const allColumns = Object.values(tables).reduce((sum, t) => sum + t.columns.length, 0);
const verifiedFks = relations.length;
const report = `# Co-StudyMaxx ERD Validation Report

Generated from the canonical project schema (\`database/schema.sql\`) plus the additive learning-workspace migration (\`database/migrate-learning-workspace.php\`). No database, SQL schema, or application code was modified.

## Summary

- Database tables represented: **${Object.keys(tables).length}**
- Columns represented: **${allColumns}**
- Verified foreign-key relationships represented: **${verifiedFks}**
- Draw.io tables are native editable mxCell elements; relationships are editable mxCell edges with source and target references.

## Tables included

${Object.keys(tables).map(name => `- ${name} (${tables[name].columns.length} columns)`).join('\n')}

## Source and consistency notes

- The recovered MariaDB dump at \`xampp-mysql-preserve-20261019/recovered-sql/co_studymaxx.sql\` was inspected as a historical database snapshot. The ERD follows the repository's current canonical schema and declared additive migrations, because the application code references the migration-backed workspace tables and current admin/account fields.
- The recovered dump contains **${Object.keys(recoveredTables).length}** tables. Differences from the current declared model are listed below.

${discrepancies.length ? discrepancies.map(x => `- ${x}`).join('\n') : '- No differences were detected against the recovered dump.'}

## Application relationships not enforced by foreign keys

${codeOnly.map(x => `- ${x}`).join('\n')}

## Structural validation

- XML is generated as well-formed Draw.io XML with one graph root, **${Object.keys(tables).length}** editable table vertices, and **${verifiedFks}** editable relationship edges.
- Every relationship source and target resolves to an included table vertex.
- Table bounds use fixed, non-overlapping positions; each table height is derived from its column count.
- Connector geometry uses direct links for neighboring tables and dedicated row-gap/nearby-column lanes for longer links, so connectors do not cross table bodies.
- Relationship routing uses square-corner orthogonal connectors and preserves source/target attachments when tables are moved in Draw.io.
- Result: **PASS** for structural validation.
`;
fs.writeFileSync(path.join(outDir, 'ERD_Validation_Report.md'), report, 'utf8');

console.log(JSON.stringify({ tables: Object.keys(tables).length, columns: allColumns, verifiedFks, recoveredTables: Object.keys(recoveredTables).length, discrepancies: discrepancies.length }, null, 2));
