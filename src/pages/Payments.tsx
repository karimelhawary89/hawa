import React, { useEffect, useState, useMemo } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { Payment, Invoice, Client } from '../types/erp';
import { listEntities, createEntity, deleteEntity } from '../lib/api';
import { NmCard, NmButton, NmModal, NmDrawer } from '../components/ui/NeumorphicPrimitives';
import { formatSAR, parseMoneyInput, sanitizeMoneyText } from '../utils/currencyUtils';
import { toArabicDate, toDateInputValue } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    invoice_id: '',
    amount_str: '',
    payment_date: toDateInputValue(new Date().toISOString()),
    payment_method: 'تحويل بنكي',
    reference_number: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, invList, cList] = await Promise.all([
        listEntities<Payment>('payments'),
        listEntities<Invoice>('invoices'),
        listEntities<Client>('clients'),
      ]);
      setPayments(pList);
      setInvoices(invList);
      setClients(cList);
    } catch {
      toast.error('تعذّر تحميل سجل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const invoiceMap = useMemo(() => {
    const map: Record<string, Invoice> = {};
    invoices.forEach((i) => (map[i.id] = i));
    return map;
  }, [invoices]);

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => (map[c.id] = c));
    return map;
  }, [clients]);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.balance_due > 0),
    [invoices]
  );

  const handleInvoicePick = (invId: string) => {
    const inv = invoiceMap[invId];
    setForm((prev) => ({
      ...prev,
      invoice_id: invId,
      amount_str: inv ? String(inv.balance_due) : '',
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoiceMap[form.invoice_id];
    const amt = parseMoneyInput(form.amount_str);
    if (!inv || amt <= 0) {
      toast.error('يرجى اختيار الفاتورة وإدخال مبلغ سداد صحيح');
      return;
    }
    try {
      const created = await createEntity<Payment>('payments', {
        invoice_id: inv.id,
        client_id: inv.client_id,
        amount: amt,
        payment_date: new Date(form.payment_date || Date.now()).toISOString(),
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        notes: form.notes,
      });
      setPayments((prev) => [created, ...prev]);
      setCreateOpen(false);
      await loadData();
      toast.success('تم تسجيل الدفعة وتحديث رصيد الفاتورة تلقائياً');
    } catch {
      toast.error('تعذّر تسجيل الدفعة');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('payments', id);
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setSelected(null);
      toast.success('تم حذف سجل الدفعة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#27ae60]" />
            المدفوعات والتحصيل المالي
          </h1>
          <p className="text-sm text-[#718096]">
            تسجيل الدفعات البنكية وإنستاباي ومدى مع تسوية أرصدة الفواتير تلقائياً
          </p>
        </div>
        <NmButton
          variant="primary"
          onClick={() => {
            const firstInv = openInvoices[0];
            setForm({
              invoice_id: firstInv?.id || '',
              amount_str: firstInv ? String(firstInv.balance_due) : '',
              payment_date: toDateInputValue(new Date().toISOString()),
              payment_method: 'تحويل بنكي',
              reference_number: '',
              notes: '',
            });
            setCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          تسجيل دفعة جديدة
        </NmButton>
      </div>

      <NmCard className="p-0 overflow-x-auto">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>المرجع</th>
              <th>الفاتورة</th>
              <th>العميل</th>
              <th>المبلغ</th>
              <th>الوسيلة</th>
              <th>تاريخ السداد</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#718096]">جاري التحميل...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#718096]">لا توجد مدفوعات مسجلة</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} onClick={() => setSelected(p)} className="cursor-pointer">
                  <td className="font-mono font-bold text-[#4a90d9]">{p.payment_reference}</td>
                  <td className="font-mono text-xs text-[#2d3748]">
                    {invoiceMap[p.invoice_id]?.invoice_number || '—'}
                  </td>
                  <td className="font-bold text-[#2d3748]">{clientMap[p.client_id]?.name || '—'}</td>
                  <td className="font-bold text-[#27ae60] tabular-nums">{formatSAR(p.amount)}</td>
                  <td className="text-sm text-[#718096]">{p.payment_method}</td>
                  <td className="text-xs text-[#718096]">{toArabicDate(p.payment_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </NmCard>

      <NmDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`سند قبض — ${selected?.payment_reference || ''}`}
      >
        {selected && (
          <div className="space-y-4">
            <div className="nm-inset p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#718096]">المبلغ المدفوع:</span>
                <span className="font-bold text-[#27ae60] tabular-nums">{formatSAR(selected.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">العميل:</span>
                <span className="font-bold text-[#2d3748]">{clientMap[selected.client_id]?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">الفاتورة:</span>
                <span className="font-mono text-[#4a90d9]">{invoiceMap[selected.invoice_id]?.invoice_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">وسيلة الدفع:</span>
                <span className="font-bold text-[#2d3748]">{selected.payment_method}</span>
              </div>
              {selected.reference_number && (
                <div className="flex justify-between">
                  <span className="text-[#718096]">رقم العملية البنكية:</span>
                  <span className="font-mono text-[#2d3748]">{selected.reference_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#718096]">التاريخ:</span>
                <span className="text-[#2d3748]">{toArabicDate(selected.payment_date)}</span>
              </div>
            </div>
            {selected.notes && (
              <div className="nm-inset p-4 text-sm text-[#2d3748]">{selected.notes}</div>
            )}
            <NmButton variant="danger" onClick={() => handleDelete(selected.id)}>
              <Trash2 className="w-4 h-4" />
              حذف السند
            </NmButton>
          </div>
        )}
      </NmDrawer>

      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="تسجيل دفعة جديدة">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">الفاتورة *</label>
            <select
              value={form.invoice_id}
              onChange={(e) => handleInvoicePick(e.target.value)}
              className="nm-input"
            >
              <option value="">اختر الفاتورة</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {clientMap[inv.client_id]?.name || ''} (المتبقي: {formatSAR(inv.balance_due)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">المبلغ المدفوع (SAR) *</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.amount_str}
                onChange={(e) => setForm({ ...form, amount_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">تاريخ الدفع</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">وسيلة الدفع</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="nm-input"
              >
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="مدى / بطاقة">مدى / بطاقة</option>
                <option value="إنستاباي">إنستاباي (InstaPay)</option>
                <option value="شيك">شيك</option>
                <option value="نقدي">نقدي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">مرجع العملية البنكية</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="TXN-994021"
                className="nm-input font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="success">تسجيل وتسوية الفاتورة</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
