import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Mic,
  MessageCircle,
  Sparkles,
  Shield,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuditLogEntry } from '../types/erp';
import { listEntities } from '../lib/api';
import { NmCard, NmButton, NmVoiceInput, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { toArabicDateTime } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, updateUserProfile } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currency, setCurrency] = useState(user?.default_currency || 'SAR');
  const [hourlyRate, setHourlyRate] = useState(String(user?.hourly_rate || 850));

  // Voice settings & test
  const [voiceDialect, setVoiceDialect] = useState('ar-EG');
  const [voiceTestText, setVoiceTestText] = useState('');

  // WhatsApp Cloud API settings (non-secret Meta IDs/webhook config stored locally)
  const [waPhoneId, setWaPhoneId] = useState(() => localStorage.getItem('baraa_wa_phone_id') || '');
  const [waBizId, setWaBizId] = useState(() => localStorage.getItem('baraa_wa_biz_id') || '');
  const [waEnabled, setWaEnabled] = useState(() => localStorage.getItem('baraa_wa_enabled') === 'true');

  // AI Persona Custom Instructions (NO API key fields!)
  const [aiPersona, setAiPersona] = useState(
    () => localStorage.getItem('baraa_ai_persona') || 'استشاري قانوني دقيق يركز على النظام السعودي والقانون المدني المصري'
  );

  // Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    listEntities<AuditLogEntry>('audit_log')
      .then((logs) => setAuditLogs(logs.slice(0, 25)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location.hash === '#whatsapp') {
      document.getElementById('whatsapp')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        name,
        title,
        phone,
        default_currency: currency as any,
        hourly_rate: Number(hourlyRate) || 850,
      });
      toast.success('تم حفظ بيانات الحساب والمكتب');
    } catch {
      toast.error('تعذّر حفظ التغييرات');
    }
  };

  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('baraa_wa_phone_id', waPhoneId);
    localStorage.setItem('baraa_wa_biz_id', waBizId);
    localStorage.setItem('baraa_wa_enabled', String(waEnabled));
    toast.success('تم حفظ إعدادات ربط واتساب للأعمال');
  };

  const handleSavePersona = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('baraa_ai_persona', aiPersona);
    toast.success('تم تحديث شخصية وتعليمات المساعد براءة');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#4a90d9]" />
            الإعدادات والتكوين والأمان
          </h1>
          <p className="text-sm text-[#718096]">
            ضبط الملف الشخصي، الإدخال الصوتي، تكامل واتساب للأعمال، وتعليمات المساعد براءة
          </p>
        </div>
        <a href="/api/backup" download="baraa-legal-erp-backup.json">
          <NmButton variant="primary">
            <Download className="w-4 h-4" />
            نسخة احتياطية كاملة (JSON)
          </NmButton>
        </a>
      </div>

      {/* Profile & Currency */}
      <NmCard className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
            <User className="w-5 h-5 text-[#4a90d9]" />
            بيانات المحامي والعملة الافتراضية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الاسم الكامل</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="nm-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">المسمى الوظيفي</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="nm-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">رقم الهاتف</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="nm-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العملة الافتراضية</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="nm-input">
                <option value="SAR">SAR — ريال سعودي</option>
                <option value="EGP">EGP — جنيه مصري</option>
                <option value="AED">AED — درهم إماراتي</option>
                <option value="KWD">KWD — دينار كويتي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">أجر الساعة الافتراضي</label>
              <input
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value.replace(/[^0-9.]/g, ''))}
                className="nm-input tabular-nums"
              />
            </div>
          </div>
          <NmButton type="submit" variant="primary">حفظ بيانات الملف</NmButton>
        </form>
      </NmCard>

      {/* Voice Settings & Mic Test */}
      <NmCard className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
          <Mic className="w-5 h-5 text-[#4a90d9]" />
          إعدادات الإملاء الصوتي بالعربية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">لهجة التعرف الصوتي المفضلة</label>
            <select
              value={voiceDialect}
              onChange={(e) => setVoiceDialect(e.target.value)}
              className="nm-input"
            >
              <option value="ar-EG">العربية (مصر والخليج — ar-EG)</option>
              <option value="ar-SA">العربية (المملكة العربية السعودية — ar-SA)</option>
              <option value="ar-AE">العربية (الإمارات — ar-AE)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">اختبار الميكروفون والإملاء (اختصار Alt+V)</label>
            <NmVoiceInput
              value={voiceTestText}
              onChange={setVoiceTestText}
              placeholder="اضغط أيقونة الميكروفون وتحدث لتجربة الإملاء..."
            />
          </div>
        </div>
      </NmCard>

      {/* WhatsApp Integration Section */}
      <NmCard id="whatsapp" className="p-6">
        <form onSubmit={handleSaveWhatsApp} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#27ae60]" />
              ربط واتساب للأعمال (WhatsApp Cloud API)
            </h2>
            <StatusBadge status={waEnabled ? 'متصل' : 'غير متصل'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">معرف رقم الهاتف (Phone Number ID)</label>
              <input
                type="text"
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                placeholder="109283746501928"
                className="nm-input font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">معرف حساب الأعمال (WABA ID)</label>
              <input
                type="text"
                value={waBizId}
                onChange={(e) => setWaBizId(e.target.value)}
                placeholder="384756192038475"
                className="nm-input font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer">
            <input
              type="checkbox"
              checked={waEnabled}
              onChange={(e) => setWaEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#27ae60]"
            />
            تفعيل استقبال الإشعارات وتنبيهات الجلسات التلقائية عبر واتساب
          </label>
          <NmButton type="submit" variant="success">
            <CheckCircle2 className="w-4 h-4" />
            حفظ إعدادات واتساب
          </NmButton>
        </form>
      </NmCard>

      {/* AI Persona (No API Key inputs!) */}
      <NmCard className="p-6">
        <form onSubmit={handleSavePersona} className="space-y-4">
          <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c9a84c]" />
            تعليمات وشخصية المساعد الذكي &ldquo;براءة&rdquo;
          </h2>
          <p className="text-xs text-[#718096]">
            خصّص نبرة الصياغة والتوجيهات التشريعية التي يلتزم بها محرك براءة على الخادم الآمن.
          </p>
          <textarea
            rows={3}
            value={aiPersona}
            onChange={(e) => setAiPersona(e.target.value)}
            className="nm-input"
          />
          <NmButton type="submit" variant="gold">حفظ تعليمات براءة</NmButton>
        </form>
      </NmCard>

      {/* Audit Log */}
      <NmCard className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#4a90d9]" />
          سجل التدقيق الأمني والعمليات (Audit Log)
        </h2>
        <div className="overflow-x-auto">
          <table className="nm-table w-full text-right">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الإجراء</th>
                <th>الكيان</th>
                <th>التفاصيل</th>
                <th>التوقيت</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-[#718096]">لا توجد عمليات مسجلة بعد</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-bold text-xs text-[#2d3748]">{log.user_name}</td>
                    <td><StatusBadge status={log.action} /></td>
                    <td className="text-xs text-[#4a90d9]">{log.entity_type}</td>
                    <td className="text-xs text-[#718096]">{log.details || log.entity_id}</td>
                    <td className="text-xs text-[#718096]">{toArabicDateTime(log.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NmCard>
    </div>
  );
}
