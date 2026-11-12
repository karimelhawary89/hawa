/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Scale,
  CheckSquare,
  CalendarDays,
  FileText,
  BookOpen,
  MessageCircle,
  Inbox,
  ShieldCheck,
  MessageSquare,
  Receipt,
  CreditCard,
  Clock,
  BarChart3,
  Sparkles,
  Bot,
  Mic,
  Settings,
  Globe,
  PenSquare,
  Crown,
  Database,
  LayoutGrid,
  Puzzle,
  Layers,
  FileCheck2,
  ShieldAlert,
  Gavel,
  Award,
  Menu,
  LogOut,
  Search,
} from 'lucide-react';
import { useAuth, usePlan } from '../context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  pro?: boolean;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: string[];
}

const SENIOR_ROLES = ['شريك', 'مشرف', 'محامٍ أول'];
const ADMIN_ROLES = ['شريك', 'مشرف'];

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'الرئيسية',
    items: [{ label: 'لوحة التحكم', to: '/home', icon: Home }],
  },
  {
    title: 'العمليات القانونية',
    items: [
      { label: 'العملاء', to: '/clients', icon: Users },
      { label: 'القضايا', to: '/matters', icon: Scale },
      { label: 'المهام', to: '/tasks', icon: CheckSquare },
      { label: 'المواعيد والجلسات', to: '/hearings', icon: CalendarDays },
      { label: 'المستندات', to: '/documents', icon: FileText },
      { label: 'مراجعة وصياغة العقود', to: '/contracts', icon: FileCheck2 },
      { label: 'الامتثال والتقارير الرسمية', to: '/compliance', icon: ShieldAlert },
      { label: 'التحكيم والوساطة', to: '/arbitration', icon: Gavel },
    ],
  },
  {
    title: 'الاستقبال والتواصل',
    items: [
      { label: 'واتساب الوارد', to: '/whatsapp', icon: MessageCircle },
      { label: 'الاستقبال', to: '/inquiries', icon: Inbox },
      { label: 'التحقق من التعارض', to: '/conflict-checks', icon: ShieldCheck },
      { label: 'الاستشارات', to: '/consultations', icon: MessageSquare },
    ],
  },
  {
    title: 'المالية والفوترة',
    items: [
      { label: 'الفواتير', to: '/invoices', icon: Receipt },
      { label: 'المدفوعات', to: '/payments', icon: CreditCard },
      { label: 'قيود الوقت', to: '/time-entries', icon: Clock },
      { label: 'الاشتراكات', to: '/subscription', icon: Crown, pro: true },
    ],
  },
  {
    title: 'الذكاء القانوني',
    items: [
      { label: 'الذكاء القانوني (15 أداة)', to: '/ai-legal', icon: Sparkles },
      { label: 'المساعد الذكي (براءة)', to: '/ai-assistant', icon: Bot },
      { label: 'البحث القانوني المصري', to: '/legal-research', icon: Search },
      { label: 'المكتبة القانونية', to: '/legal-library', icon: BookOpen },
    ],
  },
  {
    title: 'المعرفة والتكاملات',
    roles: SENIOR_ROLES,
    items: [
      { label: 'قاعدة المعرفة RAG', to: '/knowledge-base', icon: Database, pro: true },
      { label: 'معرض الويدجت', to: '/widget-gallery', icon: LayoutGrid, pro: true },
      { label: 'الويدجت المفعّلة', to: '/my-widgets', icon: Puzzle, pro: true },
      { label: 'التكاملات', to: '/integrations', icon: Layers, pro: true },
    ],
  },
  {
    title: 'المحتوى والإدارة',
    items: [
      { label: 'المواقع القانونية', to: '/legal-websites', icon: Globe },
      { label: 'المدونة القانونية', to: '/blog', icon: BookOpen },
      { label: 'إدارة المدونة', to: '/blog-admin', icon: PenSquare, roles: ADMIN_ROLES },
      { label: 'ملف المحامي والتدريب', to: '/lawyer-profile', icon: Award },
    ],
  },
  {
    title: 'التقارير والنظام',
    items: [
      { label: 'التقارير والتحليلات', to: '/reports', icon: BarChart3 },
      { label: 'إعدادات الصوت', to: '/voice-settings', icon: Mic },
      { label: 'الإعدادات', to: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const { isPro } = usePlan();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || 'محامٍ';

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#2d3748]/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`nm-sidebar fixed lg:sticky top-0 z-40 h-screen flex flex-col transition-all duration-200 select-none ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} right-0`}
      >
        {/* 🔒 GIF ASSET — PROTECTED — DO NOT REMOVE */}
        <div className="px-4 py-4 flex items-center justify-between gap-2">
          <Link to="/home" className="flex items-center gap-3 min-w-0" onClick={onCloseMobile}>
            <img
              src="/assets/logo-animated.gif"
              alt="شعار نظام براءة القانوني"
              className="w-12 h-12 object-contain rounded-full shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-base font-extrabold text-[#2d3748] truncate leading-tight">
                  نظام براءة
                </p>
                <p className="text-[11px] font-semibold text-[#c9a84c] truncate">
                  {isPro ? 'الإصدار الاحترافي' : 'الإصدار القياسي'}
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="nm-icon-btn w-8 h-8 hidden lg:flex items-center justify-center text-[#718096] shrink-0"
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* User Summary */}
        {!collapsed && user && (
          <div className="px-4 pb-3">
            <div className="nm-inset px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full nm-raised flex items-center justify-center text-xs font-bold text-[#4a90d9] shrink-0">
                {user.name?.charAt(0) || 'ب'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#2d3748] truncate">{user.name}</p>
                <p className="text-[11px] text-[#718096] truncate">{userRole}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {NAV_SECTIONS.map((section) => {
            if (section.roles && !section.roles.includes(userRole)) return null;
            const visibleItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {!collapsed && (
                  <p className="px-2 text-[11px] font-bold text-[#718096] mb-1">
                    {section.title}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[8px] text-sm font-semibold transition-all duration-150 ${
                        active
                          ? 'nm-pressed text-[#4a90d9]'
                          : 'text-[#2d3748] hover:text-[#4a90d9]'
                      } ${collapsed ? 'justify-center px-2' : ''}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#4a90d9]' : 'text-[#718096]'
                        }`}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.pro && (
                            <span className="nm-badge text-[10px] text-[#c9a84c] px-1.5 py-0.5">
                              PRO
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3">
          <button
            type="button"
            onClick={logout}
            className="nm-btn w-full py-2 px-3 text-xs text-[#e74c3c] flex items-center justify-center gap-2"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
