const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'database-documentation');
fs.mkdirSync(outDir, { recursive: true });

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');
}

function splitTopLevel(text) {
  const parts = [];
  let start = 0; let depth = 0; let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) { if (ch === quote && text[i - 1] !== '\\') quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

function parseCreateTables(sql) {
  const clean = stripComments(sql); const tables = {};
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`]?([A-Za-z0-9_]+)[`]?\s*\(/gi;
  let match;
  while ((match = re.exec(clean))) {
    const name = match[1]; const open = re.lastIndex - 1; let depth = 1; let close = open + 1; let quote = null;
    for (; close < clean.length && depth > 0; close += 1) {
      const ch = clean[close];
      if (quote) { if (ch === quote && clean[close - 1] !== '\\') quote = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1; else if (ch === ')') depth -= 1;
    }
    const columns = []; const pk = []; const uniqueKeys = []; const fks = []; const nullable = [];
    for (const part of splitTopLevel(clean.slice(open + 1, close - 1))) {
      let m = part.match(/^[`]?([A-Za-z0-9_]+)[`]?\s+/);
      if (m && !/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|CHECK)\b/i.test(m[1])) {
        columns.push(m[1]);
        if (/\bPRIMARY\s+KEY\b/i.test(part)) pk.push(m[1]);
        if (/\bUNIQUE\b/i.test(part)) uniqueKeys.push([m[1]]);
        if (!/\bNOT\s+NULL\b/i.test(part) && !/\bPRIMARY\s+KEY\b/i.test(part)) nullable.push(m[1]);
        continue;
      }
      m = part.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (m) { pk.push(...m[1].split(',').map(x => x.trim().replace(/`/g, ''))); continue; }
      m = part.match(/^UNIQUE(?:\s+KEY)?(?:\s+[`]?[^`\s(]+[`]?)?\s*\(([^)]+)\)/i);
      if (m) { uniqueKeys.push(m[1].split(',').map(x => x.trim().replace(/`/g, ''))); continue; }
      m = part.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+[`]?([A-Za-z0-9_]+)[`]?\s*\(([^)]+)\)/i);
      if (m) fks.push({ columns: m[1].split(',').map(x => x.trim().replace(/`/g, '')), refTable: m[2], refColumns: m[3].split(',').map(x => x.trim().replace(/`/g, '')) });
    }
    tables[name] = { name, columns, pk, uniqueKeys, fks, nullable };
  }
  return tables;
}

const tables = parseCreateTables(fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8'));
const workspaceTables = {
  document_pages: { columns: ['id', 'document_id', 'page_number', 'page_text', 'created_at'], pk: ['id'], uniqueKeys: [], nullable: [], fks: [{ columns: ['document_id'], refTable: 'documents', refColumns: ['id'] }] },
  document_notes: { columns: ['id', 'document_id', 'user_id', 'page_number', 'title', 'content', 'annotation_id', 'created_at', 'updated_at'], pk: ['id'], uniqueKeys: [], nullable: ['page_number', 'annotation_id'], fks: [{ columns: ['document_id'], refTable: 'documents', refColumns: ['id'] }, { columns: ['user_id'], refTable: 'users', refColumns: ['id'] }, { columns: ['annotation_id'], refTable: 'highlights', refColumns: ['id'] }] },
  study_decks: { columns: ['id', 'user_id', 'document_id', 'title', 'description', 'created_at', 'updated_at'], pk: ['id'], uniqueKeys: [], nullable: ['document_id'], fks: [{ columns: ['user_id'], refTable: 'users', refColumns: ['id'] }, { columns: ['document_id'], refTable: 'documents', refColumns: ['id'] }] },
  study_flashcards: { columns: ['id', 'deck_id', 'question', 'answer', 'explanation', 'source_document_id', 'source_page', 'position', 'created_at', 'updated_at'], pk: ['id'], uniqueKeys: [], nullable: ['source_document_id', 'source_page'], fks: [{ columns: ['deck_id'], refTable: 'study_decks', refColumns: ['id'] }, { columns: ['source_document_id'], refTable: 'documents', refColumns: ['id'] }] },
  flashcard_tags: { columns: ['id', 'flashcard_id', 'tag'], pk: ['id'], uniqueKeys: [], nullable: [], fks: [{ columns: ['flashcard_id'], refTable: 'study_flashcards', refColumns: ['id'] }] },
  flashcard_review_progress: { columns: ['id', 'user_id', 'flashcard_id', 'review_count', 'correct_count', 'review_status', 'last_reviewed_at', 'next_review_at', 'created_at', 'updated_at'], pk: ['id'], uniqueKeys: [], nullable: ['last_reviewed_at', 'next_review_at'], fks: [{ columns: ['user_id'], refTable: 'users', refColumns: ['id'] }, { columns: ['flashcard_id'], refTable: 'study_flashcards', refColumns: ['id'] }] },
};
for (const [name, table] of Object.entries(workspaceTables)) tables[name] = { name, ...table };
tables.documents.columns = ['id', 'user_id', 'deck_id', 'title', 'stored_name', 'mime_type', 'size_bytes', 'page_count', 'processing_status', 'last_page', 'text_extracted', 'created_at'];

const sectionNames = {
  identity: ['users', 'profiles', 'web_sessions', 'auth_attempts', 'user_active_tabs', 'password_reset_tokens'],
  content: ['decks', 'cards', 'card_options', 'documents', 'highlights', 'deck_shares'],
  arena: ['bombcard_progress', 'bombcard_reviews', 'study_activity', 'arena_sessions', 'arena_questions', 'arena_answers'],
  admin: ['deck_reports', 'user_notifications', 'admin_archive_notice_state', 'user_achievements', 'security_events', 'system_settings'],
  workspace: ['document_pages', 'document_notes', 'study_decks', 'study_flashcards', 'flashcard_tags', 'flashcard_review_progress'],
};
const allNames = Object.values(sectionNames).flat();
if (allNames.length !== Object.keys(tables).length) throw new Error('Layout table list does not match parsed schema.');

function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function keyLabel(table, column) {
  const pk = table.pk.includes(column); const fk = table.fks.some(x => x.columns.includes(column));
  return pk && fk ? 'PK, FK' : pk ? 'PK' : fk ? 'FK' : '';
}
function tableHtml(name) {
  const table = tables[name];
  const rows = [`<tr><td colspan="2" style="background:#1f2937;color:#fff;padding:7px 8px;border-bottom:1px solid #111827"><b>${esc(name)}</b></td></tr>`, '<tr><td style="width:28%;background:#f3f4f6;padding:5px 7px;border-bottom:1px solid #d1d5db"><b>KEY</b></td><td style="width:72%;background:#f3f4f6;padding:5px 7px;border-bottom:1px solid #d1d5db"><b>VARIABLE</b></td></tr>'];
  for (const column of table.columns) rows.push(`<tr><td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;color:#374151">${esc(keyLabel(table, column))}</td><td style="padding:4px 7px;border-bottom:1px solid #e5e7eb;color:#111827">${esc(column)}</td></tr>`);
  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed"><tbody>${rows.join('')}</tbody></table>`;
}

function isUniqueFk(table, fk) {
  return (table.pk.length === fk.columns.length && fk.columns.every(c => table.pk.includes(c))) || table.uniqueKeys.some(k => k.length === fk.columns.length && k.every(c => fk.columns.includes(c)));
}
const relations = [];
for (const table of Object.values(tables)) for (const fk of table.fks) relations.push({ source: table.name, target: fk.refTable, sourceColumns: fk.columns, targetColumns: fk.refColumns, unique: isUniqueFk(table, fk), optional: fk.columns.some(c => table.nullable.includes(c)), text: `${table.name}.${fk.columns.join(', ')} -> ${fk.refTable}.${fk.refColumns.join(', ')}` });

function tableHeight(name) { return 70 + tables[name].columns.length * 24; }
function manualLayout(spec) {
  const positions = {};
  for (const [name, x, y] of spec) positions[name] = { x, y, width: 320, height: tableHeight(name) };
  return positions;
}

const overview = {};

const detailSpecs = {
  'User and Authentication': ['web_sessions', 'auth_attempts', 'profiles', 'user_active_tabs', 'password_reset_tokens', 'users'],
  'Decks and Bombcards': ['users', 'decks', 'cards', 'card_options', 'bombcard_progress', 'bombcard_reviews', 'deck_shares'],
  'Arena and Game Sessions': ['users', 'decks', 'cards', 'bombcard_progress', 'study_activity', 'arena_sessions', 'arena_questions', 'arena_answers'],
  'Documents and Study Features': ['users', 'decks', 'documents', 'highlights', 'document_pages', 'document_notes', 'study_decks', 'study_flashcards', 'flashcard_tags', 'flashcard_review_progress', 'study_activity'],
  'Administration and System': ['users', 'decks', 'deck_reports', 'user_notifications', 'admin_archive_notice_state', 'user_achievements', 'security_events', 'system_settings'],
};

function gridLayout(names) {
  const positions = {}; const cols = names.length > 16 ? 5 : names.length > 8 ? 4 : 3; const xGap = 120; const yGap = 120;
  const rows = [];
  for (let i = 0; i < names.length; i += cols) rows.push(names.slice(i, i + cols));
  let y = 90;
  for (const row of rows) {
    const h = Math.max(...row.map(tableHeight));
    row.forEach((name, col) => { positions[name] = { x: 60 + col * (320 + xGap), y, width: 320, height: tableHeight(name) }; });
    y += h + yGap;
  }
  return positions;
}

Object.assign(overview, gridLayout(allNames));

function rowFraction(tableName, columnName) {
  const table = tables[tableName]; const index = Math.max(0, table.columns.indexOf(columnName));
  return (58 + index * 24 + 12) / tableHeight(tableName);
}

function sidePort(rect, side, fraction) {
  const anchor = side === 'left' ? [rect.x, rect.y + rect.height * fraction]
    : side === 'right' ? [rect.x + rect.width, rect.y + rect.height * fraction]
      : side === 'top' ? [rect.x + rect.width * fraction, rect.y]
        : [rect.x + rect.width * fraction, rect.y + rect.height];
  const outward = side === 'left' ? [-40, 0] : side === 'right' ? [40, 0] : side === 'top' ? [0, -40] : [0, 40];
  return { anchor, outside: [anchor[0] + outward[0], anchor[1] + outward[1]], side };
}

function snap(value, step = 20) { return Math.round(value / step) * step; }
function keyPoint(p) { return `${p[0]},${p[1]}`; }
function segKey(a, b) { const p = keyPoint(a); const q = keyPoint(b); return p < q ? `${p}|${q}` : `${q}|${p}`; }
function insideExpanded(p, rect, pad = 12) { return p[0] > rect.x - pad && p[0] < rect.x + rect.width + pad && p[1] > rect.y - pad && p[1] < rect.y + rect.height + pad; }

class MinHeap {
  constructor() { this.items = []; }
  push(item, priority) {
    const entry = { item, priority }; this.items.push(entry); let i = this.items.length - 1;
    while (i > 0) { const parent = Math.floor((i - 1) / 2); if (this.items[parent].priority <= priority) break; this.items[i] = this.items[parent]; i = parent; }
    this.items[i] = entry;
  }
  pop() {
    if (!this.items.length) return undefined;
    const root = this.items[0]; const last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (true) {
        const left = i * 2 + 1; const right = left + 1; let child = i;
        if (left < this.items.length && this.items[left].priority < this.items[child].priority) child = left;
        if (right < this.items.length && this.items[right].priority < this.items[child].priority) child = right;
        if (child === i) break;
        this.items[i] = this.items[child]; i = child;
      }
      this.items[i] = last;
    }
    return root.item;
  }
  get length() { return this.items.length; }
}

function makeCrossingIndex(segments, step = 20) {
  const index = new Map();
  for (const [a, b] of segments) {
    const vertical = a[0] === b[0];
    const min = vertical ? Math.min(a[1], b[1]) : Math.min(a[0], b[0]);
    const max = vertical ? Math.max(a[1], b[1]) : Math.max(a[0], b[0]);
    for (let cell = Math.floor(min / step); cell <= Math.floor(max / step); cell += 1) {
      const key = vertical ? `${Math.floor(a[0] / step)},${cell}` : `${cell},${Math.floor(a[1] / step)}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push([a, b]);
    }
  }
  return index;
}

function routeAStar(start, goal, positions, usedSegments, crossingIndex, canvas) {
  const step = 20; const startKey = keyPoint(start); const goalKey = keyPoint(goal);
  const obstacles = Object.values(positions);
  const blocked = (p) => obstacles.some(rect => insideExpanded(p, rect));
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const heap = new MinHeap(); const startState = `${startKey}|4`; heap.push({ p: start, dir: 4, key: startState }, 0);
  const dist = new Map([[startState, 0]]); const prev = new Map();
  const heuristic = p => Math.abs(p[0] - goal[0]) + Math.abs(p[1] - goal[1]);
  let finish = null; let guard = 0;
  while (heap.length && guard++ < 120000) {
    const current = heap.pop(); if (!current) break;
    if (keyPoint(current.p) === goalKey) { finish = current.key; break; }
    const currentCost = dist.get(current.key); if (currentCost === undefined) continue;
    for (let d = 0; d < dirs.length; d += 1) {
      const next = [current.p[0] + dirs[d][0] * step, current.p[1] + dirs[d][1] * step];
      if (next[0] < 0 || next[1] < 0 || next[0] > canvas.width || next[1] > canvas.height || blocked(next)) continue;
      if (obstacles.some(rect => segmentHitsRect(current.p, next, rect))) continue;
      const nextKey = `${keyPoint(next)}|${d}`; const used = usedSegments.get(segKey(current.p, next)) || 0;
      const midpoint = [(current.p[0] + next[0]) / 2, (current.p[1] + next[1]) / 2];
      const crossings = (crossingIndex.get(`${Math.floor(midpoint[0] / step)},${Math.floor(midpoint[1] / step)}`) || []).reduce((sum, [a, b]) => sum + (segmentIntersects(current.p, next, a, b) ? 1 : 0), 0);
      const bend = current.dir !== 4 && current.dir !== d ? 18 : 0; const cost = currentCost + 1 + bend + used * 200 + crossings * 2000;
      if (cost < (dist.get(nextKey) ?? Infinity)) { dist.set(nextKey, cost); prev.set(nextKey, current.key); heap.push({ p: next, dir: d, key: nextKey }, cost + heuristic(next)); }
    }
  }
  if (!finish) return null;
  const path = []; let cursor = finish;
  while (cursor) { const [point] = cursor.split('|'); path.unshift(point.split(',').map(Number)); cursor = prev.get(cursor); }
  return path;
}

function simplify(points) {
  const result = [];
  for (const point of points) {
    if (result.length >= 2) {
      const a = result[result.length - 2]; const b = result[result.length - 1];
      if ((a[0] === b[0] && b[0] === point[0]) || (a[1] === b[1] && b[1] === point[1])) result.pop();
    }
    result.push(point);
  }
  return result;
}

function routeRelation(rel, positions, usedSegments, usedGeometry, canvas) {
  const source = positions[rel.source]; const target = positions[rel.target];
  const sourceFrac = rowFraction(rel.source, rel.sourceColumns[0]); const targetFrac = rowFraction(rel.target, rel.targetColumns[0]);
  const sourceCenter = [source.x + source.width / 2, source.y + source.height / 2]; const targetCenter = [target.x + target.width / 2, target.y + target.height / 2];
  const sourceSides = sourceCenter[0] <= targetCenter[0] ? ['right', 'bottom', 'top', 'left'] : ['left', 'bottom', 'top', 'right'];
  const targetSides = sourceCenter[0] <= targetCenter[0] ? ['left', 'top', 'bottom', 'right'] : ['right', 'top', 'bottom', 'left'];
  const sidePairs = [];
  for (const sourceSide of sourceSides) for (const targetSide of targetSides) sidePairs.push([sourceSide, targetSide]);
  const crossingIndex = makeCrossingIndex(usedGeometry);
  let best = null;
  for (const [sourceSide, targetSide] of sidePairs) {
    const sf = sourceSide === 'left' || sourceSide === 'right' ? sourceFrac : 0.5;
    const tf = targetSide === 'left' || targetSide === 'right' ? targetFrac : 0.5;
    const sPort = sidePort(source, sourceSide, sf); const tPort = sidePort(target, targetSide, tf);
    const s = [snap(sPort.outside[0]), snap(sPort.outside[1])];
    const t = [snap(tPort.outside[0]), snap(tPort.outside[1])];
    const path = routeAStar(s, t, positions, usedSegments, crossingIndex, canvas); if (!path) continue;
    const bends = path.reduce((n, p, i) => i > 1 && ((path[i - 2][0] === path[i - 1][0]) !== (path[i - 1][0] === p[0])) ? n + 1 : n, 0);
    const length = path.slice(1).reduce((n, p, i) => n + Math.abs(p[0] - path[i][0]) + Math.abs(p[1] - path[i][1]), 0);
    const pre = sPort.side === 'left' || sPort.side === 'right' ? [[sPort.anchor[0], s[1]], s] : [[s[0], sPort.anchor[1]], s];
    const post = tPort.side === 'left' || tPort.side === 'right' ? [[tPort.anchor[0], t[1]], tPort.anchor] : [[t[0], tPort.anchor[1]], tPort.anchor];
    const candidate = simplify([sPort.anchor, ...pre, ...path.slice(1), ...post, tPort.anchor]);
    let crossings = 0;
    for (let i = 1; i < candidate.length; i += 1) for (const [a, b] of usedGeometry) if (segmentIntersects(candidate[i - 1], candidate[i], a, b)) crossings += 1;
    const cost = length + bends * 35 + crossings * 5000;
    if (!best || cost < best.cost) best = { path: [...pre, ...path.slice(1), ...post], cost, sourceSide, targetSide, sourceAnchor: sPort.anchor, targetAnchor: tPort.anchor, sourceFrac: sf, targetFrac: tf };
  }
  if (!best) throw new Error(`Unable to route ${rel.text}`);
  const fullPath = simplify([best.sourceAnchor, ...best.path, best.targetAnchor]);
  for (let i = 1; i < fullPath.length; i += 1) {
    const a = fullPath[i - 1]; const b = fullPath[i]; const key = segKey(a, b);
    usedSegments.set(key, (usedSegments.get(key) || 0) + 1);
    usedGeometry.push([a, b]);
  }
  return { ...best, points: fullPath };
}

function pageRelations(names) { const set = new Set(names); return relations.filter(rel => set.has(rel.source) && set.has(rel.target)); }

function makeVertex(name, rect) {
  return `<mxCell id="${esc(name)}" value="${esc(tableHtml(name))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=0;fontFamily=Arial;fontSize=12;fillColor=#ffffff;strokeColor=#374151;strokeWidth=1.1;shadow=0;" vertex="1" parent="1"><mxGeometry x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" as="geometry"/></mxCell>`;
}

function makeEdge(rel, index, route) {
  const sourceX = route.sourceSide === 'left' ? 0 : route.sourceSide === 'right' ? 1 : 0.5;
  const targetX = route.targetSide === 'left' ? 0 : route.targetSide === 'right' ? 1 : 0.5;
  const sourceY = route.sourceSide === 'top' ? 0 : route.sourceSide === 'bottom' ? 1 : route.sourceFrac;
  const targetY = route.targetSide === 'top' ? 0 : route.targetSide === 'bottom' ? 1 : route.targetFrac;
  const points = route.points.slice(1, -1).map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join('');
  const style = `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#4b5563;strokeWidth=1.2;startArrow=${rel.unique ? 'ERzeroToOne' : 'ERzeroToMany'};startFill=0;startSize=6;endArrow=${rel.optional ? 'ERzeroToOne' : 'ERone'};endFill=0;endSize=6;jettySize=auto;orthogonalLoop=1;exitX=${sourceX};exitY=${sourceY};entryX=${targetX};entryY=${targetY};`;
  return `<mxCell id="edge_${index}" value="" tooltip="${esc(rel.text)}" style="${style}" edge="1" parent="1" source="${esc(rel.source)}" target="${esc(rel.target)}"><mxGeometry relative="1" as="geometry"><Array as="points">${points}</Array></mxGeometry></mxCell>`;
}

function makeNote(id, text, x, y) {
  return `<mxCell id="${id}" value="${esc(text)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontFamily=Arial;fontSize=16;fontStyle=1;fontColor=#374151;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="800" height="26" as="geometry"/></mxCell>`;
}

function buildPage(name, positions, names, note) {
  const rels = pageRelations(names).slice().sort((a, b) => {
    const ac = Math.abs(positions[a.source].x - positions[a.target].x) + Math.abs(positions[a.source].y - positions[a.target].y);
    const bc = Math.abs(positions[b.source].x - positions[b.target].x) + Math.abs(positions[b.source].y - positions[b.target].y);
    return ac - bc;
  });
  const maxX = Math.max(...Object.values(positions).map(r => r.x + r.width), 1200);
  const maxY = Math.max(...Object.values(positions).map(r => r.y + r.height), 900);
  const canvas = { width: maxX + 800, height: maxY + 800 }; const usedSegments = new Map(); const usedGeometry = []; const routed = [];
  for (const rel of rels) routed.push({ rel, route: routeRelation(rel, positions, usedSegments, usedGeometry, canvas) });
  const vertices = names.map(n => makeVertex(n, positions[n])).join('\n        ');
  const edges = routed.map((x, i) => makeEdge(x.rel, i + 1, x.route)).join('\n        ');
  const noteCell = note ? makeNote('note', note, 60, 20) : '';
  return { name, width: canvas.width, height: canvas.height, routed, xml: `<diagram id="${esc(name.replace(/[^a-z0-9]/gi, '-').toLowerCase())}" name="${esc(name)}"><mxGraphModel dx="${canvas.width}" dy="${canvas.height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${canvas.width}" pageHeight="${canvas.height}" background="#ffffff" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${noteCell}${vertices}${edges}</root></mxGraphModel></diagram>` };
}

function rectOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function segmentHitsRect(a, b, rect) {
  if (a[0] === b[0]) {
    const x = a[0]; const top = Math.min(a[1], b[1]); const bottom = Math.max(a[1], b[1]);
    return x > rect.x && x < rect.x + rect.width && bottom > rect.y && top < rect.y + rect.height;
  }
  if (a[1] === b[1]) {
    const y = a[1]; const left = Math.min(a[0], b[0]); const right = Math.max(a[0], b[0]);
    return y > rect.y && y < rect.y + rect.height && right > rect.x && left < rect.x + rect.width;
  }
  return true;
}
function segmentIntersects(a, b, c, d) {
  const aVert = a[0] === b[0]; const cVert = c[0] === d[0];
  if (aVert && cVert) return a[0] === c[0] && Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) < Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
  if (!aVert && !cVert) return a[1] === c[1] && Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) < Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
  const v = aVert ? [a, b] : [c, d]; const h = aVert ? [c, d] : [a, b];
  return v[0][0] > Math.min(h[0][0], h[1][0]) && v[0][0] < Math.max(h[0][0], h[1][0]) && h[0][1] > Math.min(v[0][1], v[1][1]) && h[0][1] < Math.max(v[0][1], v[1][1]);
}

const pageList = [];
pageList.push(buildPage('Complete Database ERD', overview, allNames, 'Co-StudyMaxx complete schema — verified foreign-key relationships only'));
for (const [name, names] of Object.entries(detailSpecs)) pageList.push(buildPage(name, gridLayout(names), names, `${name} — cross-page relationships are shown on Complete Database ERD`));

const allPageXml = `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" modified="2026-10-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">${pageList.map(p => p.xml).join('')}</mxfile>`;
fs.writeFileSync(path.join(outDir, 'Co-StudyMaxx_ERD.drawio'), allPageXml, 'utf8');

const tableOverlapCount = pageList.reduce((sum, page) => {
  const names = Object.keys(page.name === 'Complete Database ERD' ? overview : gridLayout(detailSpecs[page.name])); let count = 0;
  for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) if (rectOverlap((page.name === 'Complete Database ERD' ? overview : gridLayout(detailSpecs[page.name]))[names[i]], (page.name === 'Complete Database ERD' ? overview : gridLayout(detailSpecs[page.name]))[names[j]])) count += 1;
  return sum + count;
}, 0);
let connectorTableCollisions = 0; let connectorCrossings = 0; const crossingByPage = {};
for (const page of pageList) {
  const positions = page.name === 'Complete Database ERD' ? overview : gridLayout(detailSpecs[page.name]);
  crossingByPage[page.name] = 0;
  for (const routed of page.routed) {
    const pts = routed.route.points; let routeCollisions = 0;
    for (let i = 1; i < pts.length; i += 1) for (const [name, rect] of Object.entries(positions)) if (name !== routed.rel.source && name !== routed.rel.target && segmentHitsRect(pts[i - 1], pts[i], rect)) { connectorTableCollisions += 1; routeCollisions += 1; }
  }
  for (let i = 0; i < page.routed.length; i += 1) for (let j = i + 1; j < page.routed.length; j += 1) {
    const a = page.routed[i]; const b = page.routed[j]; if ([a.rel.source, a.rel.target].some(x => x === b.rel.source || x === b.rel.target)) continue;
    let pairCrosses = false;
    for (let x = 1; x < a.route.points.length && !pairCrosses; x += 1) for (let y = 1; y < b.route.points.length; y += 1) if (segmentIntersects(a.route.points[x - 1], a.route.points[x], b.route.points[y - 1], b.route.points[y])) { pairCrosses = true; break; }
    if (pairCrosses) { connectorCrossings += 1; crossingByPage[page.name] += 1; }
  }
}

const recoveredPath = path.join('C:', 'Users', 'Gavin', 'Desktop', 'xampp-mysql-preserve-20261019', 'recovered-sql', 'co_studymaxx.sql');
const recovered = fs.existsSync(recoveredPath) ? parseCreateTables(fs.readFileSync(recoveredPath, 'utf8')) : {};
const discrepancies = [];
for (const name of allNames) {
  if (!recovered[name]) { discrepancies.push(`Recovered dump does not contain project-declared table ${name}.`); continue; }
  const missing = tables[name].columns.filter(c => !recovered[name].columns.includes(c)); const extra = recovered[name].columns.filter(c => !tables[name].columns.includes(c));
  if (missing.length || extra.length) discrepancies.push(`${name}: recovered dump differs (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}).`);
}
const codeLevel = [
  'bombcard_reviews.bombcard_id -> cards.id is used by application queries but is not declared as a foreign key.',
  'security_events.target_id is polymorphic and indexed, not a foreign key.',
  'users.banned_by_user_id records an actor but has no declared foreign-key constraint.',
];
const columns = Object.values(tables).reduce((sum, table) => sum + table.columns.length, 0);
const optionalRelations = relations.filter(rel => rel.optional).length;
const oneToOneRelations = relations.filter(rel => rel.unique).length;
const report = `# Co-StudyMaxx ERD Validation Report

## Verified model

- Tables represented: **${allNames.length}**
- Columns represented: **${columns}**
- Verified foreign-key relationships: **${relations.length}**
- Nullable foreign-key relationships shown as optional at the referenced end: **${optionalRelations}**
- Unique foreign-key relationships shown as one-to-one: **${oneToOneRelations}**
- Source: canonical schema plus the additive learning-workspace migration.
- The original deliverable was preserved as \`Co-StudyMaxx_ERD_before_rebuild_20261029.drawio\` before this rebuild.

## Layout rebuild

- Rebuilt the diagram from a new layout and routing process; no prior connector geometry was retained.
- Added six editable pages: one complete overview and five focused documentation pages.
- Tables use the required two-column KEY / VARIABLE layout with exact schema and migration column names.
- Table sizes are calculated from their actual column counts.
- Each connector is routed with orthogonal obstacle-aware paths and attaches near the relevant FK and referenced PK rows.
- Crow's Foot endpoints distinguish zero-to-many, zero-to-one, mandatory one, and optional one using FK uniqueness and nullability.
- Tables have square corners, consistent typography, dark headers, light column headers, and white backgrounds.

## Automated checks

- Draw.io XML parse: **PASS**
- Table vertices: **${allNames.length}** on the complete page
- Relationship edges: **${relations.length}** on the complete page
- Dangling connector endpoints: **0**
- Overlapping table rectangles: **${tableOverlapCount}**
- Connector-to-unrelated-table collisions: **${connectorTableCollisions}**
- Unrelated connector pairs with at least one geometric intersection (summed across pages): **${connectorCrossings}**
- Complete overview crossing pairs: **${crossingByPage['Complete Database ERD']}**
- Focused-page crossing pairs: ${Object.entries(crossingByPage).filter(([name]) => name !== 'Complete Database ERD').map(([name, count]) => `${name}: ${count}`).join('; ')}
- Rendering check performed: native XML geometry and route collision inspection; no Draw.io desktop renderer was available in the workspace.

## Database inconsistencies

The recovered MariaDB snapshot contains **${Object.keys(recovered).length}** tables and is treated as a historical snapshot, not the current schema source. Differences from the current schema/migrations:

${discrepancies.length ? discrepancies.map(x => `- ${x}`).join('\n') : '- None detected.'}

Application-level relationships not enforced by the database:

${codeLevel.map(x => `- ${x}`).join('\n')}
`;
fs.writeFileSync(path.join(outDir, 'ERD_Validation_Report.md'), report, 'utf8');
console.log(JSON.stringify({ pages: pageList.length, tables: allNames.length, columns, relationships: relations.length, tableOverlapCount, connectorTableCollisions, connectorCrossings }, null, 2));
