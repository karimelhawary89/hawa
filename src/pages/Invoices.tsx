import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Trash2,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { Invoice, Client, Matter, InvoiceLineItem } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmCopyButton,
} from '../components/ui/NeumorphicPrimitives';
import {
  formatSAR,
  formatCurrency,
  parseMoneyInput,
  sanitizeMoneyText,
  CurrencyCode,
} from '../utils/currencyUtils';
import { toArabicDate, toDateInputValue, addDaysISO } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

interface DraftLine {
  description: string;
  quantityStr: string;
  unitPriceStr: string;
}

export default function Invoices() {
  const { id: routeInvId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    matter_id: '',
    currency: 'SAR' as CurrencyCode,
    tax_percent_str: '15',
    due_date: toDateInputValue(addDaysISO(14)),
    status: 'مُرسَلة' as Invoice['status'],
    notes: 'السداد عبر التحويل البنكي أو إنستاباي / مدى خلال 14 يوماً.',
  });
  const [lines, setLines] = useState<DraftLine[]>([
    { description: 'أتعاب دراسة ملف القضية وإعداد المذكرة', quantityStr: '1', unitPriceStr: '10000' },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, cList, mList] = await Promise.all([
        listEntities<Invoice>('invoices'),
        listEntities<Client>('clients'),
        listEntities<Matter>('matters'),
      ]);
      setInvoices(invList);
      setClients(cList);
      setMatters(mList);
      if (routeInvId) {
        const found = invList.find((i) => i.id === routeInvId);
        if (found) setSelectedInvoice(found);
      }
    } catch {
      toast.error('تعذّر تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routeInvId]);

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => (map[c.id] = c));
    return map;
  }, [clients]);

  const matterMap = useMemo(() => {
    const map: Record<string, Matter> = {};
    matters.forEach((m) => (map[m.id] = m));
    return map;
  }, [matters]);

  // BUG-04: Filter matters strictly by selected client_id
  const clientMatters = useMemo(() => {
    if (!form.client_id) return [];
    return matters.filter((m) => m.client_id === form.client_id);
  }, [matters, form.client_id]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'الكل' && inv.status !== statusFilter) return false;
      if (!q) return true;
      const cName = clientMap[inv.client_id]?.name || '';
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        cName.toLowerCase().includes(q)
      );
    });
  }, [invoices, search, statusFilter, clientMap]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, li) => {
      const qty = parseMoneyInput(li.quantityStr) || 0;
      const price = parseMoneyInput(li.unitPriceStr) || 0;
      return sum + qty * price;
    }, 0);
    const taxPct = parseMoneyInput(form.tax_percent_str);
    const tax = (subtotal * taxPct) / 100;
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines, form.tax_percent_str]);

  const handleAddLine = () => {
    setLines((prev) => [...prev, { description: '', quantityStr: '1', unitPriceStr: '0' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      toast.error('يرجى اختيار العميل أولاً');
      return;
    }
    const line_items: InvoiceLineItem[] = lines
      .filter((l) => l.description.trim())
      .map((l) => {
        const quantity = Math.max(1, parseMoneyInput(l.quantityStr));
        const unit_price = parseMoneyInput(l.unitPriceStr);
        return {
          description: l.description,
          quantity,
          unit_price,
          total: Number((quantity * unit_price).toFixed(2)),
        };
      });

    if (line_items.length === 0) {
      toast.error('أضف بنداً واحداً على الأقل للفاتورة');
      return;
    }

    try {
      const created = await createEntity<Invoice>('invoices', {
        client_id: form.client_id,
        matter_id: form.matter_id || undefined,
        invoice_date: new Date().toISOString(),
        due_date: new Date(form.due_date || Date.now()).toISOString(),
        status: form.status,
        currency: form.currency as Invoice['currency'],
        tax_percent: parseMoneyInput(form.tax_percent_str),
        amount_paid: 0,
        line_items,
        notes: form.notes,
      });
      setInvoices((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تم إصدار الفاتورة الضريبية بنجاح');
    } catch {
      toast.error('تعذّر إصدار الفاتورة');
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      const updated = await updateEntity<Invoice>('invoices', inv.id, {
        amount_paid: inv.total_amount,
        balance_due: 0,
        status: 'مدفوعة',
      });
      setInvoices((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelectedInvoice(updated);
      toast.success('تم تحديث الفاتورة إلى مدفوعة بالكامل');
    } catch {
      toast.error('تعذّر تحديث حالة الفاتورة');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('invoices', id);
      setInvoices((prev) => prev.filter((x) => x.id !== id));
      setSelectedInvoice(null);
      if (routeInvId) navigate('/invoices');
      toast.success('تم حذف الفاتورة');
    } catch {
      toast.error('تعذّر حذف الفاتورة');
    }
  };

  const totalRevenue = useMemo(
    () => invoices.reduce((s, i) => s + (i.total_amount || 0), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () => invoices.reduce((s, i) => s + (i.amount_paid || 0), 0),
    [invoices]
  );
  const totalOutstanding = useMemo(
    () => invoices.reduce((s, i) => s + (i.balance_due || 0), 0),
    [invoices]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#4a90d9]" />
            الفواتير والضرائب (SAR)
          </h1>
          <p className="text-sm text-[#718096]">
            إصدار فواتير الأتعاب بضريبة القيمة المضافة 15% ومتابعة التحصيل الفوري
          </p>
        </div>
        <NmButton
          variant="primary"
          onClick={() => {
            setForm((prev) => ({ ...prev, client_id: '', matter_id: '' }));
            setCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          إصدار فاتورة جديدة
        </NmButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <NmCard className="p-5">
          <div className="text-xs font-bold text-[#718096]">إجمالي الفواتير المصدرة</div>
          <div className="text-2xl font-bold text-[#2d3748] mt-1 tabular-nums">{formatSAR(totalRevenue)}</div>
        </NmCard>
        <NmCard className="p-5">
          <div className="text-xs font-bold text-[#718096]">المبالغ المحصّلة</div>
          <div className="text-2xl font-bold text-[#27ae60] mt-1 tabular-nums">{formatSAR(totalCollected)}</div>
        </NmCard>
        <NmCard className="p-5">
          <div className="text-xs font-bold text-[#718096]">المتبقي قيد التحصيل</div>
          <div className="text-2xl font-bold text-[#e67e22] mt-1 tabular-nums">{formatSAR(totalOutstanding)}</div>
        </NmCard>
      </div>

      {/* Filters */}
      <NmCard className="p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل الحالات</option>
            <option value="مسودة">مسودة</option>
            <option value="مُرسَلة">مُرسَلة</option>
            <option value="مدفوعة">مدفوعة</option>
            <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
            <option value="متأخرة">متأخرة</option>
          </select>
        </div>
      </NmCard>

      {/* Invoices Table */}
      <NmCard className="p-0 overflow-x-auto no-print">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>القضية</th>
              <th>الإجمالي</th>
              <th>المتبقي</th>
              <th>الحالة</th>
              <th>تاريخ الاستحقاق</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#718096]">جاري التحميل...</td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#718096]">لا توجد فواتير مطابقة</td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="cursor-pointer"
                >
                  <td className="font-mono font-bold text-[#4a90d9] tabular-nums">{inv.invoice_number}</td>
                  <td className="font-bold text-[#2d3748]">{clientMap[inv.client_id]?.name || '—'}</td>
                  <td className="text-xs text-[#718096]">
                    {inv.matter_id && matterMap[inv.matter_id] ? matterMap[inv.matter_id].title : 'عام'}
                  </td>
                  <td className="font-bold text-[#2d3748] tabular-nums">
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </td>
                  <td className="font-bold text-[#e67e22] tabular-nums">
                    {formatCurrency(inv.balance_due, inv.currency)}
                  </td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td className="text-xs text-[#718096]">{toArabicDate(inv.due_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </NmCard>

      {/* Printable Invoice Detail Modal */}
      <NmModal
        open={Boolean(selectedInvoice)}
        onClose={() => {
          setSelectedInvoice(null);
          if (routeInvId) navigate('/invoices');
        }}
        title={`فاتورة ضريبية — ${selectedInvoice?.invoice_number || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[#718096]">العميل</div>
                <div className="text-lg font-bold text-[#2d3748]">
                  {clientMap[selectedInvoice.client_id]?.name || 'عميل المكتب'}
                </div>
                {selectedInvoice.matter_id && matterMap[selectedInvoice.matter_id] && (
                  <div className="text-xs text-[#4a90d9]">
                    القضية: {matterMap[selectedInvoice.matter_id].title}
                  </div>
                )}
              </div>
              <div className="text-left space-y-1">
                <StatusBadge status={selectedInvoice.status} />
                <div className="text-xs text-[#718096]">تاريخ الإصدار: {toArabicDate(selectedInvoice.invoice_date)}</div>
                <div className="text-xs text-[#718096]">الاستحقاق: {toArabicDate(selectedInvoice.due_date)}</div>
              </div>
            </div>

            <div className="nm-inset p-4 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-xs text-[#718096]">
                    <th className="pb-2">البيان</th>
                    <th className="pb-2">الكمية</th>
                    <th className="pb-2">السعر</th>
                    <th className="pb-2">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.line_items.map((li, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-[#2d3748]">{li.description}</td>
                      <td className="py-2 tabular-nums">{li.quantity}</td>
                      <td className="py-2 tabular-nums">{formatCurrency(li.unit_price, selectedInvoice.currency)}</td>
                      <td className="py-2 font-bold tabular-nums">{formatCurrency(li.total, selectedInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="nm-inset p-4 flex items-center gap-3">
                <QrCode className="w-12 h-12 text-[#2d3748] shrink-0" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[#2d3748]">الدفع السريع (إنستاباي / مدى)</div>
                  <div className="text-[#718096] font-mono">instapay.me/baraa-legal</div>
                  <NmCopyButton text={`https://instapay.me/baraa-legal/${selectedInvoice.invoice_number}`} label="نسخ رابط السداد" />
                </div>
              </div>

              <div className="nm-inset p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#718096]">المجموع الفرعي:</span>
                  <span className="font-bold tabular-nums">{formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">ضريبة القيمة المضافة ({selectedInvoice.tax_percent}%):</span>
                  <span className="font-bold tabular-nums">{formatCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-base pt-1">
                  <span className="font-bold text-[#2d3748]">الإجمالي:</span>
                  <span className="font-bold text-[#4a90d9] tabular-nums">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#27ae60]">المدفوع: {formatCurrency(selectedInvoice.amount_paid, selectedInvoice.currency)}</span>
                  <span className="text-[#e67e22]">المتبقي: {formatCurrency(selectedInvoice.balance_due, selectedInvoice.currency)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 no-print">
              <NmButton variant="danger" onClick={() => handleDelete(selectedInvoice.id)}>
                <Trash2 className="w-4 h-4" />
                حذف
              </NmButton>
              <div className="flex flex-wrap gap-2">
                {selectedInvoice.balance_due > 0 && (
                  <NmButton variant="success" onClick={() => handleMarkPaid(selectedInvoice)}>
                    <CheckCircle2 className="w-4 h-4" />
                    تسجيل كمدفوعة بالكامل
                  </NmButton>
                )}
                <NmButton variant="primary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  طباعة / PDF
                </NmButton>
              </div>
            </div>
          </div>
        )}
      </NmModal>

      {/* Create Invoice Modal — BUG-02 + BUG-04 strict compliance */}
      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="إصدار فاتورة جديدة" maxWidth="max-w-3xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العميل *</label>
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm({ ...form, client_id: e.target.value, matter_id: '' })
                }
                className="nm-input"
              >
                <option value="">اختر العميل</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.serial_number})</option>
                ))}
              </select>
            </div>
            <div>
              {/* BUG-04: Disabled until client selected, filtered by client_id */}
              <label className="block text-xs font-bold text-[#718096] mb-1">القضية المرتبطة</label>
              <select
                disabled={!form.client_id}
                value={form.matter_id}
                onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
                className="nm-input disabled:opacity-60"
              >
                <option value="">
                  {!form.client_id
                    ? 'اختر العميل أولاً'
                    : clientMatters.length === 0
                    ? 'لا توجد قضايا مسجلة لهذا العميل'
                    : 'فاتورة عامة (أو اختر قضية)'}
                </option>
                {clientMatters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.case_number} — {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                className="nm-input"
              >
                <option value="SAR">SAR — ريال سعودي</option>
                <option value="EGP">EGP — جنيه مصري</option>
                <option value="AED">AED — درهم إماراتي</option>
                <option value="KWD">KWD — دينار كويتي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">ضريبة القيمة المضافة (%)</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.tax_percent_str}
                onChange={(e) => setForm({ ...form, tax_percent_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          {/* Line Items Builder (BUG-02 text inputs only!) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#718096]">بنود الفاتورة</span>
              <NmButton type="button" onClick={handleAddLine}>
                <Plus className="w-3.5 h-3.5" />
                إضافة بند
              </NmButton>
            </div>
            {lines.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].description = e.target.value;
                    setLines(next);
                  }}
                  placeholder="وصف الخدمة القانونية"
                  className="nm-input col-span-6"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={li.quantityStr}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].quantityStr = sanitizeMoneyText(e.target.value);
                    setLines(next);
                  }}
                  placeholder="الكمية"
                  className="nm-input col-span-2 tabular-nums"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={li.unitPriceStr}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].unitPriceStr = sanitizeMoneyText(e.target.value);
                    setLines(next);
                  }}
                  placeholder="السعر"
                  className="nm-input col-span-3 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  className="nm-icon-btn w-9 h-9 flex items-center justify-center text-[#e74c3c] col-span-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="nm-inset p-4 flex flex-wrap justify-between gap-4 text-sm">
            <span>المجموع الفرعي: <strong className="tabular-nums">{formatCurrency(totals.subtotal, form.currency)}</strong></span>
            <span>الضريبة ({form.tax_percent_str || 0}%): <strong className="tabular-nums">{formatCurrency(totals.tax, form.currency)}</strong></span>
            <span className="text-[#4a90d9] font-bold tabular-nums">
              الإجمالي المستحق: {formatCurrency(totals.total, form.currency)}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">إصدار وحفظ الفاتورة</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
