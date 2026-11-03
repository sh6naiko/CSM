const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

const deck = {
  id: 'physics', title: 'Physics', code: 'Physics', subject: 'STEM', section: 'recent',
  visibility: 'public', updated_at: new Date().toISOString(),
  cards: [
    { id: 'card-1', type: 'IDENTIFICATION', prompt: 'What describes motion?', correctAnswer: 'Kinematics', acceptedAnswers: ['Kinematics'] },
    { id: 'card-2', type: 'TRUE_FALSE', prompt: 'Speed is a scalar.', correctAnswer: 'True' },
  ],
  documents: [{ id: 'doc-1', title: 'Physics notes.pdf', url: '/test.pdf', size: 1000 }],
};

// Isolated API/PDF fixtures: these tests never write to the application's database.
async function mockWorkspace(page, role = 'user') {
  const errors = [];
  const requests = [];
  const notifications = [];
  const dailyGoal = { reviewed: 0, target: 20, percent: 0, date: '2026-10-27', timezone: 'UTC', resetsAt: new Date(Date.now() + 86400000).toISOString() };
  page.on('pageerror', error => errors.push(error.message));
  const profile = { id: 'test-user', username: 'student', displayName: 'Test Student', role, avatar: 'ember' };
  const workspace = {
    profile, decks: [structuredClone(deck)], studyProgress: [], sessions: [], activities: [], achievements: [],
    stats: { decks: 1, cards: 2, documents: 1, accuracy: 0, studyDays: 0, activityChart: [] },
  };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'csm.test') {
      if (url.hostname === 'cdn.tailwindcss.com') return route.fulfill({ contentType: 'text/javascript', body: 'window.tailwind = {};' });
      if (url.pathname.endsWith('pdf.min.mjs')) return route.fulfill({ contentType: 'text/javascript', body: `
        export const GlobalWorkerOptions = {};
        export const getDocument = () => ({ destroy() {}, promise: new Promise(resolve => setTimeout(() => resolve({
          numPages: 3, getPage: async page => ({
            getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
            getTextContent: async () => ({ items: [{ str: 'Page ' + page }] }),
            render: ({ canvasContext }) => { canvasContext.fillText('Page ' + page, 20, 20); return { promise: Promise.resolve(), cancel() {} }; }
          })
        }), 80)) });
        export class TextLayer { constructor({ container, textContentSource }) { this.container = container; this.text = textContentSource.items[0].str; } async render() { this.container.textContent = this.text; } cancel() {} }
      ` });
      return route.fulfill({ body: '', contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
    }
    if (url.pathname === '/api/index.php') {
      const endpoint = url.searchParams.get('r');
      const method = route.request().method();
      requests.push({ endpoint, method });
      let result = {};
      if (endpoint === 'auth/session') result = { authenticated: role !== 'guest', profile, csrf: 'test-csrf' };
      if (endpoint === 'workspace') result = workspace;
      if (endpoint === 'study/daily-goal') result = dailyGoal;
      if (endpoint === 'shared/deck') result = { deck };
      if (endpoint === 'notifications') result = { notifications, unreadCount: notifications.filter(item => !item.isRead).length, unreadReportDeckCount: role === 'superadmin' ? 2 : 0 };
      if (endpoint === 'admin/archive/notices') result = { inactiveUsers: 3, archivedSecurityEvents: 4 };
      if (endpoint === 'admin/dashboard') result = { totals: { users: 1, activeNow: 1, decks: 1 }, period: { activeUsers: 1, uploads: 1, sessions: 0 }, series: [] };
      if (endpoint === 'admin/reports') result = { reports: [] };
      if (endpoint === 'admin/users') result = { users: [], total: 0 };
      if (endpoint === 'archive/decks') result = { decks: [], total: 0 };
      if (endpoint === 'study/progress' || endpoint === 'highlights') result = [];
      if (endpoint === 'study-decks') result = { decks: [{ id: 'study-1', title: 'Physics notes' }] };
      if (endpoint === 'study-cards') result = { cards: [] };
      if (endpoint === 'document-notes') result = { notes: [] };
      if (endpoint === 'documents/page') result = { last_page: 1 };
      if (endpoint === 'documents/extract') result = { extracted: true, pages: [{ text: 'Sample notes' }] };
      return route.fulfill({ json: result });
    }
    const file = url.pathname === '/admin' ? 'index.html' : url.pathname.slice(1);
    const allowed = ['index.html', 'shared.html', 'landing.html', 'api.js', 'index.css', 'style.css', 'assets/app.js', 'assets/landing.js'];
    if (allowed.includes(file)) {
      let body = fs.readFileSync(path.join(root, file));
      if (file === 'shared.html') body = body.toString().replace(/<\?php[\s\S]*?<\?php endif; \?>/g, '');
      const contentType = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
      return route.fulfill({ body, contentType });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  return { errors, requests, workspace, notifications, dailyGoal };
}

test('library cards, dialogs, study and PDF return navigation stay connected', async ({ page }) => {
  const { errors } = await mockWorkspace(page);
  await page.goto('/index.html?screen=library');
  const card = page.locator('.csm-library-deck-card');
  await expect(card).toContainText('2 Bombcards');
  await expect(card).toContainText('1 PDF');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await card.getByRole('button', { name: 'Actions for Physics' }).click();
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit deck details' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await card.click();
  await expect(page.locator('.csm-library-deck-card')).toHaveCount(0);
  await page.getByText('Physics notes.pdf', { exact: true }).click();
  const topPager = page.getByRole('navigation', { name: 'Top PDF page navigation' });
  const bottomPager = page.getByRole('navigation', { name: 'Bottom PDF page navigation' });
  await expect(topPager.getByRole('button', { name: 'Next' })).toBeEnabled();
  await topPager.getByRole('button', { name: 'Next' }).click();
  await expect(bottomPager.getByRole('spinbutton')).toHaveValue('2');
  await expect(page).toHaveURL(/pdfPage=2/);
  await page.reload();
  await expect(topPager.getByRole('spinbutton')).toHaveValue('2');
  await page.getByRole('button', { name: 'Back to Physics' }).click();
  await expect(page.getByText('Physics notes.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Study deck', exact: true }).click();
  await expect(page.getByText('What describes motion?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Next card/ }).click();
  await expect(page.getByText('Speed is a scalar.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Add PDF stays upload-only while Create Bombcards opens its method chooser', async ({ page }) => {
  const { errors } = await mockWorkspace(page);
  await page.goto('/index.html?screen=library');
  await page.locator('.csm-library-deck-card').click();

  const detail = page.locator('.csm-library-detail');
  await detail.getByRole('button', { name: 'Create Bombcards', exact: true }).click();
  const creatorChoice = page.getByRole('dialog', { name: 'Choose a creation method' });
  await expect(creatorChoice).toBeVisible();
  await expect(creatorChoice.getByRole('button', { name: 'Create manually' })).toBeVisible();
  await expect(creatorChoice.getByRole('button', { name: /Generate with AI/ })).toBeVisible();
  await creatorChoice.getByRole('button', { name: 'Create manually' }).click();
  await expect(page.locator('.csm-creator-screen')).toBeVisible();

  await page.getByRole('button', { name: 'Reviewer Library', exact: true }).click();
  await page.locator('.csm-library-deck-card').click();
  await page.locator('.csm-library-detail').getByRole('button', { name: 'Add PDF', exact: true }).click();
  const addPdfDialog = page.getByRole('dialog', { name: 'Physics' });
  await expect(addPdfDialog).toBeVisible();
  await expect(addPdfDialog.getByRole('button', { name: 'Upload File' })).toBeVisible();
  await expect(addPdfDialog.getByText('Create manually', { exact: true })).toHaveCount(0);
  await expect(addPdfDialog.getByText('Generate with AI', { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('AI Cards opened from a PDF keeps the current deck locked', async ({ page }) => {
  const { errors } = await mockWorkspace(page);
  await page.goto('/index.html?screen=library');
  await page.locator('.csm-library-deck-card').click();

  const detail = page.locator('.csm-library-detail');
  await detail.getByRole('button', { name: 'AI Cards', exact: true }).first().click();
  const dialog = page.locator('.csm-ai-theme');
  await expect(page.getByText('Cards will be added here', { exact: true })).toBeVisible();
  await expect(dialog.locator('select')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Change', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Creator screen stays focused on manual Bombcard creation', async ({ page }) => {
  const { errors } = await mockWorkspace(page);
  await page.goto('/index.html?screen=creator');
  const creator = page.locator('.csm-creator-screen');
  await expect(creator.getByRole('heading', { name: 'Create Bombcards' })).toBeVisible();
  await expect(creator.getByRole('button', { name: 'AI Generator', exact: true })).toHaveCount(0);
  await expect(creator.getByRole('button', { name: /Go to Study/ })).toHaveCount(0);
  await expect(creator.getByText('Deck Collection', { exact: true })).toHaveCount(0);
  await expect(creator.getByText('Cards in this Deck', { exact: true })).toHaveCount(0);
  await expect(creator.getByLabel('Deck for new Bombcards')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [screen, selector] of [
  ['home', '.home-dashboard-content'], ['creator', '.csm-creator-screen'],
  ['account', '.csm-account-screen'], ['people', '.csm-people-screen'],
  ['archive', '.csm-user-archive'], ['arena', '.csm-arena-screen'],
]) {
  test(`${screen} screen mounts with the extracted components`, async ({ page }) => {
    const { errors } = await mockWorkspace(page);
    await page.goto(`/index.html?screen=${screen}`);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('.app-shell')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('admin notice preserves report priority and server acknowledgment', async ({ page }) => {
  const { errors, requests } = await mockWorkspace(page, 'superadmin');
  await page.goto('/index.html?screen=home');
  const dialog = page.getByRole('dialog', { name: 'While you were away' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('2 decks were reported. 3 users were moved');
  await expect(dialog).toContainText('4 security events were moved');
  await dialog.getByRole('button', { name: 'Got it!' }).click();
  await expect(dialog).toHaveCount(0);
  expect(requests).toContainEqual({ endpoint: 'admin/archive/notices', method: 'PATCH' });
  expect(requests).toContainEqual({ endpoint: 'notifications/read', method: 'PATCH' });
  expect(errors).toEqual([]);
});

test('guest entry uses the shared components without exposing owner actions', async ({ page }) => {
  const { errors } = await mockWorkspace(page, 'guest');
  await page.goto('/shared.html?share_token=test-token');
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByText('Physics notes.pdf', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actions for Physics' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('archive confirmation and AI dialog can be opened and cancelled', async ({ page }) => {
  const { errors, requests } = await mockWorkspace(page);
  await page.goto('/index.html?screen=library');
  const card = page.locator('.csm-library-deck-card');
  await card.getByRole('button', { name: 'Actions for Physics' }).click();
  await card.getByRole('button', { name: 'Move to archive', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Physics');
  await expect(confirmation.getByRole('button', { name: 'Move to archive' })).toBeEnabled();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await page.getByRole('button', { name: 'AI Generator', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Bombcard Maker' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Customize generation' })).toBeVisible();
  await expect(page.getByText(/Deck PDFs \(/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Bombcard Maker' })).toHaveCount(0);
  expect(requests.filter(request => request.method === 'DELETE')).toEqual([]);
  expect(errors).toEqual([]);
});

test('reset confirmation uses the shared dialog without resetting on cancel', async ({ page }) => {
  const { errors, requests, workspace } = await mockWorkspace(page);
  workspace.studyProgress = [{ deck_id: 'physics', bombcard_id: 'card-1', status: 'known', times_known: 1, times_unknown: 0 }];
  await page.goto('/index.html?screen=home');
  await page.getByRole('button', { name: 'More actions for Physics' }).click();
  await page.getByRole('menuitem', { name: 'Reset progress' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset progress for Physics?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  expect(requests.filter(request => request.endpoint.includes('reset'))).toEqual([]);
  expect(errors).toEqual([]);
});

test('landing bundle renders and its FAQ remains interactive', async ({ page }) => {
  const { errors } = await mockWorkspace(page);
  await page.goto('/landing.html');
  await expect(page.getByRole('navigation', { name: 'Landing page navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Can I share a reviewer?' }).click();
  await expect(page.getByText('You can create a share link for others to view a reviewer.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test('daily goal uses reviewed cards instead of general activity and refreshes on return', async ({ page }) => {
  const { errors, workspace, dailyGoal } = await mockWorkspace(page);
  workspace.stats.activityChart = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => ({ day, current: 30, previous: 0 }));
  await page.goto('/index.html?screen=home');
  const goal = page.getByRole('region', { name: "Today's Study Goal" });
  await expect(goal.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(goal).toContainText('20 more cards to hit goal');
  await goal.getByRole('button', { name: 'Study Bombcards' }).click();
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  dailyGoal.reviewed = 1;
  dailyGoal.percent = 5;
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await expect(goal).toContainText('19 more cards to hit goal');
  await page.reload();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  dailyGoal.reviewed = 30;
  dailyGoal.percent = 100;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(goal).toContainText('Goal accomplished today!');
  await expect(goal).toContainText('30');
  await expect(goal.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  expect(errors).toEqual([]);
});

test('daily goal shows a retryable error instead of an invented count', async ({ page }) => {
  await mockWorkspace(page);
  await page.route('**/api/index.php?r=study/daily-goal*', route => route.fulfill({ status: 503, json: { error: 'Temporary study service error' } }));
  await page.goto('/index.html?screen=home');
  const goal = page.getByRole('region', { name: "Today's Study Goal" });
  await expect(goal).toContainText('Progress unavailable');
  await expect(goal.getByRole('alert')).toContainText('Temporary study service error');
  await page.unroute('**/api/index.php?r=study/daily-goal*');
  await goal.getByRole('button', { name: 'Retry' }).click();
  await expect(goal).toContainText('20 more cards to hit goal');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 740, height: 360 }]) {
  test(`mobile notification panel stays on screen at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { notifications, errors, requests } = await mockWorkspace(page);
    notifications.push(...Array.from({ length: 12 }, (_, index) => ({
      id: `notice-${index}`, type: 'deck_review_completed', isRead: index > 1,
      title: 'Deck review completed',
      message: 'Your report about the deck Physics was reviewed and dismissed. Staff note: False reported.',
      createdAt: '2026-10-27T06:05:00',
    })));
    await page.goto('/index.html?screen=flashcards');
    await page.getByRole('button', { name: 'Notifications, 2 unread' }).click();
    const panel = page.getByRole('dialog', { name: 'Notifications panel' });
    await expect(panel).toBeVisible();
    // Wait for the entry animation before measuring the final layout.
    await panel.evaluate(async node => Promise.all(node.getAnimations().map(animation => animation.finished)));
    const bounds = await panel.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(8);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 8);
    const list = panel.locator('.csm-notifications-list');
    if (viewport.width === 390) await page.screenshot({ path: test.info().outputPath('mobile-notifications.png') });
    expect(await list.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    for (const name of ['Mark all as read', 'Clear all']) {
      const button = panel.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport();
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await list.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await expect(panel.getByRole('button', { name: 'Mark all as read', exact: true })).toBeInViewport();
    await panel.getByRole('button', { name: 'Mark all as read', exact: true }).click();
    expect(requests).toContainEqual({ endpoint: 'notifications/read', method: 'PATCH' });
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
