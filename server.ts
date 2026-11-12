import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb, nextSerial, appendAudit } from './server/db.ts';
import {
  runChat,
  analyzeMatter,
  reviewContract,
  draftBilingualContract,
  compareContracts,
  runLegalResearch,
  runMootCourt,
  runLegalWidget,
  transcribeAudio,
} from './server/ai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_COLLECTIONS = new Set([
  'users',
  'clients',
  'matters',
  'tasks',
  'hearings',
  'documents',
  'inquiries',
  'consultations',
  'conflict_checks',
  'invoices',
  'payments',
  'time_entries',
  'contacts',
  'knowledge_base',
  'legal_websites',
  'blog_posts',
  'blog_comments',
  'ai_models',
  'ai_prompt_templates',
  'clause_library',
  'compliance_checks',
  'arbitration_matters',
  'contracts',
  'evidence_logs',
  'widget_catalogue',
  'integrations',
  'ai_conversations',
  'audit_log',
]);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Auth & Session Helpers ─────────────────────────────────────────────
  app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { email } = req.body || {};
    const found =
      db.users.find((u: any) => u.email.toLowerCase() === String(email || '').toLowerCase()) ||
      db.users[0];
    res.json({ user: found });
  });

  app.post('/api/auth/signup', (req, res) => {
    const db = getDb();
    const { name, email, role } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'الاسم والبريد الإلكتروني مطلوبان' });
    }
    const existing = db.users.find((u: any) => u.email.toLowerCase() === String(email).toLowerCase());
    if (existing) {
      return res.json({ user: existing });
    }
    const newUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      role: role || 'محامٍ',
      title: role || 'محامٍ',
      specialization: 'القانون العام',
      phone: '',
      language_preference: 'العربية',
      default_currency: 'SAR',
      hourly_rate: 650,
      license_number: `LIC-${Math.floor(10000 + Math.random() * 89999)}`,
      department: 'القضايا',
      plan: 'free',
      is_active: true,
    };
    db.users.push(newUser);
    saveDb();
    res.status(201).json({ user: newUser });
  });

  app.post('/api/auth/switch-plan', (req, res) => {
    const db = getDb();
    const { userId, plan } = req.body || {};
    const target = db.users.find((u: any) => u.id === userId) || db.users[0];
    if (target) {
      target.plan = plan === 'pro' ? 'pro' : 'free';
      saveDb();
    }
    res.json({ user: target });
  });

  // ── Global Quick Search ────────────────────────────────────────────────
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const db = getDb();
    if (!q) return res.json({ results: [] });

    const match = (val?: string) => String(val || '').toLowerCase().includes(q);
    const results: Array<{ type: string; id: string; title: string; subtitle: string; path: string }> = [];

    for (const c of db.clients) {
      if (match(c.name) || match(c.serial_number) || match(c.phone) || match(c.email)) {
        results.push({ type: 'عميل', id: c.id, title: c.name, subtitle: `${c.serial_number} · ${c.client_type}`, path: `/clients/${c.id}` });
      }
    }
    for (const m of db.matters) {
      if (match(m.title) || match(m.case_number) || match(m.court_or_authority)) {
        results.push({ type: 'قضية', id: m.id, title: m.title, subtitle: `${m.case_number} · ${m.stage}`, path: `/matters/${m.id}` });
      }
    }
    for (const t of db.tasks) {
      if (match(t.title) || match(t.notes)) {
        results.push({ type: 'مهمة', id: t.id, title: t.title, subtitle: `${t.status} · ${t.priority}`, path: '/tasks' });
      }
    }
    for (const h of db.hearings) {
      if (match(h.title) || match(h.location)) {
        results.push({ type: 'جلسة', id: h.id, title: h.title, subtitle: h.location, path: '/hearings' });
      }
    }
    for (const d of db.documents) {
      if (match(d.title) || match(d.document_type)) {
        results.push({ type: 'مستند', id: d.id, title: d.title, subtitle: d.document_type, path: `/documents/${d.id}` });
      }
    }
    for (const i of db.inquiries) {
      if (match(i.inquirer_name) || match(i.notes)) {
        results.push({ type: 'استفسار', id: i.id, title: i.inquirer_name, subtitle: `${i.serial_number} · ${i.status}`, path: '/inquiries' });
      }
    }
    for (const lw of db.legal_websites) {
      if (match(lw.name_ar) || match(lw.name_en) || match(lw.description_ar)) {
        results.push({ type: 'موقع قانوني', id: lw.id, title: lw.name_ar, subtitle: `${lw.country} · ${lw.category}`, path: '/legal-websites' });
      }
    }

    res.json({ results: results.slice(0, 25) });
  });

  // ── Generic CRUD Endpoints for All Collections ─────────────────────────
  app.get('/api/entities/:collection', (req, res) => {
    const { collection } = req.params;
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(404).json({ error: 'كيان غير معروف' });
    }
    const db = getDb();
    res.json({ items: db[collection] || [] });
  });

  app.get('/api/entities/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(404).json({ error: 'كيان غير معروف' });
    }
    const db = getDb();
    const list: any[] = db[collection] || [];
    const found = list.find((item) => item.id === id);
    if (!found) return res.status(404).json({ error: 'السجل غير موجود' });
    res.json({ item: found });
  });

  app.post('/api/entities/:collection', (req, res) => {
    const { collection } = req.params;
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(404).json({ error: 'كيان غير معروف' });
    }
    const db = getDb();
    if (!Array.isArray(db[collection])) db[collection] = [];
    const payload = { ...(req.body || {}) };
    const id = payload.id || `${collection.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    payload.id = id;

    // Auto-serial numbers
    if (collection === 'clients' && !payload.serial_number) {
      payload.serial_number = nextSerial('EML', db.clients, 'serial_number');
    } else if (collection === 'matters' && !payload.case_number) {
      payload.case_number = nextSerial('QDY', db.matters, 'case_number');
    } else if (collection === 'inquiries' && !payload.serial_number) {
      payload.serial_number = nextSerial('INQ', db.inquiries, 'serial_number');
    } else if (collection === 'invoices' && !payload.invoice_number) {
      payload.invoice_number = nextSerial('INV', db.invoices, 'invoice_number');
    } else if (collection === 'payments' && !payload.payment_reference) {
      payload.payment_reference = nextSerial('PMT', db.payments, 'payment_reference');
    }

    // Invoice financial auto-calculations (SAR default, 15% VAT)
    if (collection === 'invoices') {
      const items = Array.isArray(payload.line_items) ? payload.line_items : [];
      const subtotal =
        items.length > 0
          ? items.reduce((sum: number, li: any) => sum + Number(li.total || Number(li.quantity || 1) * Number(li.unit_price || 0)), 0)
          : Number(payload.subtotal || 0);
      const taxPct = payload.tax_percent !== undefined ? Number(payload.tax_percent) : 15;
      const taxAmount = Number(((subtotal * taxPct) / 100).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));
      const amountPaid = Number(payload.amount_paid || 0);
      const balanceDue = Number(Math.max(0, totalAmount - amountPaid).toFixed(2));
      payload.currency = payload.currency || 'SAR';
      payload.subtotal = subtotal;
      payload.tax_percent = taxPct;
      payload.tax_amount = taxAmount;
      payload.total_amount = totalAmount;
      payload.amount_paid = amountPaid;
      payload.balance_due = balanceDue;
      if (balanceDue <= 0 && totalAmount > 0) payload.status = 'مدفوعة';
    }

    // Payment auto-reconciliation on Invoice
    if (collection === 'payments' && payload.invoice_id) {
      const inv = db.invoices.find((i: any) => i.id === payload.invoice_id);
      if (inv) {
        const payAmt = Number(payload.amount || 0);
        inv.amount_paid = Number((Number(inv.amount_paid || 0) + payAmt).toFixed(2));
        inv.balance_due = Number(Math.max(0, Number(inv.total_amount || 0) - inv.amount_paid).toFixed(2));
        inv.status = inv.balance_due <= 0 ? 'مدفوعة' : 'مدفوعة جزئياً';
      }
    }

    // Time entry total auto-calculation
    if (collection === 'time_entries') {
      const hrs = Number(payload.hours || 0);
      const rate = Number(payload.hourly_rate || 0);
      payload.total_amount = Number((hrs * rate).toFixed(2));
    }

    db[collection].unshift(payload);
    appendAudit(payload.responsible_user || payload.lead_lawyer || 'المستخدم', 'إضافة سجل', collection, id, payload.title || payload.name || '');
    saveDb();
    res.status(201).json({ item: payload });
  });

  app.put('/api/entities/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(404).json({ error: 'كيان غير معروف' });
    }
    const db = getDb();
    const list: any[] = db[collection] || [];
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) return res.status(404).json({ error: 'السجل غير موجود' });

    const updated = { ...list[idx], ...(req.body || {}), id };
    if (collection === 'invoices') {
      const items = Array.isArray(updated.line_items) ? updated.line_items : [];
      const subtotal =
        items.length > 0
          ? items.reduce((sum: number, li: any) => sum + Number(li.total || Number(li.quantity || 1) * Number(li.unit_price || 0)), 0)
          : Number(updated.subtotal || 0);
      const taxPct = updated.tax_percent !== undefined ? Number(updated.tax_percent) : 15;
      const taxAmount = Number(((subtotal * taxPct) / 100).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));
      const amountPaid = Number(updated.amount_paid || 0);
      const balanceDue = Number(Math.max(0, totalAmount - amountPaid).toFixed(2));
      updated.subtotal = subtotal;
      updated.tax_percent = taxPct;
      updated.tax_amount = taxAmount;
      updated.total_amount = totalAmount;
      updated.balance_due = balanceDue;
      if (balanceDue <= 0 && totalAmount > 0) updated.status = 'مدفوعة';
    }

    list[idx] = updated;
    appendAudit('المستخدم', 'تحديث سجل', collection, id, updated.title || updated.name || '');
    saveDb();
    res.json({ item: updated });
  });

  app.delete('/api/entities/:collection/:id', (req, res) => {
    const { collection, id } = req.params;
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(404).json({ error: 'كيان غير معروف' });
    }
    const db = getDb();
    const list: any[] = db[collection] || [];
    const next = list.filter((item) => item.id !== id);
    db[collection] = next;
    appendAudit('المستخدم', 'حذف سجل', collection, id);
    saveDb();
    res.json({ deleted: true });
  });

  // ── Singleton Config Endpoints (rag_settings, widget_instances) ────────
  app.get('/api/config/:key', (req, res) => {
    const db = getDb();
    const { key } = req.params;
    if (key !== 'rag_settings' && key !== 'widget_instances') {
      return res.status(404).json({ error: 'إعداد غير معروف' });
    }
    res.json({ value: db[key] });
  });

  app.put('/api/config/:key', (req, res) => {
    const db = getDb();
    const { key } = req.params;
    if (key !== 'rag_settings' && key !== 'widget_instances') {
      return res.status(404).json({ error: 'إعداد غير معروف' });
    }
    db[key] = req.body.value;
    saveDb();
    res.json({ value: db[key] });
  });

  // ── Export Full Backup JSON ────────────────────────────────────────────
  app.get('/api/backup', (_req, res) => {
    const db = getDb();
    res.setHeader('Content-Disposition', 'attachment; filename="baraa-legal-erp-backup.json"');
    res.json(db);
  });

  // ── Gemini AI Routes ───────────────────────────────────────────────────
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const result = await runChat(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/analyze-matter/:id', async (req, res) => {
    try {
      const analysis = await analyzeMatter(req.params.id);
      const db = getDb();
      const mattersList = db.matters as any[];
      const idx = mattersList.findIndex((m: any) => m.id === req.params.id);
      if (idx !== -1) {
        mattersList[idx] = {
          ...mattersList[idx],
          ai_success_probability: analysis.success_probability,
          ai_risk_level: analysis.risk_level,
          ai_estimated_duration_days: analysis.estimated_duration_days,
          ai_strategy_notes: analysis.strategy_notes,
          ai_swot: analysis.swot,
        };
        saveDb();
      }
      res.json({ analysis, matter: mattersList[idx] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/contract-review', async (req, res) => {
    try {
      const result = await reviewContract(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/contract-draft', async (req, res) => {
    try {
      const result = await draftBilingualContract(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/contract-compare', async (req, res) => {
    try {
      const result = await compareContracts(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/legal-research', async (req, res) => {
    try {
      const result = await runLegalResearch(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/moot-court', async (req, res) => {
    try {
      const result = await runMootCourt(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/widget', async (req, res) => {
    try {
      const result = await runLegalWidget(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً' });
    }
  });

  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const result = await transcribeAudio(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذّر تفريغ التسجيل الصوتي' });
    }
  });

  // ── Vite Middleware / Static Production Assets ─────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Baraa Legal ERP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
