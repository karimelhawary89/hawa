import React, { useEffect, useState, useMemo } from 'react';
import {
  FileSignature,
  ShieldAlert,
  Languages,
  BookOpen,
  GitCompare,
  Handshake,
  Sparkles,
  Loader2,
  Printer,
  Search,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { ClauseItem } from '../types/erp';
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

type TabKey = 'review' | 'draft' | 'clauses' | 'compare' | 'playbooks';

export default function ContractsHub() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('review');

  // Tab 1: Review
  const [reviewText, setReviewText] = useState('');
  const [reviewType, setReviewType] = useState('عقد توريد وخدمات تجارية');
  const [reviewJurisdiction, setReviewJurisdiction] = useState('المملكة العربية السعودية');
  const [checkSharia, setCheckSharia] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);

  // Tab 2: Draft
  const [draftForm, setDraftForm] = useState({
    contractType: 'اتفاقية شراكة تجارية وتطوير تقني',
    partyOne: '',
    partyTwo: '',
    value: '250,000 ريال سعودي',
    jurisdiction: 'المملكة العربية السعودية — المحاكم التجارية بالرياض',
    keyTerms: '',
  });
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  // Tab 3: Clause Library
  const [clauses, setClauses] = useState<ClauseItem[]>([]);
  const [clauseSearch, setClauseSearch] = useState('');
  const [clauseCat, setClauseCat] = useState('الكل');
  const [selectedClause, setSelectedClause] = useState<ClauseItem | null>(null);

  // Tab 4: Compare
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>(null);

  // Tab 5: Playbooks
  const [playbookFocus, setPlaybookFocus] = useState('الحد الأقصى للمسؤولية والجزاءات');

  useEffect(() => {
    listEntities<ClauseItem>('clause_library')
      .then(setClauses)
      .catch(() => {});
  }, []);

  const filteredClauses = useMemo(() => {
    const q = clauseSearch.trim().toLowerCase();
    return clauses.filter((c) => {
      if (clauseCat !== 'الكل' && c.category !== clauseCat) return false;
      if (!q) return true;
      return (
        c.title_ar.toLowerCase().includes(q) ||
        c.text_ar.toLowerCase().includes(q) ||
        c.text_en.toLowerCase().includes(q) ||
        c.law_ref.toLowerCase().includes(q)
      );
    });
  }, [clauses, clauseSearch, clauseCat]);

  const clauseCategories = useMemo(() => {
    const set = new Set(clauses.map((c) => c.category));
    return ['الكل', ...Array.from(set)];
  }, [clauses]);

  const handleReview = async () => {
    if (!reviewText.trim()) {
      toast.error('يرجى لصق نص العقد للمراجعة');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await apiRequest('/api/ai/contract-review', {
        method: 'POST',
        body: JSON.stringify({
          contractText: reviewText,
          contractType: reviewType,
          jurisdiction: reviewJurisdiction,
          checkSharia,
        }),
      });
      setReviewResult(res);
      toast.success('اكتملت المراجعة الخماسية للعقد');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر تحليل العقد');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm.partyOne.trim() || !draftForm.partyTwo.trim()) {
      toast.error('يرجى إدخال بيانات الطرف الأول والطرف الثاني');
      return;
    }
    setDraftLoading(true);
    try {
      const res = await apiRequest('/api/ai/contract-draft', {
        method: 'POST',
        body: JSON.stringify(draftForm),
      });
      setDraftResult(res);
      toast.success('تمت صياغة العقد ثنائي اللغة بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر صياغة العقد');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!versionA.trim() || !versionB.trim()) {
      toast.error('يرجى إدخال النسختين للمقارنة');
      return;
    }
    setCompareLoading(true);
    try {
      const res = await apiRequest('/api/ai/contract-compare', {
        method: 'POST',
        body: JSON.stringify({ versionA, versionB }),
      });
      setCompareResult(res);
      toast.success('تمت مقارنة النسختين واكتشاف الفروقات');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر مقارنة النسختين');
    } finally {
      setCompareLoading(false);
    }
  };

  const PLAYBOOKS: Record<
    string,
    { preferred: string; fallback: string; redline: string; checklist: string[] }
  > = {
    'الحد الأقصى للمسؤولية والجزاءات': {
      preferred:
        'لا يتجاوز إجمالي مسؤولية المكتب/الشركة في أي حال من الأحوال 100% من إجمالي الأتعاب المدفوعة فعلياً خلال الاثني عشر شهراً السابقة، وتُستبعد الأضرار غير المباشرة وتفويت الفرصة.',
      fallback:
        'سقف المسؤولية يعادل ضعف قيمة العقد بحد أقصى 500,000 ريال سعودي مع استثناء الإهمال الجسيم والغش العمدي.',
      redline:
        'رفض أي بند ينص على مسؤولية غير محدودة أو غرامات تأخير تتجاوز 10% من قيمة العقد وفق أنظمة المنافسات والمشتريات.',
      checklist: [
        'التحقق من وجود سقف مالي واضح للمسؤولية',
        'استبعاد الأضرار التبعية وغير المباشرة',
        'مراجعة تناسب الشرط الجزائي مع الضرر الفعلي (م 224 مدني مصري)',
      ],
    },
    'الملكية الفكرية والسرية': {
      preferred:
        'تنتقل حقوق الملكية الفكرية للمخرجات الحصرية فقط بعد سداد كامل المستحقات المالية، مع احتفاظ الطرف المنفذ بملكية أدواته ومنهجياته السابقة.',
      fallback:
        'ترخيص غير حصري ودائم للعميل على المخرجات مع حظر التنازل للغير دون موافقة كتابية.',
      redline:
        'رفض نقل ملكية الشيفرات المصدرية الأساسية أو القوالب المملوكة مسبقاً دون مقابل مستقل.',
      checklist: [
        'تحديد مدة السرية (3 إلى 5 سنوات) بعد انتهاء العقد',
        'استثناء المعلومات المتاحة للعموم أو المطلوبة بأمر قضائي',
        'ربط نقل الملكية بسداد الدفعة الختامية',
      ],
    },
    'الاختصاص القضائي والتحكيم': {
      preferred:
        'يخضع هذا العقد لأنظمة المملكة العربية السعودية، ويفصل في أي نزاع عن طريق التحكيم المؤسسي لدى المركز السعودي للتحكيم التجاري (SCCA) أو CRCICA باللغة العربية.',
      fallback:
        'الاختصاص للمحاكم التجارية المختصة بمقر المدعى عليه بعد استنفاد مهلة التسوية الودية (30 يوماً).',
      redline:
        'رفض الخضوع لقوانين أجنبية غير متوافقة مع النظام العام أو شروط التحكيم المكلفة في الخارج لقيم عقود متوسطة.',
      checklist: [
        'إدراج بند التسوية الودية لمدة 15–30 يوماً قبل التقاضي',
        'تحديد لغة التحكيم (العربية) ومقر التحكيم وعدد المحكمين',
        'التأكد من عدم وجود تناقض بين بند التحكيم وبند الاختصاص القضائي',
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#4a90d9]" />
            مركز العقود الذكي
          </h1>
          <p className="text-sm text-[#718096]">
            مراجعة العقود الخماسية، الصياغة ثنائية اللغة، مكتبة البنود، والمقارنة القانونية
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 no-print">
        <NmButton active={activeTab === 'review'} onClick={() => setActiveTab('review')}>
          <ShieldAlert className="w-4 h-4" />
          مراجعة العقود بالذكاء الاصطناعي
        </NmButton>
        <NmButton active={activeTab === 'draft'} onClick={() => setActiveTab('draft')}>
          <Languages className="w-4 h-4" />
          صياغة عقد ثنائي اللغة
        </NmButton>
        <NmButton active={activeTab === 'clauses'} onClick={() => setActiveTab('clauses')}>
          <BookOpen className="w-4 h-4" />
          مكتبة البنود ({clauses.length})
        </NmButton>
        <NmButton active={activeTab === 'compare'} onClick={() => setActiveTab('compare')}>
          <GitCompare className="w-4 h-4" />
          مقارنة النسخ وكشف التناقض
        </NmButton>
        <NmButton active={activeTab === 'playbooks'} onClick={() => setActiveTab('playbooks')}>
          <Handshake className="w-4 h-4" />
          أدلة التفاوض
        </NmButton>
      </div>

      {/* TAB 1: AI CONTRACT REVIEW */}
      {activeTab === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <NmCard className="lg:col-span-5 p-5 space-y-4">
            <h2 className="font-bold text-[#2d3748]">بيانات ونص العقد للمراجعة</h2>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">نوع العقد</label>
              <input
                type="text"
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value)}
                className="nm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الاختصاص القانوني</label>
              <select
                value={reviewJurisdiction}
                onChange={(e) => setReviewJurisdiction(e.target.value)}
                className="nm-input"
              >
                <option value="المملكة العربية السعودية">المملكة العربية السعودية</option>
                <option value="جمهورية مصر العربية">جمهورية مصر العربية</option>
                <option value="دولة الإمارات العربية المتحدة">دولة الإمارات العربية المتحدة</option>
                <option value="الاختصاص الخليجي المشترك">الاختصاص الخليجي المشترك</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer">
              <input
                type="checkbox"
                checked={checkSharia}
                onChange={(e) => setCheckSharia(e.target.checked)}
                className="w-4 h-4 accent-[#4a90d9]"
              />
              تضمين فحص الامتثال الشرعي (الربا، الغرر، الجهالة)
            </label>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">نص العقد</label>
              <NmVoiceInput
                multiline
                rows={9}
                value={reviewText}
                onChange={setReviewText}
                placeholder="الصق بنود العقد هنا لبدء الفحص الخماسي (كشف المخاطر، الشرعي، الفجوات، مقارنة السوق)..."
              />
            </div>
            <NmButton
              variant="gold"
              className="w-full"
              disabled={reviewLoading}
              onClick={handleReview}
            >
              {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تشغيل المراجعة الخماسية الآن
            </NmButton>
          </NmCard>

          <div className="lg:col-span-7 space-y-4">
            {!reviewResult ? (
              <NmCard className="p-10 text-center space-y-3">
                <ShieldAlert className="w-10 h-10 text-[#4a90d9] mx-auto" />
                <div className="font-bold text-[#2d3748]">محرك المراجعة الخماسية للعقود</div>
                <p className="text-sm text-[#718096] max-w-md mx-auto">
                  الصق نص العقد واضغط &ldquo;تشغيل المراجعة الخماسية&rdquo; للحصول على تقرير المخاطر، الامتثال الشرعي، الفجوات، وإعادة الصياغة المقترحة.
                </p>
              </NmCard>
            ) : (
              <div className="space-y-4">
                <NmCard className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#718096]">درجة المخاطر الإجمالية</div>
                      <div className="text-2xl font-bold text-[#e67e22] tabular-nums">
                        {reviewResult.overall_risk_score}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#718096]">نسبة الامتثال القانوني</div>
                      <div className="text-2xl font-bold text-[#27ae60] tabular-nums">
                        {reviewResult.compliance_score}%
                      </div>
                    </div>
                    {reviewResult.sharia_status && (
                      <StatusBadge status={reviewResult.sharia_status} />
                    )}
                  </div>
                  <p className="text-sm text-[#2d3748] leading-relaxed">
                    {reviewResult.executive_summary}
                  </p>
                  {reviewResult.sharia_notes && (
                    <div className="nm-inset p-3 text-xs text-[#2d3748]">
                      <span className="font-bold text-[#9a7619]">الملاحظة الشرعية: </span>
                      {reviewResult.sharia_notes}
                    </div>
                  )}
                </NmCard>

                {Array.isArray(reviewResult.missing_clauses) &&
                  reviewResult.missing_clauses.length > 0 && (
                    <NmCard className="p-4 space-y-2">
                      <h3 className="text-sm font-bold text-[#e67e22]">بنود مفقودة يُوصى بإضافتها</h3>
                      <ul className="space-y-1 text-sm text-[#2d3748]">
                        {reviewResult.missing_clauses.map((mc: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#e67e22] shrink-0" />
                            <span>{mc}</span>
                          </li>
                        ))}
                      </ul>
                    </NmCard>
                  )}

                {Array.isArray(reviewResult.findings) &&
                  reviewResult.findings.map((f: any, idx: number) => (
                    <NmCard key={idx} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-[#2d3748]">{f.clause_title}</h4>
                        <StatusBadge status={f.severity} />
                      </div>
                      <div className="text-xs text-[#4a90d9]">{f.law_reference}</div>
                      <p className="text-sm text-[#2d3748]">{f.issue_explanation}</p>
                      {f.suggested_rewrite && (
                        <div className="nm-inset p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#27ae60]">الصياغة البديلة المقترحة</span>
                            <NmCopyButton text={f.suggested_rewrite} label="نسخ" />
                          </div>
                          <p className="text-xs text-[#2d3748] leading-relaxed">{f.suggested_rewrite}</p>
                        </div>
                      )}
                    </NmCard>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BILINGUAL CONTRACT DRAFTING */}
      {activeTab === 'draft' && (
        <div className="space-y-6">
          <NmCard className="p-5 no-print">
            <form onSubmit={handleDraft} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">نوع العقد</label>
                  <input
                    type="text"
                    value={draftForm.contractType}
                    onChange={(e) => setDraftForm({ ...draftForm, contractType: e.target.value })}
                    className="nm-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">الطرف الأول *</label>
                  <input
                    type="text"
                    value={draftForm.partyOne}
                    onChange={(e) => setDraftForm({ ...draftForm, partyOne: e.target.value })}
                    placeholder="شركة النخبة القابضة"
                    className="nm-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">الطرف الثاني *</label>
                  <input
                    type="text"
                    value={draftForm.partyTwo}
                    onChange={(e) => setDraftForm({ ...draftForm, partyTwo: e.target.value })}
                    placeholder="مؤسسة الابتكار التقني"
                    className="nm-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">القيمة والعملة</label>
                  <input
                    type="text"
                    value={draftForm.value}
                    onChange={(e) => setDraftForm({ ...draftForm, value: e.target.value })}
                    className="nm-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">القانون الحاكم والاختصاص</label>
                  <input
                    type="text"
                    value={draftForm.jurisdiction}
                    onChange={(e) => setDraftForm({ ...draftForm, jurisdiction: e.target.value })}
                    className="nm-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">الشروط الجوهرية والالتزامات</label>
                <NmVoiceInput
                  multiline
                  rows={3}
                  value={draftForm.keyTerms}
                  onChange={(val) => setDraftForm({ ...draftForm, keyTerms: val })}
                  placeholder="المدة الزمنية، جدول الدفعات، حقوق الملكية الفكرية، آلية الفسخ..."
                />
              </div>
              <div className="flex justify-end gap-2">
                {draftResult && (
                  <NmButton type="button" onClick={() => window.print()}>
                    <Printer className="w-4 h-4" />
                    طباعة العقد
                  </NmButton>
                )}
                <NmButton type="submit" variant="gold" disabled={draftLoading}>
                  {draftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  توليد العقد ثنائي اللغة
                </NmButton>
              </div>
            </form>
          </NmCard>

          {draftResult && (
            <NmCard className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                <div className="text-right">
                  <h2 className="text-xl font-bold text-[#2d3748]">{draftResult.title_ar}</h2>
                  <p className="text-sm text-[#718096] mt-2 leading-relaxed">{draftResult.preamble_ar}</p>
                </div>
                <div className="text-left" dir="ltr">
                  <h2 className="text-xl font-bold text-[#2d3748]">{draftResult.title_en}</h2>
                  <p className="text-sm text-[#718096] mt-2 leading-relaxed">{draftResult.preamble_en}</p>
                </div>
              </div>

              <div className="space-y-4">
                {Array.isArray(draftResult.clauses) &&
                  draftResult.clauses.map((cl: any, idx: number) => (
                    <div key={idx} className="nm-inset p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#4a90d9]">
                          {cl.number} — {cl.law_reference}
                        </span>
                        {cl.negotiability && <StatusBadge status={cl.negotiability} />}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-right space-y-1">
                          <h4 className="font-bold text-[#2d3748]">{cl.heading_ar}</h4>
                          <p className="text-sm text-[#2d3748] leading-relaxed">{cl.body_ar}</p>
                        </div>
                        <div className="text-left space-y-1" dir="ltr">
                          <h4 className="font-bold text-[#2d3748]">{cl.heading_en}</h4>
                          <p className="text-sm text-[#2d3748] leading-relaxed">{cl.body_en}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {draftResult.negotiation_guide && (
                <div className="nm-inset p-4 text-sm text-[#2d3748]">
                  <div className="font-bold text-[#9a7619] mb-1">دليل التفاوض المرفق</div>
                  <p className="leading-relaxed">{draftResult.negotiation_guide}</p>
                </div>
              )}
            </NmCard>
          )}
        </div>
      )}

      {/* TAB 3: CLAUSE LIBRARY */}
      {activeTab === 'clauses' && (
        <div className="space-y-4">
          <NmCard className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
                <input
                  type="text"
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                  placeholder="ابحث في البنود العربية والإنجليزية والمرجع القانوني..."
                  className="nm-input pr-10"
                />
              </div>
              <select
                value={clauseCat}
                onChange={(e) => setClauseCat(e.target.value)}
                className="nm-input"
              >
                {clauseCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </NmCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClauses.map((cl) => (
              <NmCard
                key={cl.id}
                onClick={() => setSelectedClause(cl)}
                className="p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-[#2d3748]">{cl.title_ar}</h3>
                  <StatusBadge status={cl.risk_level} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="nm-badge text-[#4a90d9]">{cl.category}</span>
                  <StatusBadge status={cl.negotiability} />
                </div>
                <p className="text-xs text-[#718096] line-clamp-2">{cl.text_ar}</p>
                <div className="text-[11px] text-[#9a7619]">{cl.law_ref}</div>
              </NmCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPARE */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NmCard className="p-4 space-y-2">
              <label className="block text-sm font-bold text-[#2d3748]">النسخة الأولى (الأصل)</label>
              <textarea
                rows={10}
                value={versionA}
                onChange={(e) => setVersionA(e.target.value)}
                placeholder="الصق نص النسخة الأصلية من العقد..."
                className="nm-input resize-y"
              />
            </NmCard>
            <NmCard className="p-4 space-y-2">
              <label className="block text-sm font-bold text-[#2d3748]">النسخة الثانية (المعدّلة)</label>
              <textarea
                rows={10}
                value={versionB}
                onChange={(e) => setVersionB(e.target.value)}
                placeholder="الصق نص النسخة المعدّلة من الطرف المقابل..."
                className="nm-input resize-y"
              />
            </NmCard>
          </div>
          <div className="flex justify-center">
            <NmButton variant="gold" disabled={compareLoading} onClick={handleCompare}>
              {compareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
              مقارنة النسختين وكشف التناقضات
            </NmButton>
          </div>

          {compareResult && (
            <NmCard className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#2d3748]">ملخص الفروقات القانونية</h3>
                <span className="nm-badge text-[#e67e22] tabular-nums">
                  {compareResult.substantive_changes_count || 0} تعديلات جوهرية
                </span>
              </div>
              <p className="text-sm text-[#2d3748]">{compareResult.summary}</p>
              {Array.isArray(compareResult.internal_contradictions) &&
                compareResult.internal_contradictions.length > 0 && (
                  <div className="nm-inset p-4 space-y-1.5">
                    <div className="text-xs font-bold text-[#e74c3c]">تناقضات داخلية مكتشفة</div>
                    {compareResult.internal_contradictions.map((ic: string, i: number) => (
                      <div key={i} className="text-xs text-[#2d3748] flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#e74c3c] shrink-0" />
                        {ic}
                      </div>
                    ))}
                  </div>
                )}
              <div className="space-y-3">
                {Array.isArray(compareResult.changes) &&
                  compareResult.changes.map((ch: any, idx: number) => (
                    <div key={idx} className="nm-inset p-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ch.type} />
                        <StatusBadge status={ch.category} />
                        <StatusBadge status={ch.impact} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2 nm-raised">
                          <span className="font-bold text-[#e74c3c] block mb-1">الأصل:</span>
                          {ch.original_text}
                        </div>
                        <div className="p-2 nm-raised">
                          <span className="font-bold text-[#27ae60] block mb-1">التعديل:</span>
                          {ch.new_text}
                        </div>
                      </div>
                      <div className="text-xs text-[#2d3748]">
                        <span className="font-bold text-[#4a90d9]">التوصية: </span>
                        {ch.recommendation}
                      </div>
                    </div>
                  ))}
              </div>
            </NmCard>
          )}
        </div>
      )}

      {/* TAB 5: PLAYBOOKS */}
      {activeTab === 'playbooks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(PLAYBOOKS).map((topic) => (
              <NmButton
                key={topic}
                active={playbookFocus === topic}
                onClick={() => setPlaybookFocus(topic)}
              >
                {topic}
              </NmButton>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NmCard className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#27ae60]">الموقف المفضل</span>
                <NmCopyButton text={PLAYBOOKS[playbookFocus].preferred} />
              </div>
              <p className="text-sm text-[#2d3748] leading-relaxed">
                {PLAYBOOKS[playbookFocus].preferred}
              </p>
            </NmCard>
            <NmCard className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#e67e22]">الموقف التفاوضي الوسطي</span>
                <NmCopyButton text={PLAYBOOKS[playbookFocus].fallback} />
              </div>
              <p className="text-sm text-[#2d3748] leading-relaxed">
                {PLAYBOOKS[playbookFocus].fallback}
              </p>
            </NmCard>
            <NmCard className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#e74c3c]">الخط الأحمر (مرفوض)</span>
                <NmCopyButton text={PLAYBOOKS[playbookFocus].redline} />
              </div>
              <p className="text-sm text-[#2d3748] leading-relaxed">
                {PLAYBOOKS[playbookFocus].redline}
              </p>
            </NmCard>
          </div>

          <NmCard className="p-5 space-y-3">
            <h3 className="font-bold text-[#2d3748]">قائمة التحقق قبل جلسة التفاوض</h3>
            <div className="space-y-2">
              {PLAYBOOKS[playbookFocus].checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#2d3748]">
                  <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </NmCard>
        </div>
      )}

      {/* Clause Detail Modal */}
      <NmModal
        open={Boolean(selectedClause)}
        onClose={() => setSelectedClause(null)}
        title={selectedClause?.title_ar || 'تفاصيل البند'}
        maxWidth="max-w-3xl"
      >
        {selectedClause && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedClause.category} />
              <StatusBadge status={selectedClause.risk_level} />
              <StatusBadge status={selectedClause.negotiability} />
            </div>
            <div className="nm-inset p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4a90d9]">الصياغة العربية</span>
                <NmCopyButton text={selectedClause.text_ar} label="نسخ العربية" />
              </div>
              <p className="text-sm text-[#2d3748] leading-relaxed">{selectedClause.text_ar}</p>
            </div>
            <div className="nm-inset p-4 space-y-2" dir="ltr">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4a90d9]">English Clause</span>
                <NmCopyButton text={selectedClause.text_en} label="Copy EN" />
              </div>
              <p className="text-sm text-[#2d3748] leading-relaxed">{selectedClause.text_en}</p>
            </div>
            <div className="text-xs text-[#9a7619] font-bold">المرجع النظامي: {selectedClause.law_ref}</div>
            {selectedClause.alternatives && selectedClause.alternatives.length > 0 && (
              <div className="nm-inset p-4 space-y-2">
                <div className="text-xs font-bold text-[#718096]">صياغات بديلة</div>
                {selectedClause.alternatives.map((alt, i) => (
                  <p key={i} className="text-xs text-[#2d3748]">• {alt}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </NmModal>
    </div>
  );
}
