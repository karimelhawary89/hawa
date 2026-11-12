/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NmCard, NmButton } from '../components/ui/NeumorphicPrimitives';

export default function AuthPage() {
  const { loginWithEmail, loginDemo, signup, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('karim@baraa-legal.com');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState('محامٍ أول');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await loginWithEmail(email);
        toast.success('تم تسجيل الدخول بنجاح');
      } else {
        if (!name.trim() || !email.trim()) {
          toast.error('يرجى إدخال الاسم والبريد الإلكتروني');
          return;
        }
        await signup(name, email, role);
        toast.success('تم إنشاء الحساب والدخول بنجاح');
      }
      navigate('/home');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر تسجيل الدخول');
    }
  };

  const handleDemo = async () => {
    await loginDemo();
    toast.success('مرحباً بك في الحساب التجريبي — شريك مدير');
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#e0e5ec] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#718096] hover:text-[#4a90d9]"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للصفحة الرئيسية
        </Link>

        <NmCard className="p-8 space-y-6">
          {/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */}
          <div className="text-center space-y-2">
            <img
              src="/assets/logo-animated.gif"
              alt="شعار نظام براءة"
              className="w-24 h-24 mx-auto object-contain rounded-full nm-raised p-1"
            />
            <h1 className="text-2xl font-extrabold text-[#2d3748]">نظام براءة القانوني</h1>
            <p className="text-xs font-bold text-[#c9a84c]">الذكاء القانوني في خدمة مكتبك</p>
          </div>

          <div className="nm-inset p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-sm font-bold rounded-[8px] cursor-pointer transition-all ${
                mode === 'login' ? 'nm-raised-sm text-[#4a90d9]' : 'text-[#718096]'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 text-sm font-bold rounded-[8px] cursor-pointer transition-all ${
                mode === 'signup' ? 'nm-raised-sm text-[#4a90d9]' : 'text-[#718096]'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#718096] block">الاسم الكامل</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أ. محمد عبدالرحمن"
                    className="nm-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#718096] block">الصفة المهنية</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="nm-input"
                  >
                    <option value="شريك">شريك</option>
                    <option value="مشرف">مشرف</option>
                    <option value="محامٍ أول">محامٍ أول</option>
                    <option value="محامٍ">محامٍ</option>
                    <option value="مساعد قانوني">مساعد قانوني</option>
                    <option value="مالية">مالية</option>
                    <option value="عمليات">عمليات</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096] block">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني"
                className="nm-input"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#718096] block">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="nm-input"
                dir="ltr"
              />
            </div>

            <NmButton
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full py-3"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </NmButton>
          </form>

          <div className="pt-2">
            <NmButton
              type="button"
              variant="gold"
              onClick={handleDemo}
              className="w-full py-3"
            >
              <Sparkles className="w-4 h-4" />
              دخول تجريبي سريع (شريك مدير — PRO)
            </NmButton>
          </div>
        </NmCard>
      </div>
    </div>
  );
}
