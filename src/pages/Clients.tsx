import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, FileText, Phone, MessageCircle, Printer } from 'lucide-react';
import { listEntities, createEntity } from '../lib/api';
import { Client } from '../types/erp';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  NmCard,
  NmButton,
  NmModal,
  NmVoiceInput,
  StatusBadge,
} from '../components/ui/NeumorphicPrimitives';

export default function Clients() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [showAdd, setShowAdd] = useState(false);
  const [showIntake, setShowIntake] = useState(false);

  const [form, setForm] = useState({
    name: '',
    client_type: 'شركة' as Client['client_type'],
    status: 'نشط' as Client['status'],
    phone: '',
    whatsapp: '',
    email: '',
    nationality: 'السعودية',
    id_or_commercial_reg: '',
    address: '',
    referral_source: 'توصية شخصية',
    notes: '',
  });

  const [intake, setIntake] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    matter_title: '',
    matter_description: '',
    desired_outcome: '',
    dispute_date: '',
    prior_representation: 'لا',
    notes: '',
  });

  const load = () => {
    setLoading(true);
    listEntities<Client>('clients')
      .then(setClients)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const typeOk = typeFilter === 'الكل' || c.client_type === typeFilter;
      const qOk =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.serial_number.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q);
      return typeOk && qOk;
    });
  }, [clients, search, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('اسم العميل مطلوب');
      return;
    }
    try {
      await createEntity<Client>('clients', {
        ...form,
        responsible_user: user?.name || 'أ. كريم الهواري',
        registration_date: new Date().toISOString(),
      });
      toast.success('تم إضافة العميل بنجاح');
      setShowAdd(false);
      setForm({
        name: '',
        client_type: 'شركة',
        status: 'نشط',
        phone: '',
        whatsapp: '',
        email: '',
        nationality: 'السعودية',
        id_or_commercial_reg: '',
        address: '',
        referral_source: 'توصية شخصية',
        notes: '',
      });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر إضافة العميل');
    }
  };

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intake.name.trim() || !intake.matter_title.trim()) {
      toast.error('يرجى إدخال اسم العميل وعنوان الموضوع');
      return;
    }
    try {
      const newClient = await createEntity<Client>('clients', {
        name: intake.name,
        client_type: 'فرد',
        status: 'نشط',
        phone: intake.phone,
        email: intake.email,
        nationality: 'مصر',
        id_or_commercial_reg: intake.id_number,
        address: '',
        responsible_user: user?.name || 'أ. كريم الهواري',
        referral_source: 'نموذج استقبال سري',
        registration_date: new Date().toISOString(),
        notes: intake.notes,
      });
      await createEntity('matters', {
        title: intake.matter_title,
        client_id: newClient.id,
        matter_type: 'تجاري',
        jurisdiction: 'مصر',
        stage: 'افتتاح',
        status: 'مفتوح',
        priority: 'متوسطة',
        court_or_authority: 'محكمة القاهرة الابتدائية',
        lead_lawyer: user?.name || 'أ. كريم الهواري',
        open_date: new Date().toISOString(),
        agreed_fees: 0,
        notes: `${intake.matter_description}\nالنتيجة المطلوبة: ${intake.desired_outcome}`,
      });
      toast.success('تم إنشاء ملف العميل والقضية المرتبطة بنجاح');
      setShowIntake(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء حفظ نموذج الاستقبال');
    }
  };

  return (
    <div className="space-y-6">
      <NmCard className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nm-inset w-11 h-11 rounded-xl flex items-center justify-center text-[#4a90d9]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#2d3748]">إدارة العملاء والموكلين</h1>
            <p className="text-xs text-[#718096]">اضغط على أي عميل لعرض الملف الكامل والقضايا والفواتير</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NmButton onClick={() => setShowIntake(true)}>
            <FileText className="w-4 h-4 text-[#c9a84c]" />
            نموذج استقبال عميل سري
          </NmButton>
          <NmButton variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            إضافة عميل جديد
          </NmButton>
        </div>
      </NmCard>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="nm-inset flex items-center px-3 py-1.5 gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#718096]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الرقم التسلسلي، الهاتف..."
            className="bg-transparent border-0 outline-none w-full text-sm text-[#2d3748]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['الكل', 'فرد', 'شركة', 'مؤسسة', 'جهة حكومية'].map((t) => (
            <NmButton
              key={t}
              active={typeFilter === t}
              variant={typeFilter === t ? 'primary' : 'default'}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </NmButton>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <NmCard className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[#718096] py-8 text-center">جاري تحميل العملاء...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-bold text-[#2d3748]">لا يوجد عملاء مطابقون</p>
            <NmButton variant="primary" onClick={() => setShowAdd(true)}>
              إضافة أول عميل
            </NmButton>
          </div>
        ) : (
          <table className="nm-table text-right">
            <thead>
              <tr className="text-xs font-bold text-[#718096]">
                <th className="py-3 px-4">الرقم</th>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">المسؤول</th>
                <th className="py-3 px-4">تاريخ التسجيل</th>
                <th className="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="nm-clickable cursor-pointer text-sm text-[#2d3748]"
                >
                  <td className="py-3 px-4 font-bold text-[#4a90d9] tabular-nums">{c.serial_number}</td>
                  <td className="py-3 px-4 font-bold">{c.name}</td>
                  <td className="py-3 px-4 text-[#718096]">{c.client_type}</td>
                  <td className="py-3 px-4 tabular-nums" dir="ltr">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#718096]" />
                      {c.phone || '—'}
                      {c.whatsapp && (
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#27ae60] hover:opacity-80"
                          title="تواصل عبر واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#718096]">{c.responsible_user}</td>
                  <td className="py-3 px-4 text-xs text-[#718096]">{toArabicDate(c.registration_date)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </NmCard>

      {/* Add Client Modal */}
      <NmModal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة عميل جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">اسم العميل *</label>
              <NmVoiceInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="الاسم الكامل أو اسم الشركة" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">نوع العميل</label>
              <select
                value={form.client_type}
                onChange={(e) => setForm({ ...form, client_type: e.target.value as any })}
                className="nm-input"
              >
                <option value="شركة">شركة</option>
                <option value="فرد">فرد</option>
                <option value="مؤسسة">مؤسسة</option>
                <option value="جهة حكومية">جهة حكومية</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">رقم الهاتف</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+966 50..."
                className="nm-input"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">رقم واتساب</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="96650..."
                className="nm-input"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@company.com"
                className="nm-input"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">الهوية / السجل التجاري</label>
              <input
                type="text"
                value={form.id_or_commercial_reg}
                onChange={(e) => setForm({ ...form, id_or_commercial_reg: e.target.value })}
                className="nm-input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#718096]">العنوان</label>
            <NmVoiceInput value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="المدينة، الحي، الشارع" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#718096]">ملاحظات</label>
            <NmVoiceInput multiline rows={3} value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="تفاصيل إضافية..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <NmButton type="button" onClick={() => setShowAdd(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ العميل</NmButton>
          </div>
        </form>
      </NmModal>

      {/* Client Intake Form Modal (Confidential + Printable) */}
      <NmModal open={showIntake} onClose={() => setShowIntake(false)} title="نموذج استقبال عميل جديد — سري للغاية" maxWidth="max-w-3xl">
        <div className="space-y-4">
          <div className="nm-inset p-3 text-center">
            <p className="text-xs font-extrabold text-[#e74c3c]">
              سري للغاية — محمي بسرية التوكيل / STRICTLY CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGE
            </p>
          </div>
          <form onSubmit={handleSubmitIntake} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#718096]">الاسم القانوني للعميل *</label>
                <NmVoiceInput value={intake.name} onChange={(v) => setIntake({ ...intake, name: v })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#718096]">الرقم القومي / الهوية / السجل</label>
                <input type="text" value={intake.id_number} onChange={(e) => setIntake({ ...intake, id_number: e.target.value })} className="nm-input" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#718096]">رقم الهاتف</label>
                <input type="text" value={intake.phone} onChange={(e) => setIntake({ ...intake, phone: e.target.value })} className="nm-input" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#718096]">البريد الإلكتروني</label>
                <input type="email" value={intake.email} onChange={(e) => setIntake({ ...intake, email: e.target.value })} className="nm-input" dir="ltr" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">عنوان النزاع / الموضوع *</label>
              <NmVoiceInput value={intake.matter_title} onChange={(v) => setIntake({ ...intake, matter_title: v })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096]">وصف الوقائع والنتيجة المطلوبة</label>
              <NmVoiceInput multiline rows={3} value={intake.matter_description} onChange={(v) => setIntake({ ...intake, matter_description: v })} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 no-print">
              <NmButton type="button" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                طباعة النموذج
              </NmButton>
              <div className="flex gap-2">
                <NmButton type="button" onClick={() => setShowIntake(false)}>إلغاء</NmButton>
                <NmButton type="submit" variant="primary">اعتماد وإنشاء عميل وقضية</NmButton>
              </div>
            </div>
          </form>
        </div>
      </NmModal>
    </div>
  );
}
