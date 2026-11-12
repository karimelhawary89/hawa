import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Settings, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { NmCard, NmButton } from '../components/ui/NeumorphicPrimitives';

export default function WhatsAppInbox() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#27ae60]" />
            صندوق رسائل واتساب الرسمي (WhatsApp Business API)
          </h1>
          <p className="text-sm text-[#718096]">
            استقبال استفسارات الموكلين وتحديثات الجلسات التلقائية عبر واجهة Meta السحابية
          </p>
        </div>
        <Link to="/settings#whatsapp">
          <NmButton variant="primary">
            <Settings className="w-4 h-4" />
            الانتقال إلى إعدادات الربط
          </NmButton>
        </Link>
      </div>

      {/* BUG-07: Complete 3-step Arabic connection guide + Meta Business Manager note */}
      <NmCard className="p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 nm-raised rounded-2xl flex items-center justify-center text-[#27ae60]">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2d3748]">دليل ربط حساب واتساب للأعمال في 3 خطوات</h2>
            <p className="text-sm text-[#718096]">
              فعّل المراسلة القانونية الفورية وأرشفة المحادثات تلقائياً داخل ملفات القضايا والعملاء
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="nm-inset p-5 space-y-2">
            <span className="nm-badge text-[#4a90d9] tabular-nums">الخطوة 1</span>
            <h3 className="font-bold text-[#2d3748]">إنشاء تطبيق Meta السحابي</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              سجّل الدخول إلى بوابة Meta for Developers وأنشئ تطبيق أعمال وأضف منتج WhatsApp Cloud API للحصول على معرف رقم الهاتف (Phone Number ID).
            </p>
          </div>
          <div className="nm-inset p-5 space-y-2">
            <span className="nm-badge text-[#4a90d9] tabular-nums">الخطوة 2</span>
            <h3 className="font-bold text-[#2d3748]">تفعيل رمز الوصول والويب هوك</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              أنشئ رمز وصول دائم (System User Token) من إعدادات الحساب، ثم اربط عنوان Webhook الخاص بمكتبك لاستقبال الرسائل الواردة لحظياً.
            </p>
          </div>
          <div className="nm-inset p-5 space-y-2">
            <span className="nm-badge text-[#27ae60] tabular-nums">الخطوة 3</span>
            <h3 className="font-bold text-[#2d3748]">حفظ الإعدادات واختبار الإرسال</h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              افتح صفحة الإعدادات وأدخل بيانات الربط لحفظها وتفعيل الإرسال التلقائي لتنبيهات الجلسات والفواتير للموكلين.
            </p>
          </div>
        </div>

        <div className="nm-inset p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#4a90d9] shrink-0 mt-0.5" />
          <div className="text-sm text-[#2d3748] space-y-1">
            <div className="font-bold">ملاحظة بخصوص حساب مدير الأعمال (Meta Business Manager)</div>
            <p className="text-xs text-[#718096] leading-relaxed">
              يتطلب الربط المباشر توثيق النشاط التجاري لمكتب المحاماة داخل حساب Meta Business Manager واعتماد قوالب الرسائل العربية الموجهة للموكلين (تذكير بالجلسات، إشعارات الفواتير، واستقبال الاستفسارات).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#27ae60] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>متوافق مع تشفير الرسائل وأرشفة المراسلات القانونية</span>
          </div>
          <Link to="/settings#whatsapp">
            <NmButton variant="primary">
              <CheckCircle2 className="w-4 h-4" />
              إعداد ربط واتساب الآن
            </NmButton>
          </Link>
        </div>
      </NmCard>
    </div>
  );
}
