import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Briefcase, Clock } from 'lucide-react';
import { Consultation, Client, Matter } from '../types/erp';
import { listEntities, createEntity, updateEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
} from '../components/ui/NeumorphicPrimitives';
import { formatSAR, parseMoneyInput, sanitizeMoneyText } from '../utils/currencyUtils';
import { safeSave, toArabicDateTime, toInputValue } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Consultations() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    client_id: '',
    consultation_type: 'عن بعد (فيديو)',
    consultation_date: '',
    duration_minutes: '60',
    lawyer: user?.name || 'أ. كريم الهواري',
    fee_str: '2500',
    summary: '',
    recommendations: '',
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listEntities<Consultation>('consultations'),
      listEntities<Client>('clients'),
    ])
      .then(([cons, cls]) => {
        setConsultations(cons);
        setClients(cls);
      })
      .catch(() => toast.error('تعذّر تحميل الاستشارات'))
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => (map[c.id] = c));
    return map;
  }, [clients]);

  const openCreate = () => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(13, 0, 0, 0);
    setForm({
      title: '',
      client_id: clients[0]?.id || '',
      consultation_type: 'عن بعد (فيديو)',
      consultation_date: toInputValue(nextDay.toISOString()),
      duration_minutes: '60',
      lawyer: user?.name || 'أ. كريم الهواري',
      fee_str: '2500',
      summary: '',
      recommendations: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('يرجى إدخال موضوع الاستشارة');
      return;
    }
    let isoDate = '';
    try {
      isoDate = safeSave(form.consultation_date);
    } catch {
      toast.error('يرجى تحديد موعد استشارة صحيح');
      return;
    }
    try {
      const created = await createEntity<Consultation>('consultations', {
        title: form.title,
        client_id: form.client_id || undefined,
        consultation_type: form.consultation_type,
        status: 'مجدولة',
        consultation_date: isoDate,
        duration_minutes: Number(form.duration_minutes) || 60,
        lawyer: form.lawyer,
        fee: parseMoneyInput(form.fee_str),
        summary: form.summary,
        recommendations: form.recommendations,
      });
      setConsultations((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تم حجز الاستشارة القانونية');
    } catch {
      toast.error('تعذّر حفظ الاستشارة');
    }
  };

  const handleConvertToMatter = async (con: Consultation) => {
    try {
      const newMatter = await createEntity<Matter>('matters', {
        title: con.title,
        client_id: con.client_id || clients[0]?.id || '',
        matter_type: 'شركات',
        jurisdiction: 'المملكة العربية السعودية',
        stage: 'الاستلام والتقييم',
        status: 'مفتوح',
        priority: 'متوسطة',
        court_or_authority: 'قيد التحديد',
        lead_lawyer: con.lawyer,
        open_date: new Date().toISOString(),
        agreed_fees: con.fee || 0,
        notes: `${con.summary || ''}\nالتوصيات: ${con.recommendations || ''}`,
      });
      const updated = await updateEntity<Consultation>('consultations', con.id, {
        converted_to_matter: true,
        matter_id: newMatter.id,
        status: 'مكتملة',
      });
      setConsultations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelected(updated);
      toast.success('تم تحويل الاستشارة إلى ملف قضية');
      navigate(`/matters/${newMatter.id}`);
    } catch {
      toast.error('تعذّر التحويل إلى قضية');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#4a90d9]" />
            الاستشارات القانونية
          </h1>
          <p className="text-sm text-[#718096]">
            جدولة الجلسات الاستشارية، توثيق التوصيات، وتحويلها إلى قضايا
          </p>
        </div>
        <NmButton variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          حجز استشارة جديدة
        </NmButton>
      </div>

      {loading ? (
        <NmCard className="p-8 text-center text-[#718096]">جاري التحميل...</NmCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consultations.map((con) => (
            <NmCard key={con.id} onClick={() => setSelected(con)} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-[#2d3748]">{con.title}</h3>
                <StatusBadge status={con.status} />
              </div>
              <div className="text-xs text-[#718096] flex flex-wrap gap-3">
                <span>العميل: <strong className="text-[#2d3748]">{con.client_id ? clientMap[con.client_id]?.name || '—' : 'غير محدد'}</strong></span>
                <span>المحامي: <strong className="text-[#2d3748]">{con.lawyer}</strong></span>
                <span>النوع: <strong className="text-[#4a90d9]">{con.consultation_type}</strong></span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#718096] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {toArabicDateTime(con.consultation_date)}
                </span>
                <span className="font-bold text-[#27ae60] tabular-nums">{formatSAR(con.fee)}</span>
              </div>
            </NmCard>
          ))}
        </div>
      )}

      <NmModal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || 'تفاصيل الاستشارة'}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              <StatusBadge status={selected.consultation_type} />
              <span className="nm-badge text-[#27ae60] tabular-nums">{formatSAR(selected.fee)}</span>
            </div>
            <div className="nm-inset p-4 space-y-2 text-sm">
              <div>الموعد: <strong>{toArabicDateTime(selected.consultation_date)}</strong> ({selected.duration_minutes} دقيقة)</div>
              <div>المستشار: <strong>{selected.lawyer}</strong></div>
              {selected.summary && <p className="pt-2 text-[#2d3748]">{selected.summary}</p>}
              {selected.recommendations && (
                <p className="pt-1 text-[#4a90d9]">التوصيات: {selected.recommendations}</p>
              )}
            </div>
            {!selected.converted_to_matter && (
              <NmButton variant="success" className="w-full" onClick={() => handleConvertToMatter(selected)}>
                <Briefcase className="w-4 h-4" />
                تحويل الاستشارة إلى قضية جديدة
              </NmButton>
            )}
          </div>
        )}
      </NmModal>

      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="حجز استشارة قانونية جديدة">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">موضوع الاستشارة *</label>
            <NmVoiceInput
              value={form.title}
              onChange={(val) => setForm({ ...form, title: val })}
              placeholder="مثال: استشارة تأسيس شركة ذات مسؤولية محدودة"
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
                <option value="">غير مرتبط بعميل</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الموعد *</label>
              <input
                type="datetime-local"
                value={form.consultation_date}
                onChange={(e) => setForm({ ...form, consultation_date: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الوسيلة</label>
              <select
                value={form.consultation_type}
                onChange={(e) => setForm({ ...form, consultation_type: e.target.value })}
                className="nm-input"
              >
                <option value="عن بعد (فيديو)">عن بعد (فيديو)</option>
                <option value="حضورية">حضورية بالمكتب</option>
                <option value="هاتفية">هاتفية</option>
                <option value="مكتوبة">مكتوبة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الرسوم (SAR)</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={form.fee_str}
                onChange={(e) => setForm({ ...form, fee_str: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">المدة (دقيقة)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: sanitizeMoneyText(e.target.value) })}
                className="nm-input tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">الملخص</label>
            <NmVoiceInput
              multiline
              rows={2}
              value={form.summary}
              onChange={(val) => setForm({ ...form, summary: val })}
              placeholder="محاور الاستشارة..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">تأكيد الحجز</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
