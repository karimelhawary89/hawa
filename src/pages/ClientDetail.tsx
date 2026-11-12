import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Scale, Receipt, ShieldCheck, MessageCircle, Building2 } from 'lucide-react';
import { getEntity, listEntities, updateEntity } from '../lib/api';
import { Client, Matter, Invoice } from '../types/erp';
import { toArabicDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { NmCard, NmButton, StatusBadge, NmCopyButton } from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getEntity<Client>('clients', id),
      listEntities<Matter>('matters'),
      listEntities<Invoice>('invoices'),
    ])
      .then(([cl, mt, inv]) => {
        setClient(cl);
        setMatters(mt.filter((m) => m.client_id === id));
        setInvoices(inv.filter((i) => i.client_id === id));
      })
      .catch(() => toast.error('تعذّر تحميل بيانات العميل'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFlag = async (field: 'kyc_completed' | 'engagement_letter_signed') => {
    if (!client) return;
    const updated = await updateEntity<Client>('clients', client.id, {
      [field]: !client[field],
    });
    setClient(updated);
    toast.success('تم تحديث حالة التحقق');
  };

  if (loading) {
    return <NmCard className="p-10 text-center text-sm text-[#718096]">جاري تحميل ملف العميل...</NmCard>;
  }

  if (!client) {
    return (
      <NmCard className="p-10 text-center space-y-4">
        <p className="text-base font-bold text-[#2d3748]">العميل غير موجود</p>
        <NmButton onClick={() => navigate('/clients')}>العودة للعملاء</NmButton>
      </NmCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <NmButton onClick={() => navigate('/clients')}>
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة العملاء
        </NmButton>
        {client.whatsapp && (
          <a
            href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              `مرحباً ${client.name}، تحية طيبة من مكتب براءة للمحاماة`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NmButton variant="success">
              <MessageCircle className="w-4 h-4" />
              مراسلة واتساب مباشرة
            </NmButton>
          </a>
        )}
      </div>

      <NmCard className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="nm-inset w-14 h-14 rounded-2xl flex items-center justify-center text-[#4a90d9]">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#4a90d9] tabular-nums">{client.serial_number}</span>
                <StatusBadge status={client.status} />
              </div>
              <h1 className="text-2xl font-extrabold text-[#2d3748] mt-1">{client.name}</h1>
              <p className="text-xs text-[#718096]">
                {client.client_type} · {client.nationality} · مسجل منذ {toArabicDate(client.registration_date)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <NmButton
              active={Boolean(client.kyc_completed)}
              variant={client.kyc_completed ? 'success' : 'default'}
              onClick={() => toggleFlag('kyc_completed')}
            >
              <ShieldCheck className="w-4 h-4" />
              {client.kyc_completed ? 'KYC مكتمل' : 'تأكيد KYC'}
            </NmButton>
            <NmButton
              active={Boolean(client.engagement_letter_signed)}
              variant={client.engagement_letter_signed ? 'success' : 'default'}
              onClick={() => toggleFlag('engagement_letter_signed')}
            >
              {client.engagement_letter_signed ? 'خطاب التكليف موقّع' : 'توقيع خطاب التكليف'}
            </NmButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="nm-inset p-3.5 space-y-1">
            <p className="text-xs text-[#718096]">الهاتف</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold tabular-nums" dir="ltr">{client.phone || '—'}</span>
              {client.phone && <NmCopyButton text={client.phone} />}
            </div>
          </div>
          <div className="nm-inset p-3.5 space-y-1">
            <p className="text-xs text-[#718096]">البريد الإلكتروني</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold truncate" dir="ltr">{client.email || '—'}</span>
              {client.email && <NmCopyButton text={client.email} />}
            </div>
          </div>
          <div className="nm-inset p-3.5 space-y-1">
            <p className="text-xs text-[#718096]">الهوية / السجل التجاري</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold tabular-nums">{client.id_or_commercial_reg || '—'}</span>
              {client.id_or_commercial_reg && <NmCopyButton text={client.id_or_commercial_reg} />}
            </div>
          </div>
        </div>

        {client.notes && (
          <div className="nm-inset p-4 text-sm text-[#2d3748]">
            <p className="text-xs font-bold text-[#718096] mb-1">ملاحظات الملف</p>
            {client.notes}
          </div>
        )}
      </NmCard>

      {/* Linked Matters & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NmCard className="space-y-4">
          <h2 className="text-base font-bold text-[#2d3748] flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#4a90d9]" />
            القضايا المرتبطة ({matters.length})
          </h2>
          {matters.length === 0 ? (
            <p className="text-xs text-[#718096] py-4 text-center">لا توجد قضايا مسجلة لهذا العميل</p>
          ) : (
            <div className="space-y-2.5">
              {matters.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/matters/${m.id}`)}
                  className="nm-inset p-3 cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#4a90d9] tabular-nums">{m.case_number} · {m.stage}</p>
                    <p className="text-sm font-semibold text-[#2d3748] truncate">{m.title}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </NmCard>

        <NmCard className="space-y-4">
          <h2 className="text-base font-bold text-[#2d3748] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#c9a84c]" />
            الفواتير المرتبطة ({invoices.length})
          </h2>
          {invoices.length === 0 ? (
            <p className="text-xs text-[#718096] py-4 text-center">لا توجد فواتير مسجلة لهذا العميل</p>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="nm-inset p-3 cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#4a90d9] tabular-nums">{inv.invoice_number}</p>
                    <p className="text-sm font-bold text-[#2d3748] tabular-nums">
                      الإجمالي: {formatCurrency(inv.total_amount, inv.currency)} · متبقي:{' '}
                      {formatCurrency(inv.balance_due, inv.currency)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </NmCard>
      </div>
    </div>
  );
}
