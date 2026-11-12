import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Scale,
  List,
  CheckCircle2,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Hearing, Matter } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmDrawer,
  NmVoiceInput,
} from '../components/ui/NeumorphicPrimitives';
import {
  isValidDate,
  safeSave,
  toArabicDateTime,
  toInputValue,
  getCountdownArabic,
} from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function Hearings() {
  const toast = useToast();
  const { user } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [resultText, setResultText] = useState('');
  const [prepNotes, setPrepNotes] = useState('');
  const [statusEdit, setStatusEdit] = useState<Hearing['status']>('قادم');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    matter_id: '',
    hearing_type: 'مرافعة',
    hearing_date: '',
    status: 'قادم' as Hearing['status'],
    priority: 'مهمة' as Hearing['priority'],
    location: '',
    room_number: '',
    judge: '',
    responsible_user: user?.name || 'أ. كريم الهواري',
    preparation_notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [hList, mList] = await Promise.all([
        listEntities<Hearing>('hearings'),
        listEntities<Matter>('matters'),
      ]);
      setHearings(hList);
      setMatters(mList);
    } catch {
      toast.error('تعذّر تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const matterMap = useMemo(() => {
    const map: Record<string, Matter> = {};
    matters.forEach((m) => (map[m.id] = m));
    return map;
  }, [matters]);

  // BUG-01 Guard: Only pass valid dates to calendar rendering
  const validHearings = useMemo(
    () => hearings.filter((h) => isValidDate(h.hearing_date)),
    [hearings]
  );

  const openHearingDrawer = (h: Hearing) => {
    setSelectedHearing(h);
    setResultText(h.hearing_result || '');
    setPrepNotes(h.preparation_notes || '');
    setStatusEdit(h.status);
  };

  const handleSaveDrawer = async () => {
    if (!selectedHearing) return;
    try {
      const updated = await updateEntity<Hearing>('hearings', selectedHearing.id, {
        status: statusEdit,
        hearing_result: resultText,
        preparation_notes: prepNotes,
      });
      setHearings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelectedHearing(updated);
      toast.success('تم تحديث بيانات الجلسة');
    } catch {
      toast.error('تعذّر تحديث الجلسة');
    }
  };

  const handleDeleteHearing = async (id: string) => {
    try {
      await deleteEntity('hearings', id);
      setHearings((prev) => prev.filter((x) => x.id !== id));
      setSelectedHearing(null);
      toast.success('تم حذف الجلسة');
    } catch {
      toast.error('تعذّر حذف الجلسة');
    }
  };

  const openCreateModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);
    setForm({
      title: '',
      matter_id: matters[0]?.id || '',
      hearing_type: 'مرافعة',
      hearing_date: toInputValue(tomorrow.toISOString()),
      status: 'قادم',
      priority: 'مهمة',
      location: matters[0]?.court_or_authority || '',
      room_number: '',
      judge: '',
      responsible_user: user?.name || 'أ. كريم الهواري',
      preparation_notes: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.matter_id) {
      toast.error('يرجى إدخال عنوان الجلسة واختيار القضية');
      return;
    }
    let isoDate = '';
    try {
      isoDate = safeSave(form.hearing_date);
    } catch {
      toast.error('يرجى تحديد تاريخ ووقت الجلسة بشكل صحيح');
      return;
    }

    try {
      const created = await createEntity<Hearing>('hearings', {
        ...form,
        hearing_date: isoDate,
      });
      setHearings((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تمت جدولة الجلسة بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر حفظ الجلسة');
    }
  };

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr?: string }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, dateStr: `${year}-${mm}-${dd}` });
    }
    return cells;
  }, [currentMonth]);

  const hearingsByDate = useMemo(() => {
    const map: Record<string, Hearing[]> = {};
    validHearings.forEach((h) => {
      const d = new Date(h.hearing_date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [validHearings]);

  const countdownColor = (urgency: string) =>
    urgency === 'danger'
      ? 'text-[#e74c3c]'
      : urgency === 'warning'
      ? 'text-[#e67e22]'
      : urgency === 'success'
      ? 'text-[#27ae60]'
      : 'text-[#718096]';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#4a90d9]" />
            الجلسات والتقويم القضائي
          </h1>
          <p className="text-sm text-[#718096]">
            متابعة مواعيد الجلسات بالعد التنازلي المباشر وسجل التحضير ونتائج المحاكم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NmButton active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}>
            <Calendar className="w-4 h-4" />
            التقويم الشهري
          </NmButton>
          <NmButton active={viewMode === 'list'} onClick={() => setViewMode('list')}>
            <List className="w-4 h-4" />
            قائمة الجلسات
          </NmButton>
          <NmButton variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            جدولة جلسة
          </NmButton>
        </div>
      </div>

      {loading ? (
        <NmCard className="p-10 text-center text-[#718096]">جاري تحميل جدول الجلسات...</NmCard>
      ) : viewMode === 'calendar' ? (
        <NmCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <NmButton
              onClick={() =>
                setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
            >
              <ChevronRight className="w-4 h-4" />
              الشهر السابق
            </NmButton>
            <h2 className="text-lg font-bold text-[#2d3748]">
              {currentMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </h2>
            <NmButton
              onClick={() =>
                setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
            >
              الشهر التالي
              <ChevronLeft className="w-4 h-4" />
            </NmButton>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS_AR.map((wd) => (
              <div key={wd} className="text-center text-xs font-bold text-[#718096] py-2">
                {wd}
              </div>
            ))}
            {calendarDays.map((cell, idx) => {
              const dayHearings = cell.dateStr ? hearingsByDate[cell.dateStr] || [] : [];
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 rounded-xl ${
                    cell.day ? 'nm-inset' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {cell.day && (
                    <>
                      <div className="text-xs font-bold text-[#718096] mb-1 tabular-nums">
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {dayHearings.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => openHearingDrawer(h)}
                            className="w-full text-right nm-raised px-2 py-1 text-[11px] font-bold text-[#4a90d9] hover:text-[#2d3748] truncate block"
                          >
                            {h.title}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </NmCard>
      ) : (
        <div className="space-y-3">
          {hearings.length === 0 ? (
            <NmCard className="p-8 text-center text-[#718096]">لا توجد جلسات مسجلة</NmCard>
          ) : (
            hearings.map((h) => {
              const cd = getCountdownArabic(h.hearing_date);
              return (
                <NmCard
                  key={h.id}
                  onClick={() => openHearingDrawer(h)}
                  className="p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#2d3748]">{h.title}</h3>
                      <StatusBadge status={h.status} />
                      <StatusBadge status={h.priority} />
                    </div>
                    <div className="text-xs text-[#718096] flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-[#4a90d9]" />
                        {matterMap[h.matter_id]?.title || 'قضية غير محددة'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {h.location} {h.room_number ? `— قاعة ${h.room_number}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <div className="text-sm font-bold text-[#2d3748] tabular-nums">
                      {toArabicDateTime(h.hearing_date)}
                    </div>
                    <div className={`text-xs font-bold flex items-center gap-1 justify-end ${countdownColor(cd.urgency)}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {cd.label}
                    </div>
                  </div>
                </NmCard>
              );
            })
          )}
        </div>
      )}

      {/* Hearing Detail 480px Drawer */}
      <NmDrawer
        open={Boolean(selectedHearing)}
        onClose={() => setSelectedHearing(null)}
        title={selectedHearing?.title || 'تفاصيل الجلسة'}
      >
        {selectedHearing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedHearing.status} />
              <StatusBadge status={selectedHearing.priority} />
              <StatusBadge status={selectedHearing.hearing_type} />
            </div>

            <div className="nm-inset p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#718096]">القضية:</span>
                <span className="font-bold text-[#4a90d9]">
                  {matterMap[selectedHearing.matter_id]?.title || 'غير محدد'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">الموعد:</span>
                <span className="font-bold text-[#2d3748] tabular-nums">
                  {toArabicDateTime(selectedHearing.hearing_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">المكان:</span>
                <span className="font-bold text-[#2d3748]">
                  {selectedHearing.location} {selectedHearing.room_number ? `(${selectedHearing.room_number})` : ''}
                </span>
              </div>
              {selectedHearing.judge && (
                <div className="flex justify-between">
                  <span className="text-[#718096]">الدائرة / القاضي:</span>
                  <span className="font-bold text-[#2d3748]">{selectedHearing.judge}</span>
                </div>
              )}
            </div>

            {selectedHearing.ai_preparation_checklist &&
              selectedHearing.ai_preparation_checklist.length > 0 && (
                <div className="nm-inset p-4 space-y-2">
                  <div className="text-xs font-bold text-[#4a90d9]">قائمة التحضير المقترحة</div>
                  {selectedHearing.ai_preparation_checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#2d3748]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#27ae60] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">حالة الجلسة</label>
              <select
                value={statusEdit}
                onChange={(e) => setStatusEdit(e.target.value as Hearing['status'])}
                className="nm-input"
              >
                <option value="قادم">قادم</option>
                <option value="مكتمل">مكتمل</option>
                <option value="مؤجل">مؤجل</option>
                <option value="ملغى">ملغى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">ملاحظات التحضير</label>
              <NmVoiceInput
                multiline
                rows={3}
                value={prepNotes}
                onChange={setPrepNotes}
                placeholder="الأسانيد والمذكرات المطلوب تقديمها في الجلسة..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">قرار / نتيجة الجلسة</label>
              <NmVoiceInput
                multiline
                rows={3}
                value={resultText}
                onChange={setResultText}
                placeholder="ما تم إثباته في محضر الجلسة أو قرار التأجيل..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <NmButton
                variant="danger"
                onClick={() => handleDeleteHearing(selectedHearing.id)}
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </NmButton>
              <NmButton variant="primary" onClick={handleSaveDrawer}>
                حفظ التحديثات
              </NmButton>
            </div>
          </div>
        )}
      </NmDrawer>

      {/* Create Hearing Modal */}
      <NmModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="جدولة جلسة قضائية جديدة"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">عنوان الجلسة *</label>
            <NmVoiceInput
              value={form.title}
              onChange={(val) => setForm({ ...form, title: val })}
              placeholder="مثال: جلسة المرافعة الختامية وتقديم المستندات"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">القضية *</label>
              <select
                value={form.matter_id}
                onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
                className="nm-input"
              >
                <option value="">اختر القضية</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.case_number} — {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">تاريخ ووقت الجلسة *</label>
              <input
                type="datetime-local"
                value={form.hearing_date}
                onChange={(e) => setForm({ ...form, hearing_date: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">نوع الجلسة</label>
              <select
                value={form.hearing_type}
                onChange={(e) => setForm({ ...form, hearing_type: e.target.value })}
                className="nm-input"
              >
                <option value="أول جلسة">أول جلسة</option>
                <option value="مرافعة">مرافعة</option>
                <option value="نطق بالحكم">نطق بالحكم</option>
                <option value="خبراء">خبراء</option>
                <option value="تحقيق">تحقيق</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Hearing['priority'] })}
                className="nm-input"
              >
                <option value="عاجلة">عاجلة</option>
                <option value="مهمة">مهمة</option>
                <option value="عادية">عادية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">المحامي الحاضر</label>
              <input
                type="text"
                value={form.responsible_user}
                onChange={(e) => setForm({ ...form, responsible_user: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">المحكمة / الجهة</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="المحكمة التجارية بالرياض"
                className="nm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">رقم القاعة / الدائرة</label>
              <input
                type="text"
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                placeholder="الدائرة الرابعة"
                className="nm-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">ملاحظات التحضير</label>
            <NmVoiceInput
              multiline
              rows={2}
              value={form.preparation_notes}
              onChange={(val) => setForm({ ...form, preparation_notes: val })}
              placeholder="ملاحظات وتجهيزات الجلسة..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">تأكيد الجدولة</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
