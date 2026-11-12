import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Plus, Search, UserPlus, Trash2, Phone, Mail } from 'lucide-react';
import { Inquiry, Client, Matter } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmDrawer,
  NmVoiceInput,
} from '../components/ui/NeumorphicPrimitives';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Inquiries() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    inquirer_name: '',
    phone: '',
    email: '',
    matter_type: 'تجاري',
    inquiry_channel: 'واتساب',
    priority: 'متوسطة',
    referral_source: 'الموقع الإلكتروني',
    notes: '',
  });

  useEffect(() => {
    setLoading(true);
    listEntities<Inquiry>('inquiries')
      .then(setInquiries)
      .catch(() => toast.error('تعذّر تحميل الاستفسارات'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((inq) => {
      if (statusFilter !== 'الكل' && inq.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inq.inquirer_name.toLowerCase().includes(q) ||
        inq.serial_number.toLowerCase().includes(q) ||
        inq.phone.toLowerCase().includes(q) ||
        (inq.notes || '').toLowerCase().includes(q)
      );
    });
  }, [inquiries, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inquirer_name.trim() || !form.phone.trim()) {
      toast.error('يرجى إدخال اسم المستفسر ورقم الجوال');
      return;
    }
    try {
      const created = await createEntity<Inquiry>('inquiries', {
        ...form,
        status: 'جديد',
        assigned_to: user?.name || 'أ. كريم الهواري',
        inquiry_date: new Date().toISOString(),
      });
      setInquiries((prev) => [created, ...prev]);
      setCreateOpen(false);
      setForm({
        inquirer_name: '',
        phone: '',
        email: '',
        matter_type: 'تجاري',
        inquiry_channel: 'واتساب',
        priority: 'متوسطة',
        referral_source: 'الموقع الإلكتروني',
        notes: '',
      });
      toast.success('تم تسجيل الاستفسار الجديد');
    } catch {
      toast.error('تعذّر تسجيل الاستفسار');
    }
  };

  const handleConvert = async (inq: Inquiry) => {
    try {
      const newClient = await createEntity<Client>('clients', {
        name: inq.inquirer_name,
        client_type: 'فرد',
        status: 'نشط',
        phone: inq.phone,
        whatsapp: inq.phone,
        email: inq.email || 'client@example.com',
        nationality: 'سعودي',
        id_or_commercial_reg: 'قيد الاستكمال',
        address: 'الرياض',
        responsible_user: inq.assigned_to || user?.name || 'أ. كريم الهواري',
        referral_source: inq.referral_source || inq.inquiry_channel,
        registration_date: new Date().toISOString(),
        notes: inq.notes,
      });

      const newMatter = await createEntity<Matter>('matters', {
        title: `ملف ${inq.matter_type} — ${inq.inquirer_name}`,
        client_id: newClient.id,
        matter_type: inq.matter_type,
        jurisdiction: 'المملكة العربية السعودية',
        stage: 'الاستلام والتقييم',
        status: 'مفتوح',
        priority: (inq.priority as any) || 'متوسطة',
        court_or_authority: 'قيد التحديد',
        lead_lawyer: inq.assigned_to || user?.name || 'أ. كريم الهواري',
        open_date: new Date().toISOString(),
        agreed_fees: 0,
        notes: inq.notes,
      });

      const updated = await updateEntity<Inquiry>('inquiries', inq.id, {
        status: 'مُحوَّل لقضية',
        client_id: newClient.id,
      });
      setInquiries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelected(updated);
      toast.success('تم تحويل الاستفسار إلى عميل وقضية بنجاح');
      navigate(`/matters/${newMatter.id}`);
    } catch {
      toast.error('تعذّر التحويل إلى عميل وقضية');
    }
  };

  const handleStatusChange = async (inq: Inquiry, status: string) => {
    try {
      const updated = await updateEntity<Inquiry>('inquiries', inq.id, { status });
      setInquiries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelected(updated);
      toast.success('تم تحديث حالة الاستفسار');
    } catch {
      toast.error('تعذّر التحديث');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('inquiries', id);
      setInquiries((prev) => prev.filter((x) => x.id !== id));
      setSelected(null);
      toast.success('تم حذف الاستفسار');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Inbox className="w-6 h-6 text-[#4a90d9]" />
            الاستفسارات وطلبات القضايا
          </h1>
          <p className="text-sm text-[#718096]">
            إدارة استفسارات العملاء المحتملين وتحويلها بنقرة واحدة إلى ملف عميل وقضية
          </p>
        </div>
        <NmButton variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          تسجيل استفسار
        </NmButton>
      </div>

      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المستفسر، الرقم التسلسلي، أو الهاتف..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل الحالات</option>
            <option value="جديد">جديد</option>
            <option value="تم التواصل">تم التواصل</option>
            <option value="قيد التقييم">قيد التقييم</option>
            <option value="مُحوَّل لقضية">مُحوَّل لقضية</option>
            <option value="مؤرشف">مؤرشف</option>
          </select>
        </div>
      </NmCard>

      <NmCard className="p-0 overflow-x-auto">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>اسم المستفسر</th>
              <th>النوع</th>
              <th>القناة</th>
              <th>الأولوية</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#718096]">جاري التحميل...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#718096]">لا توجد استفسارات</td>
              </tr>
            ) : (
              filtered.map((inq) => (
                <tr key={inq.id} onClick={() => setSelected(inq)} className="cursor-pointer">
                  <td className="font-mono text-xs text-[#4a90d9] tabular-nums">{inq.serial_number}</td>
                  <td className="font-bold text-[#2d3748]">{inq.inquirer_name}</td>
                  <td className="text-sm text-[#718096]">{inq.matter_type}</td>
                  <td className="text-sm text-[#718096]">{inq.inquiry_channel}</td>
                  <td><StatusBadge status={inq.priority} /></td>
                  <td><StatusBadge status={inq.status} /></td>
                  <td className="text-xs text-[#718096]">{toArabicDate(inq.inquiry_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </NmCard>

      {/* 480px Detail Drawer */}
      <NmDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.inquirer_name || 'تفاصيل الاستفسار'}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="nm-badge text-[#4a90d9] font-mono">{selected.serial_number}</span>
              <StatusBadge status={selected.status} />
              <StatusBadge status={selected.priority} />
            </div>

            <div className="nm-inset p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#2d3748]">
                <Phone className="w-4 h-4 text-[#4a90d9]" />
                <span className="tabular-nums" dir="ltr">{selected.phone}</span>
              </div>
              {selected.email && (
                <div className="flex items-center gap-2 text-[#2d3748]">
                  <Mail className="w-4 h-4 text-[#4a90d9]" />
                  <span>{selected.email}</span>
                </div>
              )}
              <div className="text-xs text-[#718096]">
                التخصص: <span className="text-[#2d3748] font-bold">{selected.matter_type}</span> · القناة:{' '}
                <span className="text-[#2d3748] font-bold">{selected.inquiry_channel}</span>
              </div>
            </div>

            {selected.notes && (
              <div className="nm-inset p-4 text-sm text-[#2d3748] leading-relaxed">
                <div className="text-xs text-[#718096] mb-1">تفاصيل الطلب</div>
                {selected.notes}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold text-[#718096]">تحديث الحالة</div>
              <div className="flex flex-wrap gap-2">
                {['جديد', 'تم التواصل', 'قيد التقييم', 'مؤرشف'].map((st) => (
                  <NmButton
                    key={st}
                    active={selected.status === st}
                    onClick={() => handleStatusChange(selected, st)}
                  >
                    {st}
                  </NmButton>
                ))}
              </div>
            </div>

            {selected.status !== 'مُحوَّل لقضية' && (
              <NmButton
                variant="success"
                className="w-full"
                onClick={() => handleConvert(selected)}
              >
                <UserPlus className="w-4 h-4" />
                تحويل إلى عميل وقضية بنقرة واحدة
              </NmButton>
            )}

            <div className="pt-2 flex justify-start">
              <NmButton variant="danger" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="w-4 h-4" />
                حذف الاستفسار
              </NmButton>
            </div>
          </div>
        )}
      </NmDrawer>

      {/* Create Inquiry Modal */}
      <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="تسجيل استفسار عميل محتمل">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">اسم المستفسر *</label>
              <input
                type="text"
                value={form.inquirer_name}
                onChange={(e) => setForm({ ...form, inquirer_name: e.target.value })}
                className="nm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">رقم الجوال *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+966 5X XXX XXXX"
                className="nm-input tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">نوع القضية</label>
              <select
                value={form.matter_type}
                onChange={(e) => setForm({ ...form, matter_type: e.target.value })}
                className="nm-input"
              >
                <option value="تجاري">تجاري</option>
                <option value="شركات">شركات</option>
                <option value="عقاري">عقاري</option>
                <option value="عمالي">عمالي</option>
                <option value="تحكيم">تحكيم</option>
                <option value="جنائي">جنائي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">القناة</label>
              <select
                value={form.inquiry_channel}
                onChange={(e) => setForm({ ...form, inquiry_channel: e.target.value })}
                className="nm-input"
              >
                <option value="واتساب">واتساب</option>
                <option value="اتصال هاتفي">اتصال هاتفي</option>
                <option value="الموقع الإلكتروني">الموقع الإلكتروني</option>
                <option value="بريد إلكتروني">بريد إلكتروني</option>
                <option value="توصية">توصية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="nm-input"
              >
                <option value="عاجلة">عاجلة</option>
                <option value="عالية">عالية</option>
                <option value="متوسطة">متوسطة</option>
                <option value="منخفضة">منخفضة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">ملخص الاستفسار</label>
            <NmVoiceInput
              multiline
              rows={3}
              value={form.notes}
              onChange={(val) => setForm({ ...form, notes: val })}
              placeholder="اكتب أو أملِ صوتياً ملخص طلب العميل..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ الاستفسار</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
