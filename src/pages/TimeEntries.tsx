import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Receipt, Trash2 } from 'lucide-react';
import { TimeEntry, Matter, Invoice } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import { NmCard, NmButton, StatusBadge, NmModal, NmVoiceInput } from '../components/ui/NeumorphicPrimitives';
import { formatSAR, parseMoneyInput, sanitizeMoneyText } from '../utils/currencyUtils';
import { toArabicDate, toDateInputValue, addDaysISO } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function TimeEntries() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    matter_id: '',
    entry_date: toDateInputValue(new Date().toISOString()),
    hours_str: '2.5',
    rate_str: String(user?.hourly_rate || 850),
    category: 'مرافعة وصياغة',
    description: '',
    is_billable: true,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listEntities<TimeEntry>('time_entries'),
      listEntities<Matter>('matters'),
    ])
      .then(([te, m]) => {
        setEntries(te);
        setMatters(m);
        if (m[0]) setForm((prev) => ({ ...prev, matter_id: prev.matter_id || m[0].id }));
      })
      .catch(() => toast.error('تعذّر تحميل سجل الساعات'))
      .finally(() => setLoading(false));
  }, []);

  const matterMap = useMemo(() => {
    const map: Record<string, Matter> = {};
    matters.forEach((m) => (map[m.id] = m));
    return map;
  }, [matters]);

  const unbilledTotal = useMemo(
    () =>
      entries
        .filter((e) => e.is_billable && !e.invoice_id)
        .reduce((s, e) => s + (e.total_amount || 0), 0),
    [entries]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matter_id || !form.description.trim()) {
      toast.error('يرجى اختيار القضية وإدخال وصف العمل');
      return;
    }
    try {
      const created = await createEntity<TimeEntry>('time_entries', {
        matter_id: form.matter_id,
        lawyer: user?.name || 'أ. كريم الهواري',
        entry_date: new Date(form.entry_date || Date.now()).toISOString(),
        hours: parseMoneyInput(form.hours_str),
        hourly_rate: parseMoneyInput(form.rate_str),
        category: form.category,
        description: form.description,
        is_billable: form.is_billable,
      });
      setEntries((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تم تسجيل ساعات العمل');
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  const handleConvertUnbilledToInvoice = async (matterId: string) => {
    const matter = matterMap[matterId];
    const items = entries.filter((e) => e.matter_id === matterId && e.is_billable && !e.invoice_id);
    if (!matter || items.length === 0) {
      toast.warning('لا توجد ساعات غير مفوترة لهذه القضية');
      return;
    }
    try {
      const inv = await createEntity<Invoice>('invoices', {
        client_id: matter.client_id,
        matter_id: matter.id,
        invoice_date: new Date().toISOString(),
        due_date: addDaysISO(14),
        status: 'مُرسَلة',
        currency: 'SAR',
        tax_percent: 15,
        amount_paid: 0,
        line_items: items.map((e) => ({
          description: `${e.description} (${e.hours} ساعة)`,
          quantity: e.hours,
          unit_price: e.hourly_rate,
          total: e.total_amount,
        })),
        notes: 'فاتورة ساعات عمل قانونية محوّلة تلقائياً من سجل الوقت.',
      });
      await Promise.all(
        items.map((e) => updateEntity<TimeEntry>('time_entries', e.id, { invoice_id: inv.id }))
      );
      setEntries((prev) =>
        prev.map((e) => (items.some((i) => i.id === e.id) ? { ...e, invoice_id: inv.id } : e))
      );
      toast.success('تم تحويل الساعات إلى فاتورة بنجاح');
      navigate(`/invoices/${inv.id}`);
    } catch {
      toast.error('تعذّر تحويل الساعات إلى فاتورة');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('time_entries', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('تم حذف القيد');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#4a90d9]" />
            ساعات العمل القابلة للفوترة
          </h1>
          <p className="text-sm text-[#718096]">
            إجمالي الساعات القابلة للفوترة غير المفوترة بعد:{' '}
            <strong className="text-[#27ae60] tabular-nums">{formatSAR(unbilledTotal)}</strong>
          </p>
        </div>
        <NmButton variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          تسجيل ساعات عمل
        </NmButton>
      </div>

      <NmCard className="p-0 overflow-x-auto">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>القضية</th>
              <th>البيان</th>
              <th>المحامي</th>
              <th>الساعات</th>
              <th>السعر/ساعة</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[#718096]">جاري التحميل...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[#718096]">لا توجد قيود وقت مسجلة</td>
              </tr>
            ) : (
              entries.map((te) => (
                <tr key={te.id}>
                  <td className="text-sm font-bold text-[#4a90d9]">
                    {matterMap[te.matter_id]?.title || '—'}
                  </td>
                  <td className="text-sm text-[#2d3748]">
                    <div>{te.description}</div>
                    <div className="text-[11px] text-[#718096]">{toArabicDate(te.entry_date)} · {te.category}</div>
                  </td>
                  <td className="text-xs text-[#2d3748]">{te.lawyer}</td>
                  <td className="font-bold tabular-nums">{te.hours} س</td>
                  <td className="text-xs tabular-nums">{formatSAR(te.hourly_rate)}</td>
                  <td className="font-bold text-[#27ae60] tabular-nums">{formatSAR(te.total_amount)}</td>
                  <td>
                    <StatusBadge
                      status={te.invoice_id ? 'مفوترة' : te.is_billable ? 'قابلة للفوترة' : 'غير مفوترة'}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {te.is_billable && !te.invoice_id && (
                        <NmButton
                          variant="primary"
                          onClick={() => handleConvertUnbilledToInvoice(te.matter_id)}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          فوترة
                        </NmButton>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(te.id)}
                        className="nm-icon-btn w-8 h-8 flex items-center justify-center text-[#e74c3c]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </NmCard>

      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="تسجيل قيد وقت جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">القضية *</label>
            <select
              value={form.matter_id}
              onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
              className="nm-input"
            >
              <option value="">اختر القضية</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>{m.case_number} — {m.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">عدد الساعات</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.hours_str}
                onChange={(e) => setForm({ ...form, hours_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">أجر الساعة (SAR)</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.rate_str}
                onChange={(e) => setForm({ ...form, rate_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">التاريخ</label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">وصف العمل المنجز *</label>
            <NmVoiceInput
              multiline
              rows={2}
              value={form.description}
              onChange={(val) => setForm({ ...form, description: val })}
              placeholder="مراجعة صحيفة الدعوى وإعداد لائحة الاعتراض..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_billable}
              onChange={(e) => setForm({ ...form, is_billable: e.target.checked })}
              className="w-4 h-4 accent-[#4a90d9]"
            />
            قابلة للفوترة على العميل
          </label>
          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ الساعات</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
