import React, { useEffect, useState } from 'react';
import { ShieldAlert, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ConflictCheck, Client, Matter } from '../types/erp';
import { listEntities, createEntity } from '../lib/api';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { toArabicDateTime } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ConflictChecks() {
  const toast = useToast();
  const { user } = useAuth();
  const [checks, setChecks] = useState<ConflictCheck[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [partyQuery, setPartyQuery] = useState('');
  const [liveMatches, setLiveMatches] = useState<string[] | null>(null);

  useEffect(() => {
    Promise.all([
      listEntities<ConflictCheck>('conflict_checks'),
      listEntities<Client>('clients'),
      listEntities<Matter>('matters'),
    ])
      .then(([cc, c, m]) => {
        setChecks(cc);
        setClients(c);
        setMatters(m);
      })
      .catch(() => toast.error('تعذّر تحميل سجل فحوصات التعارض'));
  }, []);

  const runCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = partyQuery.trim();
    if (!q) {
      toast.error('أدخل اسم الطرف أو السجل التجاري لإجراء الفحص');
      return;
    }

    const terms = q
      .split(/[،,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const matchedMatters: string[] = [];
    const matchedDetails: string[] = [];

    clients.forEach((c) => {
      if (terms.some((t) => c.name.toLowerCase().includes(t) || c.id_or_commercial_reg.toLowerCase().includes(t))) {
        matchedDetails.push(`عميل مسجل: ${c.name} (${c.serial_number})`);
      }
    });

    matters.forEach((m) => {
      if (
        terms.some(
          (t) =>
            m.title.toLowerCase().includes(t) ||
            (m.opposing_counsel || '').toLowerCase().includes(t) ||
            (m.notes || '').toLowerCase().includes(t)
        )
      ) {
        matchedMatters.push(m.case_number);
        matchedDetails.push(`ملف قضية: ${m.case_number} — ${m.title}`);
      }
    });

    const resultStatus: ConflictCheck['check_result'] =
      matchedDetails.length === 0
        ? 'لا يوجد تعارض'
        : matchedMatters.length > 0
        ? 'تعارض محتمل'
        : 'تعارض محتمل';

    try {
      const saved = await createEntity<ConflictCheck>('conflict_checks', {
        check_date: new Date().toISOString(),
        parties_checked: q,
        check_result: resultStatus,
        conflict_details:
          matchedDetails.length > 0
            ? matchedDetails.join(' | ')
            : 'تم فحص سجلات العملاء والقضايا والأطراف المقابلة دون العثور على أي تطابق.',
        matters_flagged: matchedMatters,
        checked_by: user?.name || 'أ. كريم الهواري',
        action_taken: matchedDetails.length === 0 ? 'موافقة على قبول الوكالة' : 'إحالة لمراجعة الشريك المدير',
      });
      setChecks((prev) => [saved, ...prev]);
      setLiveMatches(matchedDetails);
      toast.success(`اكتمل الفحص: ${resultStatus}`);
    } catch {
      toast.error('تعذّر حفظ نتيجة الفحص');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#e67e22]" />
          فحص تعارض المصالح (Conflict Check)
        </h1>
        <p className="text-sm text-[#718096]">
          البحث الفوري عبر قاعدة العملاء والقضايا والخصوم قبل قبول التوكيلات الجديدة
        </p>
      </div>

      <NmCard className="p-6 space-y-4">
        <form onSubmit={runCheck} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={partyQuery}
              onChange={(e) => setPartyQuery(e.target.value)}
              placeholder="أدخل أسماء الأطراف مفصولة بفاصلة (مثال: شركة المدار، شركة البناء المتطور)..."
              className="nm-input pr-10"
            />
          </div>
          <NmButton type="submit" variant="primary">
            بدء فحص التعارض الآن
          </NmButton>
        </form>

        {liveMatches !== null && (
          <div className="nm-inset p-4 space-y-2">
            {liveMatches.length === 0 ? (
              <div className="flex items-center gap-2 text-[#27ae60] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                لا يوجد أي تعارض مصالح مسجل في قاعدة بيانات المكتب.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#e67e22] font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  تم العثور على ارتباطات محتملة تتطلب مراجعة الشريك:
                </div>
                {liveMatches.map((m, idx) => (
                  <div key={idx} className="text-xs text-[#2d3748] pr-6">• {m}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </NmCard>

      <NmCard className="p-0 overflow-x-auto">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>الأطراف المفحوصة</th>
              <th>النتيجة</th>
              <th>التفاصيل</th>
              <th>الإجراء</th>
              <th>المسؤول</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#718096]">لا توجد فحوصات سابقة</td>
              </tr>
            ) : (
              checks.map((cc) => (
                <tr key={cc.id}>
                  <td className="font-bold text-[#2d3748]">{cc.parties_checked}</td>
                  <td><StatusBadge status={cc.check_result} /></td>
                  <td className="text-xs text-[#718096] max-w-xs">{cc.conflict_details}</td>
                  <td className="text-xs text-[#4a90d9]">{cc.action_taken || '—'}</td>
                  <td className="text-xs text-[#2d3748]">{cc.checked_by}</td>
                  <td className="text-xs text-[#718096]">{toArabicDateTime(cc.check_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </NmCard>
    </div>
  );
}
