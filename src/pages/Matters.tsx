import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Plus, Search, LayoutGrid, List, AlertTriangle, Pin } from 'lucide-react';
import { listEntities, createEntity, updateEntity } from '../lib/api';
import { Matter, Client } from '../types/erp';
import { daysUntil, toArabicDate, toDateInputValue } from '../utils/dateUtils';
import { formatSAR, parseMoneyInput, sanitizeMoneyText } from '../utils/currencyUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  NmCard,
  NmButton,
  NmModal,
  NmVoiceInput,
  NmDateShortcuts,
  StatusBadge,
} from '../components/ui/NeumorphicPrimitives';

const COURTS = [
  'المحكمة التجارية بالرياض',
  'المحكمة التجارية بجدة',
  'محكمة النقض المصرية',
  'محكمة استئناف القاهرة',
  'محكمة القاهرة الاقتصادية',
  'محكمة القاهرة الابتدائية',
  'مجلس الدولة — المحكمة الإدارية',
  'مركز القاهرة الإقليمي للتحكيم التجاري الدولي (CRCICA)',
  'المركز السعودي للتحكيم التجاري (SCCA)',
  'محكمة أخرى',
];

const STAGES = ['افتتاح', 'إجراءات أولية', 'قيد التقاضي', 'مفاوضات', 'تحكيم', 'صدر حكم', 'استئناف', 'تنفيذ', 'مغلق'];

export default function Matters() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'urgent'>('list');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    title: '',
    client_id: '',
    matter_type: 'تجاري',
    jurisdiction: 'السعودية',
    stage: 'افتتاح',
    status: 'مفتوح' as Matter['status'],
    priority: 'متوسطة' as Matter['priority'],
    court_or_authority: COURTS[0],
    authority_case_number: '',
    legal_basis: '',
    agreed_fees_text: '',
    case_value_text: '',
    statute_of_limitations_date: '',
    notes: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([listEntities<Matter>('matters'), listEntities<Client>('clients')])
      .then(([mt, cl]) => {
        setMatters(mt);
        setClients(cl);
        if (!form.client_id && cl[0]) {
          setForm((prev) => ({ ...prev, client_id: cl[0].id }));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const clientName = (cid: string) => clients.find((c) => c.id === cid)?.name || 'عميل غير محدد';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = matters.filter(
      (m) =>
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.case_number.toLowerCase().includes(q) ||
        m.court_or_authority.toLowerCase().includes(q) ||
        clientName(m.client_id).toLowerCase().includes(q)
    );
    if (viewMode === 'urgent') {
      list = list.filter((m) => {
        const d = daysUntil(m.statute_of_limitations_date);
        return m.priority === 'عاجلة' || (d !== null && d <= 30);
      });
    }
    return [...list].sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)));
  }, [matters, clients, search, viewMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client_id) {
      toast.error('يرجى إدخال عنوان القضية واختيار العميل');
      return;
    }
    try {
      await createEntity<Matter>('matters', {
        title: form.title,
        client_id: form.client_id,
        matter_type: form.matter_type,
        jurisdiction: form.jurisdiction,
        stage: form.stage,
        status: form.status,
        priority: form.priority,
        court_or_authority: form.court_or_authority,
        authority_case_number: form.authority_case_number,
        legal_basis: form.legal_basis,
        lead_lawyer: user?.name || 'أ. كريم الهواري',
        open_date: new Date().toISOString(),
        statute_of_limitations_date: form.statute_of_limitations_date
          ? new Date(form.statute_of_limitations_date).toISOString()
          : undefined,
        agreed_fees: parseMoneyInput(form.agreed_fees_text),
        case_value: parseMoneyInput(form.case_value_text),
        notes: form.notes,
      });
      toast.success('تم فتح ملف القضية بنجاح');
      setShowAdd(false);
      setForm((p) => ({ ...p, title: '', authority_case_number: '', legal_basis: '', agreed_fees_text: '', case_value_text: '', notes: '' }));
      load();
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر حفظ القضية');
    }
  };

  const togglePin = async (e: React.MouseEvent, m: Matter) => {
    e.stopPropagation();
    const updated = await updateEntity<Matter>('matters', m.id, { is_pinned: !m.is_pinned });
    setMatters((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
  };

  return (
    <div className="space-y-6">
      <NmCard className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nm-inset w-11 h-11 rounded-xl flex items-center justify-center text-[#4a90d9]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#2d3748]">إدارة القضايا والملفات</h1>
            <p className="text-xs text-[#718096]">اضغط على أي قضية للدخول إلى خارطة الإجراءات ومحرك التحليل والمحاكاة</p>
          </div>
        </div>
        <NmButton variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          فتح قضية جديدة
        </NmButton>
      </NmCard>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="nm-inset flex items-center px-3 py-1.5 gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#718096]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم القضية، العنوان، المحكمة، العميل..."
            className="bg-transparent border-0 outline-none w-full text-sm text-[#2d3748]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <NmButton active={viewMode === 'list'} variant={viewMode === 'list' ? 'primary' : 'default'} onClick={() => setViewMode('list')}>
            <List className="w-4 h-4" />
            قائمة
          </NmButton>
          <NmButton active={viewMode === 'kanban'} variant={viewMode === 'kanban' ? 'primary' : 'default'} onClick={() => setViewMode('kanban')}>
            <LayoutGrid className="w-4 h-4" />
            لوحة المراحل
          </NmButton>
          <NmButton active={viewMode === 'urgent'} variant={viewMode === 'urgent' ? 'danger' : 'default'} onClick={() => setViewMode('urgent')}>
            <AlertTriangle className="w-4 h-4" />
            عاجل وتقادم قريب
          </NmButton>
        </div>
      </div>

      {loading ? (
        <NmCard className="p-8 text-center text-sm text-[#718096]">جاري تحميل القضايا...</NmCard>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {['افتتاح', 'إجراءات أولية', 'قيد التقاضي', 'تحكيم'].map((st) => {
            const col = filtered.filter((m) => m.stage === st);
            return (
              <NmCard key={st} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#2d3748]">{st}</h3>
                  <span className="nm-badge text-[#4a90d9] tabular-nums">{col.length}</span>
                </div>
                <div className="space-y-2.5">
                  {col.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/matters/${m.id}`)}
                      className="nm-inset p-3 cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4a90d9] tabular-nums">{m.case_number}</span>
                        <StatusBadge status={m.priority} />
                      </div>
                      <p className="text-sm font-bold text-[#2d3748] leading-snug">{m.title}</p>
                      <p className="text-xs text-[#718096]">{clientName(m.client_id)}</p>
                    </div>
                  ))}
                  {col.length === 0 && <p className="text-xs text-[#a0aec0] text-center py-4">لا توجد قضايا</p>}
                </div>
              </NmCard>
            );
          })}
        </div>
      ) : (
        <NmCard className="overflow-x-auto">
          <table className="nm-table text-right">
            <thead>
              <tr className="text-xs font-bold text-[#718096]">
                <th className="py-3 px-3">تثبيت</th>
                <th className="py-3 px-3">الرقم</th>
                <th className="py-3 px-3">عنوان القضية</th>
                <th className="py-3 px-3">العميل</th>
                <th className="py-3 px-3">المحكمة</th>
                <th className="py-3 px-3">المرحلة</th>
                <th className="py-3 px-3">التقادم</th>
                <th className="py-3 px-3">الأتعاب (SAR)</th>
                <th className="py-3 px-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const limDays = daysUntil(m.statute_of_limitations_date);
                return (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/matters/${m.id}`)}
                    className="nm-clickable cursor-pointer text-sm text-[#2d3748]"
                  >
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={(e) => togglePin(e, m)}
                        className={`nm-icon-btn w-7 h-7 flex items-center justify-center ${
                          m.is_pinned ? 'text-[#c9a84c]' : 'text-[#a0aec0]'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#4a90d9] tabular-nums">{m.case_number}</td>
                    <td className="py-3 px-3 font-bold max-w-xs truncate">{m.title}</td>
                    <td className="py-3 px-3 text-[#718096]">{clientName(m.client_id)}</td>
                    <td className="py-3 px-3 text-xs text-[#718096] max-w-[180px] truncate">{m.court_or_authority}</td>
                    <td className="py-3 px-3 text-xs font-semibold">{m.stage}</td>
                    <td className="py-3 px-3 text-xs tabular-nums">
                      {limDays !== null ? (
                        <span className={limDays <= 30 ? 'text-[#e74c3c] font-bold' : 'text-[#27ae60]'}>
                          {limDays} يوم ({toArabicDate(m.statute_of_limitations_date)})
                        </span>
                      ) : (
                        'غير محدد'
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold tabular-nums">{formatSAR(m.agreed_fees)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </NmCard>
      )}

      {/* Create Matter Modal */}
      <NmModal open={showAdd} onClose={() => setShowAdd(false)} title="فتح ملف قضية جديد" maxWidth="max-w-3xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#718096]">عنوان القضية *</label>
              <NmVoiceInput value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="مثال: دعوى تعويض عن إخلال بعقد مقاولات" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">العميل *</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="nm-input"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.serial_number})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">المحكمة / الجهة المختصة</label>
              <select
                value={form.court_or_authority}
                onChange={(e) => setForm({ ...form, court_or_authority: e.target.value })}
                className="nm-input"
              >
                {COURTS.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">نوع القضية</label>
              <select value={form.matter_type} onChange={(e) => setForm({ ...form, matter_type: e.target.value })} className="nm-input">
                {['تجاري', 'مدني', 'عمالي', 'عقاري', 'شركات', 'تحكيم', 'جنائي', 'إداري', 'أسري'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">المرحلة</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="nm-input">
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">الأتعاب المتفق عليها (ر.س — SAR)</label>
              {/* BUG-02: Never use type="number" on money input + onWheel blur */}
              <input
                type="text"
                inputMode="decimal"
                value={form.agreed_fees_text}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) => setForm({ ...form, agreed_fees_text: sanitizeMoneyText(e.target.value) })}
                placeholder="0.00"
                className="nm-input tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">قيمة المطالبة (ر.س — SAR)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.case_value_text}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) => setForm({ ...form, case_value_text: sanitizeMoneyText(e.target.value) })}
                placeholder="0.00"
                className="nm-input tabular-nums"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-[#718096]">تاريخ سقوط الحق / التقادم (اختياري)</label>
              <input
                type="date"
                value={toDateInputValue(form.statute_of_limitations_date)}
                onChange={(e) => setForm({ ...form, statute_of_limitations_date: e.target.value })}
                className="nm-input"
              />
              <NmDateShortcuts onSelect={(d) => setForm({ ...form, statute_of_limitations_date: d })} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#718096]">الأساس القانوني وملاحظات القضية</label>
            <NmVoiceInput multiline rows={3} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="الوقائع والأساس القانوني..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <NmButton type="button" onClick={() => setShowAdd(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ القضية</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
