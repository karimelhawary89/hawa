import React, { useEffect, useState } from 'react';
import { Award, Briefcase, Clock, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Matter, TimeEntry } from '../types/erp';
import { listEntities } from '../lib/api';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { formatSAR } from '../utils/currencyUtils';

export default function LawyerProfile() {
  const { user } = useAuth();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cpdHours, setCpdHours] = useState(28);

  useEffect(() => {
    listEntities<Matter>('matters').then(setMatters).catch(() => {});
    listEntities<TimeEntry>('time_entries').then(setTimeEntries).catch(() => {});
  }, []);

  const myMatters = matters.filter((m) => m.lead_lawyer === user?.name);
  const totalBillableHours = timeEntries.reduce((s, t) => s + (t.hours || 0), 0);
  const winRate = 89;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <NmCard className="p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 nm-raised rounded-2xl flex items-center justify-center text-2xl font-bold text-[#4a90d9]">
            {user?.name?.charAt(0) || 'ك'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#2d3748]">{user?.name}</h1>
              <StatusBadge status={user?.role || 'شريك'} />
            </div>
            <p className="text-sm text-[#718096]">
              {user?.title} · {user?.specialization} · ترخيص رقم{' '}
              <span className="font-mono text-[#4a90d9]">{user?.license_number}</span>
            </p>
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs text-[#718096]">معدل الساعة المعتمد</div>
          <div className="text-xl font-bold text-[#27ae60] tabular-nums">
            {formatSAR(user?.hourly_rate || 850)}
          </div>
        </div>
      </NmCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NmCard className="p-5 space-y-1">
          <div className="text-xs text-[#718096] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#c9a84c]" />
            نسبة نجاح القضايا
          </div>
          <div className="text-3xl font-bold text-[#27ae60] tabular-nums">{winRate}%</div>
        </NmCard>
        <NmCard className="p-5 space-y-1">
          <div className="text-xs text-[#718096] flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-[#4a90d9]" />
            القضايا تحت الإشراف المباشر
          </div>
          <div className="text-3xl font-bold text-[#2d3748] tabular-nums">{myMatters.length}</div>
        </NmCard>
        <NmCard className="p-5 space-y-1">
          <div className="text-xs text-[#718096] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#4a90d9]" />
            الساعات المسجلة
          </div>
          <div className="text-3xl font-bold text-[#2d3748] tabular-nums">{totalBillableHours} س</div>
        </NmCard>
      </div>

      {/* CPD Hours Tracker */}
      <NmCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#2d3748]">سجل التطوير المهني المستمر (CPD)</h2>
            <p className="text-xs text-[#718096]">الهدف السنوي المطلوب للتجديد النقابي: 36 ساعة تدريبية معتمدة</p>
          </div>
          <NmButton variant="primary" onClick={() => setCpdHours((h) => h + 2)}>
            <Plus className="w-4 h-4" />
            تسجيل ساعتين تدريب
          </NmButton>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#718096]">المُنجز: {cpdHours} / 36 ساعة</span>
            <span className="text-[#27ae60] tabular-nums">{Math.min(100, Math.round((cpdHours / 36) * 100))}%</span>
          </div>
          <div className="nm-inset h-3 p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4a90d9] transition-all"
              style={{ width: `${Math.min(100, Math.round((cpdHours / 36) * 100))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-sm">
          {[
            'ندوة نظام المعاملات المدنية السعودي الجديد — 8 ساعات',
            'ورشة صياغة شروط التحكيم التجاري الدولي (SCCA) — 10 ساعات',
            'حوكمة الشركات والامتثال الضريبي والزكوي — 10 ساعات',
          ].map((cert) => (
            <div key={cert} className="nm-inset p-3 flex items-center gap-2 text-xs text-[#2d3748]">
              <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
              <span>{cert}</span>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}
