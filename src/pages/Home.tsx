import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  Users,
  CheckSquare,
  CalendarDays,
  Clock,
  Receipt,
  Sparkles,
  Bot,
  FileCheck2,
  ShieldAlert,
  Globe,
  BarChart3,
  Crown,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, usePlan } from '../context/AuthContext';
import { listEntities } from '../lib/api';
import { Client, Matter, TaskItem, Hearing, Invoice, TimeEntry } from '../types/erp';
import { getCountdownArabic, toArabicDateTime, isValidDate } from '../utils/dateUtils';
import { formatSAR } from '../utils/currencyUtils';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';

export default function Home() {
  const { user } = useAuth();
  const { isPro } = usePlan();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listEntities<Client>('clients'),
      listEntities<Matter>('matters'),
      listEntities<TaskItem>('tasks'),
      listEntities<Hearing>('hearings'),
      listEntities<Invoice>('invoices'),
      listEntities<TimeEntry>('time_entries'),
    ])
      .then(([cl, mt, tk, hr, inv, te]) => {
        setClients(cl);
        setMatters(mt);
        setTasks(tk);
        setHearings(hr);
        setInvoices(inv);
        setTimeEntries(te);
      })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';

  const activeMatters = matters.filter((m) => m.status !== 'مغلق');
  const pendingTasks = tasks.filter((t) => t.status !== 'مكتملة' && t.status !== 'ملغاة');
  const upcomingHearings = hearings.filter(
    (h) => h.status === 'قادم' && isValidDate(h.hearing_date)
  );
  const unbilledHours = timeEntries
    .filter((te) => te.is_billable && !te.invoice_id)
    .reduce((acc, te) => acc + Number(te.hours || 0), 0);
  const outstandingBalance = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  const statCards = [
    {
      label: 'القضايا النشطة',
      value: loading ? '...' : activeMatters.length,
      icon: Scale,
      color: 'text-[#4a90d9]',
      to: '/matters',
    },
    {
      label: 'المهام المعلقة',
      value: loading ? '...' : pendingTasks.length,
      icon: CheckSquare,
      color: 'text-[#e67e22]',
      to: '/tasks',
    },
    {
      label: 'الجلسات القادمة',
      value: loading ? '...' : upcomingHearings.length,
      icon: CalendarDays,
      color: 'text-[#27ae60]',
      to: '/hearings',
    },
    {
      label: 'الساعات غير المفوترة',
      value: loading ? '...' : `${unbilledHours.toFixed(1)} س`,
      icon: Clock,
      color: 'text-[#c9a84c]',
      to: '/time-entries',
    },
  ];

  const quickLinks = [
    { label: 'العملاء', to: '/clients', icon: Users },
    { label: 'القضايا', to: '/matters', icon: Scale },
    { label: 'مراجعة وصياغة العقود', to: '/contracts', icon: FileCheck2 },
    { label: 'الامتثال المصري والخليجي', to: '/compliance', icon: ShieldAlert },
    { label: 'الفواتير بالريال السعودي', to: '/invoices', icon: Receipt },
    { label: 'الذكاء القانوني (15 أداة)', to: '/ai-legal', icon: Sparkles },
    { label: 'المساعد الذكي براءة', to: '/ai-assistant', icon: Bot },
    { label: 'المواقع القانونية', to: '/legal-websites', icon: Globe },
    { label: 'التقارير والتحليلات', to: '/reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Welcome */}
      <NmCard className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-[#2d3748]">
            {greeting}، {user?.name || 'أ. كريم الهواري'}
          </h1>
          <p className="text-sm text-[#718096]">
            {user?.role || 'شريك'} · نظام براءة القانوني — الذكاء القانوني في خدمة مكتبك
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="nm-inset px-4 py-2 text-xs font-bold text-[#2d3748] tabular-nums">
            المستحقات القائمة: <span className="text-[#c9a84c]">{formatSAR(outstandingBalance)}</span>
          </div>
          <Link to="/subscription">
            <NmButton variant={isPro ? 'gold' : 'primary'}>
              <Crown className="w-4 h-4" />
              {isPro ? 'باقة PRO مفعّلة' : 'الترقية إلى PRO'}
            </NmButton>
          </Link>
        </div>
      </NmCard>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <NmCard
              key={s.label}
              onClick={() => navigate(s.to)}
              className="flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#718096]">{s.label}</p>
                <p className="text-3xl font-extrabold text-[#2d3748] tabular-nums">{s.value}</p>
              </div>
              <div className={`nm-inset w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </NmCard>
          );
        })}
      </div>

      {/* Upcoming Hearings with Live Countdowns + Urgent Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NmCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2d3748] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#4a90d9]" />
              آخر القضايا النشطة
            </h2>
            <Link to="/matters" className="text-xs font-bold text-[#4a90d9] inline-flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {matters.slice(0, 4).map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/matters/${m.id}`)}
                className="nm-inset p-3 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#4a90d9] tabular-nums">{m.case_number}</p>
                  <p className="text-sm font-semibold text-[#2d3748] truncate">{m.title}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </NmCard>

        <NmCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2d3748] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#27ae60]" />
              الجلسات القادمة (عد تنازلي)
            </h2>
            <Link to="/hearings" className="text-xs font-bold text-[#4a90d9] inline-flex items-center gap-1">
              التقويم <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {upcomingHearings.slice(0, 4).map((h) => {
              const cd = getCountdownArabic(h.hearing_date);
              return (
                <div
                  key={h.id}
                  onClick={() => navigate('/hearings')}
                  className="nm-inset p-3 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#2d3748] truncate">{h.title}</p>
                    <span
                      className={`text-[11px] font-bold tabular-nums shrink-0 ${
                        cd.urgency === 'danger'
                          ? 'text-[#e74c3c]'
                          : cd.urgency === 'warning'
                          ? 'text-[#e67e22]'
                          : 'text-[#27ae60]'
                      }`}
                    >
                      {cd.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#718096] truncate">
                    {toArabicDateTime(h.hearing_date)} · {h.location}
                  </p>
                </div>
              );
            })}
          </div>
        </NmCard>

        <NmCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2d3748] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#c9a84c]" />
              أحدث العملاء والمهام
            </h2>
            <Link to="/clients" className="text-xs font-bold text-[#4a90d9] inline-flex items-center gap-1">
              العملاء <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {clients.slice(0, 2).map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                className="nm-inset p-3 cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#718096] tabular-nums">{c.serial_number}</p>
                  <p className="text-sm font-semibold text-[#2d3748] truncate">{c.name}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
            {pendingTasks.slice(0, 2).map((t) => (
              <div
                key={t.id}
                onClick={() => navigate('/tasks')}
                className="nm-inset p-3 cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#e67e22] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    مهمة {t.priority}
                  </p>
                  <p className="text-sm font-semibold text-[#2d3748] truncate">{t.title}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </NmCard>
      </div>

      {/* Quick Links Grid */}
      <NmCard className="space-y-4">
        <h2 className="text-base font-bold text-[#2d3748]">الوصول السريع لوحدات النظام</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                className="nm-btn p-3.5 flex flex-col items-center text-center gap-2"
              >
                <Icon className="w-5 h-5 text-[#4a90d9]" />
                <span className="text-xs font-bold text-[#2d3748]">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </NmCard>
    </div>
  );
}
