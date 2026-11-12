import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calendar, AlertTriangle, Receipt, CheckSquare, ArrowLeft } from 'lucide-react';
import { Hearing, Matter, Invoice, TaskItem } from '../types/erp';
import { listEntities } from '../lib/api';
import { NmCard, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { daysUntil, getCountdownArabic, toArabicDate } from '../utils/dateUtils';
import { formatSAR } from '../utils/currencyUtils';

interface AlertItem {
  id: string;
  kind: 'جلسة' | 'تقادم' | 'فاتورة' | 'مهمة';
  title: string;
  detail: string;
  urgency: 'عاجل' | 'متوسط';
  link: string;
}

export default function NotificationsPage() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    Promise.all([
      listEntities<Hearing>('hearings'),
      listEntities<Matter>('matters'),
      listEntities<Invoice>('invoices'),
      listEntities<TaskItem>('tasks'),
    ])
      .then(([h, m, i, t]) => {
        setHearings(h);
        setMatters(m);
        setInvoices(i);
        setTasks(t);
      })
      .catch(() => {});
  }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];

    hearings
      .filter((h) => h.status === 'قادم')
      .forEach((h) => {
        const cd = getCountdownArabic(h.hearing_date);
        out.push({
          id: `h-${h.id}`,
          kind: 'جلسة',
          title: `جلسة قادمة: ${h.title}`,
          detail: `${h.location} — ${cd.label}`,
          urgency: cd.urgency === 'danger' ? 'عاجل' : 'متوسط',
          link: '/hearings',
        });
      });

    matters.forEach((m) => {
      const d = daysUntil(m.statute_of_limitations_date);
      if (d !== null && d <= 45) {
        out.push({
          id: `m-${m.id}`,
          kind: 'تقادم',
          title: `تنبيه موعد سقوط/تقادم: ${m.title}`,
          detail: `متبقي ${d} يوم (${toArabicDate(m.statute_of_limitations_date)})`,
          urgency: d <= 14 ? 'عاجل' : 'متوسط',
          link: `/matters/${m.id}`,
        });
      }
    });

    invoices
      .filter((inv) => inv.balance_due > 0 && inv.status !== 'ملغاة')
      .forEach((inv) => {
        out.push({
          id: `inv-${inv.id}`,
          kind: 'فاتورة',
          title: `مستحقات فاتورة ${inv.invoice_number}`,
          detail: `المبلغ المتبقي ${formatSAR(inv.balance_due)} — الاستحقاق ${toArabicDate(inv.due_date)}`,
          urgency: inv.status === 'متأخرة' ? 'عاجل' : 'متوسط',
          link: `/invoices/${inv.id}`,
        });
      });

    tasks
      .filter((t) => t.status !== 'مكتملة' && t.status !== 'ملغاة' && (t.priority === 'عاجلة' || t.priority === 'عالية'))
      .forEach((t) => {
        out.push({
          id: `t-${t.id}`,
          kind: 'مهمة',
          title: `مهمة ذات أولوية: ${t.title}`,
          detail: `المسؤول: ${t.assigned_to} — الاستحقاق: ${toArabicDate(t.due_date)}`,
          urgency: t.priority === 'عاجلة' ? 'عاجل' : 'متوسط',
          link: '/tasks',
        });
      });

    return out;
  }, [hearings, matters, invoices, tasks]);

  const iconFor = (k: AlertItem['kind']) => {
    if (k === 'جلسة') return <Calendar className="w-5 h-5 text-[#4a90d9]" />;
    if (k === 'تقادم') return <AlertTriangle className="w-5 h-5 text-[#e74c3c]" />;
    if (k === 'فاتورة') return <Receipt className="w-5 h-5 text-[#e67e22]" />;
    return <CheckSquare className="w-5 h-5 text-[#27ae60]" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
          <Bell className="w-6 h-6 text-[#e67e22]" />
          مركز التنبيهات والمواعيد الحرجة ({alerts.length})
        </h1>
        <p className="text-sm text-[#718096]">
          متابعة مواعيد الجلسات، تواريخ التقادم القانوني، الفواتير المستحقة، والمهام العاجلة
        </p>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <NmCard className="p-8 text-center text-[#718096]">
            لا توجد تنبيهات حرجة في الوقت الحالي
          </NmCard>
        ) : (
          alerts.map((a) => (
            <Link key={a.id} to={a.link} className="block">
              <NmCard className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="nm-inset w-10 h-10 flex items-center justify-center shrink-0">
                    {iconFor(a.kind)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#2d3748]">{a.title}</span>
                      <StatusBadge status={a.urgency} />
                    </div>
                    <div className="text-xs text-[#718096] mt-0.5">{a.detail}</div>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-[#4a90d9] shrink-0" />
              </NmCard>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
