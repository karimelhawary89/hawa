import React, { useEffect, useState, useMemo } from 'react';
import { Scale, Plus, Calculator, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { ArbitrationMatter, Client } from '../types/erp';
import { listEntities, createEntity, deleteEntity, apiRequest } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
} from '../components/ui/NeumorphicPrimitives';
import { formatCurrency, parseMoneyInput, sanitizeMoneyText, formatSAR } from '../utils/currencyUtils';
import { toArabicDate, toDateInputValue } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

export default function ArbitrationHub() {
  const toast = useToast();
  const [cases, setCases] = useState<ArbitrationMatter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // CRCICA / SCCA Fee Calculator
  const [claimStr, setClaimStr] = useState('2500000');
  const [arbitratorsCount, setArbitratorsCount] = useState<'1' | '3'>('3');

  // Feasibility Analyzer
  const [feasibilityInput, setFeasibilityInput] = useState('');
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [feasibilityResult, setFeasibilityResult] = useState('');

  const [form, setForm] = useState({
    arbitration_ref: '',
    title: '',
    client_id: '',
    institution: 'مركز التحكيم السعودي' as ArbitrationMatter['institution'],
    seat: 'الرياض — المملكة العربية السعودية',
    claim_value_str: '1500000',
    currency: 'SAR' as ArbitrationMatter['currency'],
    status: 'تشكيل هيئة التحكيم',
    arbitrators: '',
    filing_date: toDateInputValue(new Date().toISOString()),
    notes: '',
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listEntities<ArbitrationMatter>('arbitration_matters'),
      listEntities<Client>('clients'),
    ])
      .then(([aList, cList]) => {
        setCases(aList);
        setClients(cList);
      })
      .catch(() => toast.error('تعذّر تحميل ملفات التحكيم'))
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => (map[c.id] = c));
    return map;
  }, [clients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('يرجى إدخال عنوان نزاع التحكيم');
      return;
    }
    try {
      const created = await createEntity<ArbitrationMatter>('arbitration_matters', {
        arbitration_ref: form.arbitration_ref || `ARB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
        title: form.title,
        client_id: form.client_id || clients[0]?.id || '',
        institution: form.institution,
        seat: form.seat,
        claim_value: parseMoneyInput(form.claim_value_str),
        currency: form.currency,
        status: form.status,
        arbitrators: form.arbitrators,
        filing_date: new Date(form.filing_date || Date.now()).toISOString(),
        notes: form.notes,
      });
      setCases((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تم تسجيل ملف التحكيم');
    } catch {
      toast.error('تعذّر حفظ ملف التحكيم');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('arbitration_matters', id);
      setCases((prev) => prev.filter((c) => c.id !== id));
      toast.success('تم حذف ملف التحكيم');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  const runFeasibility = async () => {
    if (!feasibilityInput.trim()) {
      toast.error('يرجى وصف النزاع وشرط التحكيم لتحليل الجدوى');
      return;
    }
    setFeasibilityLoading(true);
    try {
      const res = await apiRequest<{ output: string }>('/api/ai/widget', {
        method: 'POST',
        body: JSON.stringify({
          widgetKey: 'arbitration_feasibility',
          widgetName: 'تحليل جدوى اللجوء إلى التحكيم التجاري الدولي/المحلي',
          inputs: {
            dispute_summary: feasibilityInput,
            claim_amount_sar: parseMoneyInput(claimStr),
            arbitrators: arbitratorsCount,
          },
        }),
      });
      setFeasibilityResult(res.output);
      toast.success('تم إعداد دراسة جدوى التحكيم');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر تشغيل التحليل');
    } finally {
      setFeasibilityLoading(false);
    }
  };

  // Approximate CRCICA / SCCA Fee Calculation
  const claimVal = parseMoneyInput(claimStr);
  const regFee = 7500;
  const adminFee = Math.min(250000, Math.max(10000, claimVal * 0.015));
  const arbFee =
    arbitratorsCount === '3'
      ? Math.min(750000, Math.max(45000, claimVal * 0.045))
      : Math.min(300000, Math.max(20000, claimVal * 0.02));
  const totalEstFee = regFee + adminFee + arbFee;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#9a7619]" />
            منصة التحكيم التجاري والدولي
          </h1>
          <p className="text-sm text-[#718096]">
            إدارة قضايا SCCA و CRCICA و ICC، وحاسبة رسوم التحكيم ومحلل الجدوى
          </p>
        </div>
        <NmButton variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          تسجيل دعوى تحكيم
        </NmButton>
      </div>

      {/* Cases List */}
      {loading ? (
        <NmCard className="p-8 text-center text-[#718096]">جاري التحميل...</NmCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <NmCard key={c.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[#9a7619]">{c.arbitration_ref}</span>
                  <h3 className="text-base font-bold text-[#2d3748]">{c.title}</h3>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="nm-inset p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#718096] block">المركز:</span>
                  <span className="font-bold text-[#4a90d9]">{c.institution}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">المقر:</span>
                  <span className="font-bold text-[#2d3748]">{c.seat}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">الموكل:</span>
                  <span className="font-bold text-[#2d3748]">{clientMap[c.client_id]?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">قيمة المطالبة:</span>
                  <span className="font-bold text-[#27ae60] tabular-nums">
                    {formatCurrency(c.claim_value, c.currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#718096]">
                <span>تاريخ القيد: {toArabicDate(c.filing_date)}</span>
                <NmButton variant="danger" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </NmButton>
              </div>
            </NmCard>
          ))}
        </div>
      )}

      {/* Fee Calculator & AI Feasibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NmCard className="p-5 space-y-4">
          <h3 className="font-bold text-[#2d3748] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#4a90d9]" />
            حاسبة رسوم التحكيم التقديرية (CRCICA / SCCA)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">قيمة المطالبة (SAR)</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={claimStr}
                onChange={(e) => setClaimStr(sanitizeMoneyText(e.target.value))}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">تشكيل الهيئة</label>
              <select
                value={arbitratorsCount}
                onChange={(e) => setArbitratorsCount(e.target.value as '1' | '3')}
                className="nm-input"
              >
                <option value="1">محكم فرد (1 محكم)</option>
                <option value="3">هيئة ثلاثية (3 محكمين)</option>
              </select>
            </div>
          </div>
          <div className="nm-inset p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#718096]">رسوم القيد غير المستردة:</span>
              <span className="font-bold text-[#2d3748] tabular-nums">{formatSAR(regFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">الرسوم الإدارية التقديرية للمركز:</span>
              <span className="font-bold text-[#2d3748] tabular-nums">{formatSAR(adminFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">أتعاب هيئة التحكيم التقديرية:</span>
              <span className="font-bold text-[#2d3748] tabular-nums">{formatSAR(arbFee)}</span>
            </div>
            <div className="flex justify-between text-base pt-2">
              <span className="font-bold text-[#2d3748]">الإجمالي التقديري:</span>
              <span className="font-bold text-[#9a7619] tabular-nums">{formatSAR(totalEstFee)}</span>
            </div>
          </div>
        </NmCard>

        <NmCard className="p-5 space-y-4">
          <h3 className="font-bold text-[#2d3748] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9a7619]" />
            محلل جدوى اللجوء للتحكيم (AI)
          </h3>
          <NmVoiceInput
            multiline
            rows={4}
            value={feasibilityInput}
            onChange={setFeasibilityInput}
            placeholder="اشرح طبيعة العقد، نص شرط التحكيم، وقيمة النزاع لتقييم الجدوى مقارنة بقضاء الدولة..."
          />
          <NmButton variant="gold" disabled={feasibilityLoading} onClick={runFeasibility}>
            {feasibilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            تحليل جدوى التحكيم
          </NmButton>
          {feasibilityResult && (
            <div className="nm-inset p-4 text-sm text-[#2d3748] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {feasibilityResult}
            </div>
          )}
        </NmCard>
      </div>

      {/* Create Modal */}
      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="تسجيل ملف تحكيم جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">موضوع النزاع التحكيمي *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: تحكيم عقد مقاولات إنشاءات تجارية"
              className="nm-input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العميل</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="nm-input"
              >
                <option value="">اختر العميل</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">مؤسسة التحكيم</label>
              <select
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value as any })}
                className="nm-input"
              >
                <option value="مركز التحكيم السعودي">مركز التحكيم السعودي (SCCA)</option>
                <option value="CRCICA">مركز القاهرة الإقليمي (CRCICA)</option>
                <option value="ICC">غرفة التجارة الدولية (ICC)</option>
                <option value="UNCITRAL">قواعد الأونسيترال (UNCITRAL)</option>
                <option value="تحكيم محلي">تحكيم محلي حر</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">قيمة المطالبة</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.claim_value_str}
                onChange={(e) => setForm({ ...form, claim_value_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
                className="nm-input"
              >
                <option value="SAR">SAR (ريال سعودي)</option>
                <option value="EGP">EGP (جنيه مصري)</option>
                <option value="USD">USD (دولار)</option>
                <option value="AED">AED (درهم)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">مقر التحكيم</label>
              <input
                type="text"
                value={form.seat}
                onChange={(e) => setForm({ ...form, seat: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ ملف التحكيم</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
