/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  Brain,
  FileCheck2,
  CreditCard,
  Database,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Mail,
  BookOpen,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NmButton, NmCard } from '../components/ui/NeumorphicPrimitives';

const FEATURES = [
  {
    icon: Scale,
    title: 'إدارة القضايا والتقاضي الرقمي',
    desc: 'خارطة إجراءات لكل نوع دعوى، متابعة مواعيد التقادم، وإدارة الجلسات والخبراء والشهود.',
    accent: 'text-[#4a90d9]',
  },
  {
    icon: Brain,
    title: 'محرك الذكاء القانوني براءة',
    desc: 'تحليل استراتيجي للقضايا، محاكاة الجلسات القضائية، و15 أداة متخصصة للقانون المصري والسعودي.',
    accent: 'text-[#c9a84c]',
  },
  {
    icon: FileCheck2,
    title: 'مراجعة وصياغة العقود ثنائية اللغة',
    desc: 'تدقيق 5 مراحل للعقود مع الامتثال الشرعي، مقارنة التعديلات، ومكتبة بنود قانونية متكاملة.',
    accent: 'text-[#27ae60]',
  },
  {
    icon: ShieldCheck,
    title: 'الامتثال التنظيمي والحوكمة',
    desc: 'قوائم فحص امتثال تشمل العمل والضرائب والشركات وحماية البيانات، مع مولّد التقارير الرسمية.',
    accent: 'text-[#e67e22]',
  },
  {
    icon: CreditCard,
    title: 'الفوترة الذكية بالريال السعودي',
    desc: 'تتبع ساعات العمل، فواتير بضريبة قيمة مضافة 15%، تحصيل المدفوعات وتقارير الأرباح.',
    accent: 'text-[#4a90d9]',
  },
  {
    icon: Database,
    title: 'قاعدة المعرفة الدلالية RAG',
    desc: 'أرشفة السوابق والمذكرات مع توثيق SHA-256 وبحث دلالي ذكي عبر ملفات المكتب.',
    accent: 'text-[#c9a84c]',
  },
];

const FREE_PLAN_ITEMS = [
  'إدارة حتى 15 قضية نشطة و 30 عميلاً',
  'التقويم القضائي والتنبيه التلقائي للجلسات',
  'الفواتير بالريال السعودي وضريبة 15%',
  'دليل المواقع القانونية العربية والدولية (42 موقعاً)',
  'المدونة القانونية والمكتبة الأساسية',
];

const PRO_PLAN_ITEMS = [
  'قضايا وعملاء ومستندات غير محدودة',
  'المساعد التنفيذي براءة + 15 أداة ذكاء قانوني',
  'محرك مراجعة وصياغة العقود ثنائية اللغة',
  'محاكي الجلسات القضائية والتحليل الاستراتيجي SWOT',
  'قاعدة المعرفة الدلالية RAG والتكامل مع واتساب',
  'لوحة التحليلات التنفيذية وتقارير الأداء الكاملة',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loginDemo } = useAuth();

  const handleEnterApp = async () => {
    if (!user) {
      await loginDemo();
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-[#2d3748] flex flex-col">
      {/* Top Bar (3 clean zones) */}
      <header className="px-6 py-4 max-w-[1280px] w-full mx-auto flex items-center justify-between gap-8">
        <Link to="/landing" className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <img
            src="/assets/logo-animated.gif"
            alt="نظام براءة القانوني"
            className="w-10 h-10 object-contain rounded-full"
          />
          <span className="text-lg font-extrabold text-[#2d3748]">نظام براءة القانوني</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#718096]">
          <a href="#features" className="hover:text-[#4a90d9] whitespace-nowrap shrink-0">
            المميزات
          </a>
          <a href="#pricing" className="hover:text-[#4a90d9] whitespace-nowrap shrink-0">
            الباقات
          </a>
          <Link to="/blog" className="hover:text-[#4a90d9] whitespace-nowrap shrink-0">
            المدونة القانونية
          </Link>
          <Link to="/signup" className="hover:text-[#4a90d9] whitespace-nowrap shrink-0">
            تسجيل الدخول
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <NmButton variant="primary" onClick={handleEnterApp}>
            {user ? 'دخول لوحة التحكم' : 'ابدأ مجاناً'}
          </NmButton>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-14 lg:py-20">
        <div className="max-w-[660px] mx-auto nm-card p-8 lg:p-10 text-center space-y-6">
          {/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */}
          <div className="w-[120px] h-[120px] mx-auto nm-raised rounded-full flex items-center justify-center p-2">
            <img
              src="/assets/logo-animated.gif"
              alt="شعار نظام براءة القانوني"
              className="w-[120px] h-[120px] object-contain"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-[#c9a84c] font-jakarta tracking-wide">
              Baraa Legal ERP · نظام براءة القانوني
            </p>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[#2d3748] leading-snug">
              الذكاء القانوني في خدمة مكتبك
            </h1>
            <p className="text-sm lg:text-base text-[#718096] leading-relaxed max-w-xl mx-auto">
              منصة عربية متكاملة لإدارة مكاتب المحاماة والاستشارات القانونية في مصر والسعودية والخليج — قضايا، عقود، امتثال، فوترة بالريال السعودي، ومساعد قانوني ذكي.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <NmButton variant="gold" onClick={handleEnterApp} className="px-6 py-3 text-base">
              <Sparkles className="w-4 h-4" />
              دخول فوري للنظام
              <ArrowLeft className="w-4 h-4" />
            </NmButton>
            <Link to="/signup">
              <NmButton variant="primary" className="px-6 py-3 text-base">
                إنشاء حساب جديد
              </NmButton>
            </Link>
            <Link to="/blog">
              <NmButton className="px-5 py-3 text-base">
                <BookOpen className="w-4 h-4 text-[#4a90d9]" />
                المدونة القانونية
              </NmButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-6 py-12 max-w-[1240px] w-full mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#2d3748]">
            منظومة تشغيل قانونية متكاملة
          </h2>
          <p className="text-sm text-[#718096]">
            كل ما يحتاجه الشريك المدير والمحامي والمحاسب القانوني في مكان واحد
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <NmCard key={f.title} className="space-y-3">
                <div className={`nm-inset w-12 h-12 rounded-xl flex items-center justify-center ${f.accent}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#2d3748]">{f.title}</h3>
                <p className="text-sm text-[#718096] leading-relaxed">{f.desc}</p>
              </NmCard>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-14 max-w-[1000px] w-full mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#2d3748]">خطط الاشتراك</h2>
          <p className="text-sm text-[#718096]">ابدأ بالباقة المجانية أو انتقل إلى PRO بكامل قدرات الذكاء القانوني</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <NmCard className="p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#2d3748]">الباقة القياسية</h3>
                <span className="nm-badge text-[#27ae60]">مجانية</span>
              </div>
              <p className="text-3xl font-extrabold text-[#2d3748] tabular-nums">
                0 <span className="text-sm font-semibold text-[#718096]">ر.س / شهرياً</span>
              </p>
              <ul className="space-y-2.5 text-sm text-[#2d3748]">
                {FREE_PLAN_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <NmButton onClick={handleEnterApp} className="w-full py-3">
              ابدأ مجاناً
            </NmButton>
          </NmCard>

          <NmCard className="p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#c9a84c]">الباقة الاحترافية PRO</h3>
                <span className="nm-badge text-[#c9a84c]">للمكاتب</span>
              </div>
              <p className="text-3xl font-extrabold text-[#2d3748] tabular-nums">
                499 <span className="text-sm font-semibold text-[#718096]">ر.س / شهرياً</span>
              </p>
              <ul className="space-y-2.5 text-sm text-[#2d3748]">
                {PRO_PLAN_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#c9a84c] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <NmButton variant="gold" onClick={handleEnterApp} className="w-full py-3">
              تفعيل التجربة الاحترافية
            </NmButton>
          </NmCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-6 py-10">
        <div className="max-w-[1240px] mx-auto nm-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/logo-animated.gif"
                alt="شعار براءة"
                className="w-8 h-8 object-contain rounded-full"
              />
              <span className="font-bold text-[#2d3748]">نظام براءة القانوني</span>
            </div>
            <p className="text-xs text-[#718096]">
              الذكاء القانوني في خدمة مكتبك — نظام إدارة مكاتب المحاماة في مصر والسعودية والخليج.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-[#2d3748]">روابط سريعة</p>
            <div className="flex flex-col gap-1.5 text-xs text-[#718096]">
              <Link to="/blog" className="hover:text-[#4a90d9]">المدونة القانونية</Link>
              <Link to="/signup" className="hover:text-[#4a90d9]">تسجيل الدخول</Link>
              <button type="button" onClick={handleEnterApp} className="text-right hover:text-[#4a90d9] cursor-pointer">
                الدخول السريع للوحة التحكم
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-[#2d3748]">تواصل معنا</p>
            <div className="space-y-1.5 text-xs text-[#718096]">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#4a90d9]" />
                <span dir="ltr">+20 100 086 7697</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#4a90d9]" />
                <span>info@bara2a.com</span>
              </p>
              <p className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#4a90d9]" />
                <span>القاهرة · الرياض · دبي</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
