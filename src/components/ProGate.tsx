import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePlan } from '../context/AuthContext';
import { NmCard, NmButton } from './ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

export default function ProGate({ children }: { children: React.ReactNode }) {
  const { isPro, switchPlan } = usePlan();
  const toast = useToast();

  if (isPro) return <>{children}</>;

  const handleActivatePro = async () => {
    await switchPlan('pro');
    toast.success('تم تفعيل باقة PRO بنجاح');
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <NmCard className="text-center space-y-6 p-8">
        <div className="w-16 h-16 mx-auto nm-raised rounded-full flex items-center justify-center text-[#c9a84c]">
          <Crown className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#2d3748]">ميزة متقدمة ضمن باقة PRO</h2>
          <p className="text-sm text-[#718096]">
            هذا القسم يشمل محركات الذكاء القانوني، قاعدة المعرفة الدلالية، والتكاملات المؤسسية.
          </p>
        </div>

        <div className="nm-inset p-4 text-right space-y-2.5 text-sm text-[#2d3748]">
          {[
            'قاعدة المعرفة الذكية (RAG) والبحث الدلالي في السوابق',
            'معرض الويدجت القانونية الـ 15 المتخصصة',
            'المساعد التنفيذي والتدقيق الشامل للعقود',
            'مزامنة Notion و Coda وبوابة واتساب والمدفوعات',
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <NmButton variant="gold" onClick={handleActivatePro}>
            <Sparkles className="w-4 h-4" />
            تفعيل باقة PRO الآن
          </NmButton>
          <Link to="/subscription">
            <NmButton variant="primary">مقارنة الباقات والأسعار</NmButton>
          </Link>
        </div>
      </NmCard>
    </div>
  );
}
