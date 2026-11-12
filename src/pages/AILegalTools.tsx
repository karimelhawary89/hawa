import React, { useEffect, useState } from 'react';
import { Cpu, Sparkles, Loader2, Printer, Search } from 'lucide-react';
import { listEntities, apiRequest } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
  NmCopyButton,
} from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

interface WidgetDef {
  id: string;
  key: string;
  name_ar: string;
  category: string;
  description_ar: string;
  fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>;
}

export default function AILegalTools() {
  const toast = useToast();
  const [widgets, setWidgets] = useState<WidgetDef[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('الكل');
  const [activeWidget, setActiveWidget] = useState<WidgetDef | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');

  useEffect(() => {
    listEntities<WidgetDef>('widget_catalogue')
      .then(setWidgets)
      .catch(() => toast.error('تعذّر تحميل أدوات الذكاء القانوني'));
  }, []);

  const categories = ['الكل', ...Array.from(new Set(widgets.map((w) => w.category)))];

  const filtered = widgets.filter((w) => {
    if (catFilter !== 'الكل' && w.category !== catFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return w.name_ar.toLowerCase().includes(q) || w.description_ar.toLowerCase().includes(q);
  });

  const openTool = (w: WidgetDef) => {
    setActiveWidget(w);
    const initial: Record<string, string> = {};
    (w.fields || []).forEach((f) => (initial[f.key] = ''));
    if ((w.fields || []).length === 0) initial.details = '';
    setInputs(initial);
    setOutput('');
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWidget) return;
    setRunning(true);
    try {
      const res = await apiRequest<{ output: string }>('/api/ai/widget', {
        method: 'POST',
        body: JSON.stringify({
          widgetKey: activeWidget.key,
          widgetName: activeWidget.name_ar,
          inputs,
        }),
      });
      setOutput(res.output);
      toast.success('اكتمل تشغيل الأداة القانونية');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر تشغيل الأداة');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
          <Cpu className="w-6 h-6 text-[#9a7619]" />
          مختبر الذكاء القانوني المتخصص ({widgets.length} أداة)
        </h1>
        <p className="text-sm text-[#718096]">
          أدوات ذكية متخصصة للنقض، العقود، الإخلاء، التنفيذ، الأدلة الجنائية، وحساب الرسوم القضائية
        </p>
      </div>

      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الأدوات الذكية (نقض، إخلاء، إنذار، تنفيذ، جنائي)..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="nm-input"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'الكل' ? 'كل التخصصات' : c}</option>
            ))}
          </select>
        </div>
      </NmCard>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((w) => (
          <NmCard key={w.id} onClick={() => openTool(w)} className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-[#2d3748]">{w.name_ar}</h3>
                <StatusBadge status={w.category} />
              </div>
              <p className="text-xs text-[#718096] leading-relaxed">{w.description_ar}</p>
            </div>
            <div className="flex justify-end">
              <span className="text-xs font-bold text-[#4a90d9] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#9a7619]" />
                تشغيل الأداة
              </span>
            </div>
          </NmCard>
        ))}
      </div>

      <NmModal
        open={Boolean(activeWidget)}
        onClose={() => setActiveWidget(null)}
        title={activeWidget?.name_ar || 'الأداة القانونية'}
        maxWidth="max-w-3xl"
      >
        {activeWidget && (
          <div className="space-y-4">
            <p className="text-xs text-[#718096]">{activeWidget.description_ar}</p>
            <form onSubmit={handleRun} className="space-y-3 no-print">
              {(activeWidget.fields && activeWidget.fields.length > 0
                ? activeWidget.fields
                : [{ key: 'details', label: 'الوقائع والتفاصيل القانونية', placeholder: 'أدخل الوقائع والأطراف والمستندات...' }]
              ).map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-[#718096] mb-1">{f.label}</label>
                  <NmVoiceInput
                    multiline={f.type === 'textarea' || (activeWidget.fields || []).length === 0}
                    rows={3}
                    value={inputs[f.key] || ''}
                    onChange={(val) => setInputs((prev) => ({ ...prev, [f.key]: val }))}
                    placeholder={f.placeholder || ''}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                {output && (
                  <NmButton type="button" onClick={() => window.print()}>
                    <Printer className="w-4 h-4" />
                    طباعة
                  </NmButton>
                )}
                <NmButton type="submit" variant="gold" disabled={running}>
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  توليد المخرج القانوني
                </NmButton>
              </div>
            </form>

            {output && (
              <div className="nm-inset p-4 space-y-2">
                <div className="flex items-center justify-between no-print">
                  <span className="text-xs font-bold text-[#27ae60]">المخرج القانوني الجاهز</span>
                  <NmCopyButton text={output} label="نسخ النص" />
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-[#2d3748] leading-loose max-h-96 overflow-y-auto">
                  {output}
                </pre>
              </div>
            )}
          </div>
        )}
      </NmModal>
    </div>
  );
}
