import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Mic,
  Menu,
  Clock,
  Globe,
  User,
  Settings,
  LogOut,
  AlertTriangle,
  CalendarDays,
  Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, listEntities } from '../lib/api';
import { daysUntil, toArabicDateTime } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export default function Topbar({
  onOpenMobileMenu,
  onOpenAssistant,
}: {
  onOpenMobileMenu: () => void;
  onOpenAssistant: () => void;
}) {
  const { user, logout, dir, toggleDirection, activeTimer, stopTimer } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; detail: string; path: string; level: 'danger' | 'warning' }>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K Global Search & Alt+V Voice Assistant
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearch(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        onOpenAssistant();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenAssistant]);

  // Compute live alerts (hearings <48h, statute <30d, overdue invoices)
  useEffect(() => {
    async function loadAlerts() {
      try {
        const [hearings, matters, invoices] = await Promise.all([
          listEntities('hearings'),
          listEntities('matters'),
          listEntities('invoices'),
        ]);
        const list: any[] = [];
        for (const h of hearings) {
          if (h.status === 'قادم') {
            const d = daysUntil(h.hearing_date);
            if (d !== null && d >= 0 && d <= 2) {
              list.push({
                id: `h-${h.id}`,
                title: `جلسة قريبة: ${h.title}`,
                detail: toArabicDateTime(h.hearing_date),
                path: '/hearings',
                level: d <= 1 ? 'danger' : 'warning',
              });
            }
          }
        }
        for (const m of matters) {
          const d = daysUntil(m.statute_of_limitations_date);
          if (d !== null && d >= 0 && d <= 30 && m.status !== 'مغلق') {
            list.push({
              id: `m-${m.id}`,
              title: `تنبيه تقادم (${m.case_number})`,
              detail: `متبقي ${d} يوم على موعد التقادم`,
              path: `/matters/${m.id}`,
              level: d <= 14 ? 'danger' : 'warning',
            });
          }
        }
        for (const inv of invoices) {
          if (inv.status === 'متأخرة') {
            list.push({
              id: `i-${inv.id}`,
              title: `فاتورة متأخرة ${inv.invoice_number}`,
              detail: `المبلغ المتبقي ${inv.balance_due} ${inv.currency}`,
              path: `/invoices/${inv.id}`,
              level: 'danger',
            });
          }
        }
        setAlerts(list);
      } catch {
        // silent
      }
    }
    loadAlerts();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await apiRequest<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const handleStopTimer = async () => {
    const snap = stopTimer();
    if (!snap) return;
    const hours = Math.max(0.25, Number((snap.elapsedSeconds / 3600).toFixed(2)));
    try {
      await apiRequest('/api/entities/time_entries', {
        method: 'POST',
        body: JSON.stringify({
          matter_id: snap.matterId,
          lawyer: user?.name || 'أ. كريم الهواري',
          entry_date: new Date().toISOString().slice(0, 10),
          hours,
          hourly_rate: user?.hourly_rate || 800,
          category: 'عمل قانوني مباشر',
          description: `قيد وقت تلقائي للقضية: ${snap.matterTitle}`,
          is_billable: true,
        }),
      });
      toast.success(`تم حفظ قيد الوقت (${hours} ساعة)`);
    } catch {
      toast.error('تعذّر حفظ قيد الوقت');
    }
  };

  const formatTimer = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <header className="sticky top-0 z-30 h-16 px-4 lg:px-6 flex items-center justify-between gap-4 bg-[#e0e5ec]/90 backdrop-blur-sm">
      {/* Right side (RTL start): Mobile hamburger + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="nm-icon-btn w-10 h-10 flex lg:hidden items-center justify-center text-[#2d3748] shrink-0"
          aria-label="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <div className="nm-inset flex items-center px-3 py-1.5 gap-2">
            <Search className="w-4 h-4 text-[#718096] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 180)}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث سريع في العملاء، القضايا، الجلسات... (Ctrl+K)"
              className="bg-transparent border-0 outline-none text-sm text-[#2d3748] placeholder:text-[#a0aec0] w-full"
            />
          </div>

          {showSearch && results.length > 0 && (
            <div className="nm-modal absolute top-12 right-0 left-0 z-50 p-2 max-h-80 overflow-y-auto space-y-1">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onMouseDown={() => {
                    navigate(r.path);
                    setQuery('');
                    setShowSearch(false);
                  }}
                  className="w-full text-right px-3 py-2 rounded-lg hover:bg-[#d0d5dd]/40 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2d3748] truncate">{r.title}</p>
                    <p className="text-xs text-[#718096] truncate">{r.subtitle}</p>
                  </div>
                  <span className="nm-badge text-[11px] text-[#4a90d9] shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left side (RTL end): Active timer, Voice AI, Direction toggle, Notifications, User */}
      <div className="flex items-center gap-2.5 shrink-0">
        {activeTimer && (
          <div className="nm-raised-sm px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-[#e67e22] tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline max-w-[110px] truncate">{activeTimer.matterTitle}</span>
            <span>{formatTimer(activeTimer.elapsedSeconds)}</span>
            <button
              type="button"
              onClick={handleStopTimer}
              className="nm-icon-btn w-6 h-6 flex items-center justify-center text-[#e74c3c]"
              title="إيقاف وحفظ قيد الوقت"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleDirection}
          className="nm-btn px-2.5 py-2 text-xs text-[#718096] hidden sm:inline-flex items-center gap-1"
          title="تبديل اتجاه الواجهة"
        >
          <Globe className="w-3.5 h-3.5 text-[#4a90d9]" />
          <span>{dir === 'rtl' ? 'عربي' : 'EN'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssistant}
          className="nm-icon-btn w-10 h-10 flex items-center justify-center text-[#c9a84c]"
          title="المساعد الصوتي براءة (Alt+V)"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifs((v) => !v);
              setShowUserMenu(false);
            }}
            className="nm-icon-btn w-10 h-10 flex items-center justify-center text-[#2d3748] relative"
            title="التنبيهات والمواعيد"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -left-1 nm-badge px-1.5 py-0 text-[10px] text-[#e74c3c] tabular-nums">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="nm-modal absolute left-0 top-12 w-80 p-4 z-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#2d3748]">تنبيهات المكتب العاجلة</span>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="text-xs font-semibold text-[#4a90d9]"
                >
                  عرض الكل
                </Link>
              </div>
              {alerts.length === 0 ? (
                <p className="text-xs text-[#718096] py-3 text-center">لا توجد تنبيهات عاجلة حالياً</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setShowNotifs(false);
                        navigate(a.path);
                      }}
                      className="nm-inset w-full text-right p-2.5 flex items-start gap-2.5 cursor-pointer"
                    >
                      {a.level === 'danger' ? (
                        <AlertTriangle className="w-4 h-4 text-[#e74c3c] shrink-0 mt-0.5" />
                      ) : (
                        <CalendarDays className="w-4 h-4 text-[#e67e22] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2d3748] truncate">{a.title}</p>
                        <p className="text-[11px] text-[#718096]">{a.detail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu((v) => !v);
              setShowNotifs(false);
            }}
            className="nm-icon-btn w-10 h-10 flex items-center justify-center text-sm font-bold text-[#4a90d9]"
            title={user?.name}
          >
            {user?.name?.charAt(0) || 'ب'}
          </button>

          {showUserMenu && (
            <div className="nm-modal absolute left-0 top-12 w-56 p-3 z-50 space-y-1.5">
              <div className="px-2 py-1.5">
                <p className="text-xs font-bold text-[#2d3748] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#718096] truncate">{user?.role}</p>
              </div>
              <Link
                to="/lawyer-profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#2d3748] hover:text-[#4a90d9]"
              >
                <User className="w-3.5 h-3.5" />
                الملف الشخصي
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#2d3748] hover:text-[#4a90d9]"
              >
                <Settings className="w-3.5 h-3.5" />
                الإعدادات
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#e74c3c] text-right cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
