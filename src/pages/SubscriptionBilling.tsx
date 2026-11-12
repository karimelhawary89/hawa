import React from 'react';
import { Crown, CheckCircle2, Sparkles, MessageCircle } from 'lucide-react';
import { usePlan } from '../context/AuthContext';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { formatSAR } from '../utils/currencyUtils';
import { useToast } from '../context/ToastContext';

export default function SubscriptionBilling() {
  const { isPro, plan, switchPlan } = usePlan();
  const toast = useToast();

  const handleSwitch = async (next: 'free' | 'pro') => {
    try {
      await switchPlan(next);
      toast.success(next === 'pro' ? 'تمت الترقية إلى باقة براءة PRO بنجاح' : 'تم التحويل إلى الباقة المجانية');
    } catch {
      toast.error('تعذّر تغيير الباقة');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Crown className="w-6 h-6 text-[#c9a84c]" />
            إدارة باقة الاشتراك (Baraa Plans)
          </h1>
          <p className="text-sm text-[#718096]">
            باقتك الحالية: <StatusBadge status={isPro ? 'PRO' : 'مجانية'} />
          </p>
        </div>
        <a
          href="https://wa.me/966500000000"
          target="_blank"
          rel="noopener noreferrer"
          className="nm-btn px-4 py-2 text-sm text-[#27ae60] inline-flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          التواصل مع المبيعات عبر واتساب
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <NmCard className="p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2d3748]">الباقة الأساسية (Free)</h2>
              {plan === 'free' && <StatusBadge status="نشط" />}
            </div>
            <div className="text-3xl font-bold text-[#4a90d9] tabular-nums">
              {formatSAR(0)} <span className="text-xs text-[#718096] font-normal">/ شهرياً</span>
            </div>
            <div className="nm-inset p-4 space-y-2.5 text-sm text-[#2d3748]">
              {[
                'إدارة العملاء والقضايا والمستندات الأساسية',
                'جدول الجلسات والتقويم القضائي بالعد التنازلي',
                'نظام المهام (كانبان + قائمة)',
                'إصدار فواتير SAR بضريبة 15% وسجل المدفوعات',
                'دليل الـ 42 موقعاً قانونياً رسمياً',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <NmButton
            disabled={plan === 'free'}
            onClick={() => handleSwitch('free')}
          >
            {plan === 'free' ? 'الباقة الحالية' : 'التحويل إلى المجانية'}
          </NmButton>
        </NmCard>

        {/* PRO Plan */}
        <NmCard className="p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2d3748] flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#c9a84c]" />
                باقة المكاتب الاحترافية (PRO)
              </h2>
              {isPro && <StatusBadge status="PRO" />}
            </div>
            <div className="text-3xl font-bold text-[#9a7619] tabular-nums">
              {formatSAR(950)} <span className="text-xs text-[#718096] font-normal">/ شهرياً للمكتب</span>
            </div>
            <div className="nm-inset p-4 space-y-2.5 text-sm text-[#2d3748]">
              {[
                'جميع مزايا الباقة الأساسية بدون قيود',
                'تحليل SWOT الاستراتيجي ومحاكاة المحكمة (Moot Court)',
                '15 أداة ذكاء قانوني متخصصة (نقض، عقود، جنائي، عقاري)',
                'قاعدة المعرفة الدلالية (RAG) وإعدادات البحث المتقدم',
                'المراجعة الخماسية للعقود والصياغة ثنائية اللغة',
                'التكاملات المؤسسية (Notion / Coda / WhatsApp Cloud)',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c9a84c] shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <NmButton
            variant="gold"
            disabled={isPro}
            onClick={() => handleSwitch('pro')}
          >
            <Sparkles className="w-4 h-4" />
            {isPro ? 'أنت مشترك في باقة PRO' : 'ترقية إلى PRO الآن (تفعيل فوري)'}
          </NmButton>
        </NmCard>
      </div>
    </div>
  );
}
