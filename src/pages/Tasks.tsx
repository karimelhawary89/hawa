import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  LayoutGrid,
  List,
  Search,
  Clock,
  Trash2,
  Edit3,
  Briefcase,
  User,
} from 'lucide-react';
import { TaskItem, Matter } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
  NmDateShortcuts,
} from '../components/ui/NeumorphicPrimitives';
import { toArabicDate, toDateInputValue, safeSave, daysUntil } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TASK_STATUSES: TaskItem['status'][] = [
  'لم تبدأ',
  'جارية',
  'بانتظار العميل',
  'بانتظار الموافقة',
  'مكتملة',
  'ملغاة',
];

const KANBAN_COLUMNS: TaskItem['status'][] = [
  'لم تبدأ',
  'جارية',
  'بانتظار العميل',
  'بانتظار الموافقة',
  'مكتملة',
];

export default function Tasks() {
  const toast = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [priorityFilter, setPriorityFilter] = useState('الكل');

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [form, setForm] = useState({
    title: '',
    matter_id: '',
    status: 'لم تبدأ' as TaskItem['status'],
    priority: 'متوسطة' as TaskItem['priority'],
    assigned_to: user?.name || 'أ. كريم الهواري',
    due_date: '',
    task_type: 'صياغة مذكرة',
    is_recurring: false,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, mList] = await Promise.all([
        listEntities<TaskItem>('tasks'),
        listEntities<Matter>('matters'),
      ]);
      setTasks(tList);
      setMatters(mList);
    } catch {
      toast.error('تعذّر تحميل المهام');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'الكل' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'الكل' && t.priority !== priorityFilter) return false;
      if (q) {
        const mTitle = matterMap[t.matter_id || '']?.title || '';
        return (
          t.title.toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          t.assigned_to.toLowerCase().includes(q) ||
          mTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, matterMap]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      title: '',
      matter_id: '',
      status: 'لم تبدأ',
      priority: 'متوسطة',
      assigned_to: user?.name || 'أ. كريم الهواري',
      due_date: toDateInputValue(new Date().toISOString()),
      task_type: 'صياغة مذكرة',
      is_recurring: false,
      notes: '',
    });
    setCreateOpen(true);
  };

  const openEditModal = (t: TaskItem) => {
    setEditingTask(t);
    setForm({
      title: t.title,
      matter_id: t.matter_id || '',
      status: t.status,
      priority: t.priority,
      assigned_to: t.assigned_to,
      due_date: toDateInputValue(t.due_date),
      task_type: t.task_type,
      is_recurring: Boolean(t.is_recurring),
      notes: t.notes || '',
    });
    setSelectedTask(null);
    setCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('يرجى إدخال عنوان المهمة');
      return;
    }
    let isoDue = '';
    try {
      isoDue = safeSave(form.due_date);
    } catch {
      toast.error('يرجى تحديد تاريخ استحقاق صحيح');
      return;
    }

    const payload: Partial<TaskItem> = {
      ...form,
      matter_id: form.matter_id || undefined,
      due_date: isoDue,
    };

    try {
      if (editingTask) {
        const updated = await updateEntity<TaskItem>('tasks', editingTask.id, payload);
        setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast.success('تم تحديث المهمة');
      } else {
        const created = await createEntity<TaskItem>('tasks', payload);
        setTasks((prev) => [created, ...prev]);
        toast.success('تم إنشاء المهمة بنجاح');
      }
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر حفظ المهمة');
    }
  };

  const handleStatusChange = async (task: TaskItem, nextStatus: TaskItem['status']) => {
    try {
      const updated = await updateEntity<TaskItem>('tasks', task.id, { status: nextStatus });
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      if (selectedTask?.id === task.id) setSelectedTask(updated);
      toast.success(`تم نقل المهمة إلى "${nextStatus}"`);
    } catch {
      toast.error('تعذّر تحديث الحالة');
    }
  };

  const handleDelete = async (task: TaskItem) => {
    try {
      await deleteEntity('tasks', task.id);
      setTasks((prev) => prev.filter((x) => x.id !== task.id));
      setSelectedTask(null);
      toast.success('تم حذف المهمة');
    } catch {
      toast.error('تعذّر حذف المهمة');
    }
  };

  const renderDueBadge = (dueDate: string, status: string) => {
    const d = daysUntil(dueDate);
    if (d === null) return <span className="text-xs text-[#718096]">تاريخ غير محدد</span>;
    if (status === 'مكتملة' || status === 'ملغاة') {
      return <span className="text-xs text-[#718096] tabular-nums">{toArabicDate(dueDate)}</span>;
    }
    const color =
      d < 0 ? 'text-[#e74c3c]' : d <= 2 ? 'text-[#e67e22]' : 'text-[#718096]';
    return (
      <span className={`text-xs font-medium inline-flex items-center gap-1 ${color} tabular-nums`}>
        <Clock className="w-3.5 h-3.5" />
        {d < 0 ? `متأخرة (${Math.abs(d)} يوم)` : d === 0 ? 'تستحق اليوم' : toArabicDate(dueDate)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#4a90d9]" />
            إدارة المهام القانونية
          </h1>
          <p className="text-sm text-[#718096]">
            متابعة تكليفات المكتب والمواعيد الإجرائية عبر لوحة كانبان والقائمة التفصيلية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NmButton
            active={viewMode === 'kanban'}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4" />
            كانبان
          </NmButton>
          <NmButton
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
            قائمة
          </NmButton>
          <NmButton variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            مهمة جديدة
          </NmButton>
        </div>
      </div>

      {/* Filters */}
      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بعنوان المهمة، المكلف، أو القضية..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل الحالات</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل الأولويات</option>
            <option value="عاجلة">عاجلة</option>
            <option value="عالية">عالية</option>
            <option value="متوسطة">متوسطة</option>
            <option value="منخفضة">منخفضة</option>
          </select>
        </div>
      </NmCard>

      {loading ? (
        <NmCard className="p-10 text-center text-[#718096]">جاري تحميل المهام...</NmCard>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col);
            return (
              <div key={col} className="nm-inset p-3 space-y-3 min-h-[420px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-[#2d3748]">{col}</span>
                  <span className="nm-badge text-[#4a90d9] tabular-nums">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="text-xs text-[#718096] text-center py-8">لا توجد مهام</div>
                  ) : (
                    colTasks.map((t) => (
                      <NmCard
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-[#2d3748] leading-snug">{t.title}</h4>
                          <StatusBadge status={t.priority} />
                        </div>
                        {t.matter_id && matterMap[t.matter_id] && (
                          <div className="text-xs text-[#4a90d9] flex items-center gap-1 truncate">
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{matterMap[t.matter_id].title}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#718096] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {t.assigned_to}
                          </span>
                          {renderDueBadge(t.due_date, t.status)}
                        </div>
                      </NmCard>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <NmCard className="p-0 overflow-x-auto">
          <table className="nm-table w-full text-right">
            <thead>
              <tr>
                <th>المهمة</th>
                <th>القضية</th>
                <th>النوع</th>
                <th>المكلف</th>
                <th>الأولوية</th>
                <th>الحالة</th>
                <th>تاريخ الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#718096]">
                    لا توجد مهام مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="cursor-pointer"
                  >
                    <td className="font-bold text-[#2d3748]">{t.title}</td>
                    <td className="text-sm text-[#4a90d9]">
                      {t.matter_id && matterMap[t.matter_id] ? matterMap[t.matter_id].title : 'عام'}
                    </td>
                    <td className="text-sm text-[#718096]">{t.task_type}</td>
                    <td className="text-sm text-[#2d3748]">{t.assigned_to}</td>
                    <td><StatusBadge status={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>{renderDueBadge(t.due_date, t.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </NmCard>
      )}

      {/* Task Detail Modal (BUG-03) */}
      <NmModal
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || 'تفاصيل المهمة'}
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedTask.status} />
              <StatusBadge status={selectedTask.priority} />
              <StatusBadge status={selectedTask.task_type} />
            </div>

            <div className="nm-inset p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-[#718096]">المكلف بالتنفيذ</div>
                <div className="font-bold text-[#2d3748]">{selectedTask.assigned_to}</div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">تاريخ الاستحقاق</div>
                <div className="font-bold text-[#2d3748]">{toArabicDate(selectedTask.due_date)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-[#718096]">القضية المرتبطة</div>
                <div className="font-bold text-[#4a90d9]">
                  {selectedTask.matter_id && matterMap[selectedTask.matter_id]
                    ? `${matterMap[selectedTask.matter_id].case_number} — ${matterMap[selectedTask.matter_id].title}`
                    : 'مهمة إدارية عامة'}
                </div>
              </div>
            </div>

            {selectedTask.notes && (
              <div className="nm-inset p-4 text-sm text-[#2d3748] leading-relaxed">
                <div className="text-xs text-[#718096] mb-1">الملاحظات والتعليمات</div>
                {selectedTask.notes}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold text-[#718096]">تغيير الحالة السريع</div>
              <div className="flex flex-wrap gap-2">
                {TASK_STATUSES.map((st) => (
                  <NmButton
                    key={st}
                    active={selectedTask.status === st}
                    variant={selectedTask.status === st ? 'primary' : 'default'}
                    onClick={() => handleStatusChange(selectedTask, st)}
                  >
                    {st}
                  </NmButton>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <NmButton variant="danger" onClick={() => handleDelete(selectedTask)}>
                <Trash2 className="w-4 h-4" />
                حذف المهمة
              </NmButton>
              <NmButton variant="primary" onClick={() => openEditModal(selectedTask)}>
                <Edit3 className="w-4 h-4" />
                تعديل التفاصيل
              </NmButton>
            </div>
          </div>
        )}
      </NmModal>

      {/* Create / Edit Task Modal */}
      <NmModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editingTask ? 'تعديل المهمة' : 'إنشاء مهمة قانونية جديدة'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">عنوان المهمة *</label>
            <NmVoiceInput
              value={form.title}
              onChange={(val) => setForm({ ...form, title: val })}
              placeholder="مثال: إعداد مذكرة الرد على الدعوى التجارية"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">القضية المرتبطة</label>
              <select
                value={form.matter_id}
                onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
                className="nm-input"
              >
                <option value="">مهمة عامة (غير مرتبطة بقضية)</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.case_number} — {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">نوع المهمة</label>
              <select
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                className="nm-input"
              >
                <option value="صياغة مذكرة">صياغة مذكرة</option>
                <option value="مراجعة عقد">مراجعة عقد</option>
                <option value="حضور جلسة">حضور جلسة</option>
                <option value="متابعة إدارية">متابعة إدارية</option>
                <option value="بحث قانوني">بحث قانوني</option>
                <option value="تواصل مع عميل">تواصل مع عميل</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskItem['status'] })}
                className="nm-input"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskItem['priority'] })}
                className="nm-input"
              >
                <option value="عاجلة">عاجلة</option>
                <option value="عالية">عالية</option>
                <option value="متوسطة">متوسطة</option>
                <option value="منخفضة">منخفضة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">المسؤول</label>
              <input
                type="text"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">تاريخ الاستحقاق *</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="nm-input"
            />
            <NmDateShortcuts onSelect={(dateVal) => setForm({ ...form, due_date: dateVal })} />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">ملاحظات</label>
            <NmVoiceInput
              multiline
              rows={3}
              value={form.notes}
              onChange={(val) => setForm({ ...form, notes: val })}
              placeholder="تفاصيل التكليف والمستندات المطلوبة..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">
              {editingTask ? 'حفظ التعديلات' : 'إضافة المهمة'}
            </NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
