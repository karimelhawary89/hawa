import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Search, Sparkles, Loader2, Scale } from 'lucide-react';
import { KnowledgeEntry } from '../types/erp';
import { listEntities, apiRequest } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmVoiceInput,
  NmCopyButton,
  NmModal,
} from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

export default function LegalResearch() {
  const toast = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('الكل');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  // AI Research
  const [query, setQuery] = useState('');
  const [aiJurisdiction, setAiJurisdiction] = useState('المملكة العربية السعودية ومصر');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    listEntities<KnowledgeEntry>('knowledge_base')
      .then(setEntries)
      .catch(() => toast.error('تعذّر تحميل المكتبة القانونية'));
  }, []);

  // BUG-06: Genuine search filter across title, content, tags, category
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (jurisdictionFilter !== 'الكل' && !e.jurisdiction.includes(jurisdictionFilter)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [entries, search, jurisdictionFilter]);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('يرجى إدخال المسألة القانونية للبحث');
      return;
    }
    setLoadingAI(true);
    try {
      const res = await apiRequest('/api/ai/legal-research', {
        method: 'POST',
        body: JSON.stringify({ query, jurisdiction: aiJurisdiction }),
      });
      setAiResult(res);
      toast.success('اكتمل البحث القانوني المعمق');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر إجراء البحث القانوني');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#4a90d9]" />
          البحث القانوني والمكتبة التشريعية
        </h1>
        <p className="text-sm text-[#718096]">
          البحث في أرشيف السوابق والمذكرات الداخلية مع مساعد البحث القانوني الذكي
        </p>
      </div>

      {/* AI Legal Research Assistant */}
      <NmCard className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#2d3748] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9a7619]" />
            باحث السوابق والأنظمة بالذكاء الاصطناعي
          </h2>
          <select
            value={aiJurisdiction}
            onChange={(e) => setAiJurisdiction(e.target.value)}
            className="nm-input w-auto"
          >
            <option value="المملكة العربية السعودية">المملكة العربية السعودية</option>
            <option value="جمهورية مصر العربية">جمهورية مصر العربية</option>
            <option value="المملكة العربية السعودية ومصر">المقارن: السعودي والمصري</option>
            <option value="دول مجلس التعاون الخليجي">دول مجلس التعاون الخليجي</option>
          </select>
        </div>

        <form onSubmit={handleResearch} className="space-y-3">
          <NmVoiceInput
            multiline
            rows={3}
            value={query}
            onChange={setQuery}
            placeholder="اطرح سؤالك القانوني (مثال: شروط إعمال القوة القاهرة وإعادة التوازن الاقتصادي في عقود التوريد وفق نظام المعاملات المدنية السعودي والقانون المدني المصري)..."
          />
          <div className="flex justify-end">
            <NmButton type="submit" variant="gold" disabled={loadingAI}>
              {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              إجراء بحث قانوني موثّق
            </NmButton>
          </div>
        </form>

        {aiResult && (
          <div className="nm-inset p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2d3748]">نتيجة البحث القانوني</span>
              {aiResult.citation_text && (
                <NmCopyButton text={aiResult.citation_text} label="نسخ الاستشهاد" />
              )}
            </div>
            <p className="text-sm text-[#2d3748] leading-relaxed">{aiResult.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(aiResult.legal_principles) && (
                <div className="nm-raised p-4 space-y-2">
                  <div className="text-xs font-bold text-[#4a90d9]">المبادئ القانونية المستقرة</div>
                  <ul className="space-y-1 text-xs text-[#2d3748]">
                    {aiResult.legal_principles.map((p: string, i: number) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(aiResult.relevant_statutes) && (
                <div className="nm-raised p-4 space-y-2">
                  <div className="text-xs font-bold text-[#27ae60]">النصوص والأنظمة ذات الصلة</div>
                  <ul className="space-y-1 text-xs text-[#2d3748]">
                    {aiResult.relevant_statutes.map((s: string, i: number) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {aiResult.practical_guidance && (
              <div className="text-xs text-[#9a7619] font-medium">
                <strong>التوجيه العملي: </strong>
                {aiResult.practical_guidance}
              </div>
            )}
          </div>
        )}
      </NmCard>

      {/* Local Legal Library Search */}
      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في السوابق والمواد والأدلة المرجعية للمكتب..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل الاختصاصات</option>
            <option value="السعودية">المملكة العربية السعودية</option>
            <option value="مصر">جمهورية مصر العربية</option>
          </select>
        </div>
      </NmCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.length === 0 ? (
          <NmCard className="p-8 text-center text-[#718096] md:col-span-2">
            لا توجد مواد مطابقة في المكتبة القانونية
          </NmCard>
        ) : (
          filteredEntries.map((entry) => (
            <NmCard
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="p-5 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-[#2d3748] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#4a90d9] shrink-0" />
                  {entry.title}
                </h3>
                <StatusBadge status={entry.category} />
              </div>
              <div className="text-xs text-[#4a90d9] font-medium">{entry.jurisdiction}</div>
              <p className="text-xs text-[#718096] line-clamp-3 leading-relaxed">{entry.content}</p>
            </NmCard>
          ))
        )}
      </div>

      <NmModal
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry?.title || 'المرجع القانوني'}
        maxWidth="max-w-3xl"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedEntry.category} />
              <span className="nm-badge text-[#4a90d9]">{selectedEntry.jurisdiction}</span>
            </div>
            <div className="nm-inset p-4 text-sm text-[#2d3748] leading-loose whitespace-pre-wrap">
              {selectedEntry.content}
            </div>
            <div className="flex items-center justify-between text-xs text-[#718096]">
              <span>الوسوم: {selectedEntry.tags}</span>
              <NmCopyButton text={selectedEntry.content} label="نسخ المحتوى" />
            </div>
          </div>
        )}
      </NmModal>
    </div>
  );
}
