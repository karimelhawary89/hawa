import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Bot,
  Gavel,
  Play,
  Printer,
  CheckCircle2,
  Send,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { getEntity, listEntities, apiRequest } from '../lib/api';
import { Matter, Client, TaskItem, Hearing, LegalDocument } from '../types/erp';
import { toArabicDate, toArabicDateTime, daysUntil } from '../utils/dateUtils';
import { formatSAR } from '../utils/currencyUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NmCard, NmButton, StatusBadge, NmVoiceInput } from '../components/ui/NeumorphicPrimitives';

const PROCEDURAL_STAGES = [
  { key: 'افتتاح', label: '1. قيد الدعوى والإعلان' },
  { key: 'إجراءات أولية', label: '2. الجلسة الأولى والتوكيل' },
  { key: 'قيد التقاضي', label: '3. تبادل المذكرات والبينات' },
  { key: 'تحكيم', label: '4. مرحلة الخبرة / التحكيم' },
  { key: 'صدر حكم', label: '5. المرافعة والحكم' },
  { key: 'تنفيذ', label: '6. الطعن والتنفيذ' },
];

export default function MatterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { startTimer, activeTimer } = useAuth();

  const [matter, setMatter] = useState<Matter | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'ai_strategy' | 'chat' | 'moot'>('overview');

  // AI Strategy (BUG-05: NO fake defaults — stays empty until user clicks button!)
  const [analyzing, setAnalyzing] = useState(false);

  // Case AI Chat
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  // Moot Court Simulator
  const [mootScenario, setMootScenario] = useState('جلسة مرافعة تجارية — إخلال تعاقدي');
  const [mootInput, setMootInput] = useState('');
  const [mootLoading, setMootLoading] = useState(false);
  const [mootRounds, setMootRounds] = useState<
    Array<{
      argument: string;
      strength: string;
      score: number;
      opposing: string;
      judge: string;
      tip: string;
    }>
  >([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getEntity<Matter>('matters', id),
      listEntities<Client>('clients'),
      listEntities<TaskItem>('tasks'),
      listEntities<Hearing>('hearings'),
      listEntities<LegalDocument>('documents'),
    ])
      .then(([m, cls, tks, hrs, dcs]) => {
        setMatter(m);
        setClient(cls.find((c) => c.id === m.client_id) || null);
        setTasks(tks.filter((t) => t.matter_id === id));
        setHearings(hrs.filter((h) => h.matter_id === id));
        setDocs(dcs.filter((d) => d.matter_id === id));
      })
      .catch(() => toast.error('تعذّر تحميل بيانات القضية'))
      .finally(() => setLoading(false));
  }, [id]);

  // BUG-05: Only runs when clicked
  const handleRunAnalysis = async () => {
    if (!matter || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await apiRequest<{ matter: Matter }>(`/api/ai/analyze-matter/${matter.id}`, {
        method: 'POST',
      });
      setMatter(res.matter);
      toast.success('اكتمل التحليل الاستراتيجي لبراءة');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendCaseChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matter || !chatInput.trim() || chatSending) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatHistory((p) => [...p, { role: 'user', content: msg }]);
    setChatSending(true);
    try {
      const res = await apiRequest<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: msg,
          history: chatHistory,
          matterId: matter.id,
        }),
      });
      setChatHistory((p) => [...p, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً');
    } finally {
      setChatSending(false);
    }
  };

  const handleRunMoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matter || !mootInput.trim() || mootLoading) return;
    const arg = mootInput.trim();
    setMootInput('');
    setMootLoading(true);
    try {
      const hist = mootRounds.flatMap((r) => [
        { speaker: 'المحامي', text: r.argument },
        { speaker: 'الخصم', text: r.opposing },
        { speaker: 'القاضي', text: r.judge },
      ]);
      const res = await apiRequest<{
        argument_strength: string;
        strength_score: number;
        opposing_counsel_reply: string;
        judge_question: string;
        coaching_tip: string;
      }>('/api/ai/moot-court', {
        method: 'POST',
        body: JSON.stringify({
          matterId: matter.id,
          scenario: mootScenario,
          argument: arg,
          history: hist,
        }),
      });
      setMootRounds((p) => [
        ...p,
        {
          argument: arg,
          strength: res.argument_strength,
          score: res.strength_score,
          opposing: res.opposing_counsel_reply,
          judge: res.judge_question,
          tip: res.coaching_tip,
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً');
    } finally {
      setMootLoading(false);
    }
  };

  if (loading) {
    return <NmCard className="p-10 text-center text-sm text-[#718096]">جاري تحميل ملف القضية...</NmCard>;
  }
  if (!matter) {
    return (
      <NmCard className="p-10 text-center space-y-4">
        <p className="text-base font-bold text-[#2d3748]">القضية غير موجودة</p>
        <NmButton onClick={() => navigate('/matters')}>العودة للقضايا</NmButton>
      </NmCard>
    );
  }

  const limDays = daysUntil(matter.statute_of_limitations_date);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <NmButton onClick={() => navigate('/matters')}>
          <ArrowRight className="w-4 h-4" />
          العودة للقضايا
        </NmButton>
        <div className="flex flex-wrap gap-2">
          <NmButton
            variant="gold"
            onClick={() => {
              startTimer(matter.id, matter.case_number);
              toast.success(`بدأ تسجيل الوقت للقضية ${matter.case_number}`);
            }}
            disabled={activeTimer?.matterId === matter.id}
          >
            <Play className="w-4 h-4" />
            {activeTimer?.matterId === matter.id ? 'المؤقت يعمل...' : 'بدء مؤقت العمل'}
          </NmButton>
          <NmButton onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            طباعة ملف القضية
          </NmButton>
        </div>
      </div>

      {/* Header Summary */}
      <NmCard className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold text-[#4a90d9] tabular-nums">{matter.case_number}</span>
              <StatusBadge status={matter.status} />
              <StatusBadge status={matter.priority} />
            </div>
            <h1 className="text-2xl font-extrabold text-[#2d3748]">{matter.title}</h1>
            <p className="text-xs text-[#718096]">
              العميل: <span className="font-bold text-[#2d3748]">{client?.name || 'غير محدد'}</span> · المحكمة: {matter.court_or_authority} · المسؤول: {matter.lead_lawyer}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="nm-inset px-4 py-2.5">
              <p className="text-[11px] text-[#718096]">قيمة المطالبة</p>
              <p className="text-sm font-extrabold text-[#2d3748] tabular-nums">{formatSAR(matter.case_value)}</p>
            </div>
            <div className="nm-inset px-4 py-2.5">
              <p className="text-[11px] text-[#718096]">الأتعاب المتفق عليها</p>
              <p className="text-sm font-extrabold text-[#c9a84c] tabular-nums">{formatSAR(matter.agreed_fees)}</p>
            </div>
          </div>
        </div>

        {/* Litigation Procedural Roadmap */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#718096]">خارطة الإجراءات القضائية</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PROCEDURAL_STAGES.map((st) => {
              const current = matter.stage === st.key;
              return (
                <div
                  key={st.key}
                  className={`p-2.5 rounded-lg text-xs font-bold text-center ${
                    current ? 'nm-pressed text-[#4a90d9]' : 'nm-raised-sm text-[#718096]'
                  }`}
                >
                  {st.label}
                </div>
              );
            })}
          </div>
        </div>

        {limDays !== null && (
          <div className="nm-inset px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-[#2d3748] flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${limDays <= 30 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`} />
              متابعة التقادم وسقوط الحق: {toArabicDate(matter.statute_of_limitations_date)}
            </span>
            <span className={`font-extrabold tabular-nums ${limDays <= 30 ? 'text-[#e74c3c]' : 'text-[#27ae60]'}`}>
              متبقي {limDays} يوماً
            </span>
          </div>
        )}
      </NmCard>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 no-print">
        <NmButton active={tab === 'overview'} variant={tab === 'overview' ? 'primary' : 'default'} onClick={() => setTab('overview')}>
          ملف القضية والجلسات
        </NmButton>
        <NmButton active={tab === 'ai_strategy'} variant={tab === 'ai_strategy' ? 'gold' : 'default'} onClick={() => setTab('ai_strategy')}>
          <Sparkles className="w-4 h-4" />
          التحليل الاستراتيجي و SWOT
        </NmButton>
        <NmButton active={tab === 'chat'} variant={tab === 'chat' ? 'primary' : 'default'} onClick={() => setTab('chat')}>
          <Bot className="w-4 h-4" />
          محادثة القضية مع براءة
        </NmButton>
        <NmButton active={tab === 'moot'} variant={tab === 'moot' ? 'primary' : 'default'} onClick={() => setTab('moot')}>
          <Gavel className="w-4 h-4" />
          محاكاة الجلسة القضائية
        </NmButton>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NmCard className="space-y-3">
            <h3 className="text-base font-bold text-[#2d3748]">الجلسات ({hearings.length})</h3>
            {hearings.length === 0 ? (
              <p className="text-xs text-[#718096]">لا توجد جلسات مسجلة</p>
            ) : (
              hearings.map((h) => (
                <div key={h.id} className="nm-inset p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#2d3748]">{h.title}</p>
                    <StatusBadge status={h.status} />
                  </div>
                  <p className="text-xs text-[#718096]">{toArabicDateTime(h.hearing_date)}</p>
                  <p className="text-xs text-[#718096]">{h.location}</p>
                </div>
              ))
            )}
          </NmCard>

          <NmCard className="space-y-3">
            <h3 className="text-base font-bold text-[#2d3748]">المهام ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <p className="text-xs text-[#718096]">لا توجد مهام مسجلة</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="nm-inset p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#2d3748]">{t.title}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-[#718096]">الموعد: {toArabicDate(t.due_date)} · {t.assigned_to}</p>
                </div>
              ))
            )}
          </NmCard>

          <NmCard className="space-y-3">
            <h3 className="text-base font-bold text-[#2d3748]">المستندات ({docs.length})</h3>
            {docs.length === 0 ? (
              <p className="text-xs text-[#718096]">لا توجد مستندات مرتبطة</p>
            ) : (
              docs.map((d) => (
                <div key={d.id} onClick={() => navigate('/documents')} className="nm-inset p-3 cursor-pointer space-y-1">
                  <p className="text-sm font-bold text-[#2d3748]">{d.title}</p>
                  <p className="text-xs text-[#718096]">{d.document_type} · {d.version_number}</p>
                </div>
              ))
            )}
          </NmCard>
        </div>
      )}

      {/* BUG-05 Compliant AI Panel */}
      {tab === 'ai_strategy' && (
        <NmCard className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#2d3748]">التحليل الاستراتيجي وتوقع النتيجة (SWOT)</h2>
              <p className="text-xs text-[#718096]">
                لا يعرض هذا القسم قيماً افتراضية؛ يتم توليد التقييم الحقيقي من معطيات القضية عند الضغط على تشغيل التحليل.
              </p>
            </div>
            <NmButton variant="gold" onClick={handleRunAnalysis} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'جاري التحليل...' : 'تشغيل التحليل'}
            </NmButton>
          </div>

          {matter.ai_success_probability === undefined ? (
            <div className="nm-inset p-10 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-[#c9a84c] mx-auto" />
              <p className="text-sm font-bold text-[#2d3748]">لوحة التحليل جاهزة للتشغيل</p>
              <p className="text-xs text-[#718096]">اضغط على زر «تشغيل التحليل» للحصول على نسبة الاحتمال، مستوى المخاطر، وخطة المرافعة.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="nm-inset p-4 text-center">
                  <p className="text-xs text-[#718096]">احتمال النجاح المقدر</p>
                  <p className="text-3xl font-extrabold text-[#27ae60] tabular-nums mt-1">
                    %{matter.ai_success_probability}
                  </p>
                </div>
                <div className="nm-inset p-4 text-center">
                  <p className="text-xs text-[#718096]">مستوى المخاطر</p>
                  <div className="mt-2">
                    <StatusBadge status={matter.ai_risk_level || 'متوسط'} />
                  </div>
                </div>
                <div className="nm-inset p-4 text-center">
                  <p className="text-xs text-[#718096]">المدة المتوقعة المتبقية</p>
                  <p className="text-2xl font-extrabold text-[#4a90d9] tabular-nums mt-1">
                    {matter.ai_estimated_duration_days} يوماً
                  </p>
                </div>
              </div>

              {matter.ai_strategy_notes && (
                <div className="nm-inset p-4 space-y-2">
                  <p className="text-sm font-bold text-[#4a90d9]">التوصية الاستراتيجية</p>
                  <p className="text-sm text-[#2d3748] leading-relaxed whitespace-pre-wrap">{matter.ai_strategy_notes}</p>
                </div>
              )}

              {matter.ai_swot && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="nm-inset p-4 space-y-2">
                    <p className="text-sm font-bold text-[#27ae60]">نقاط القوة</p>
                    <ul className="space-y-1 text-xs text-[#2d3748]">
                      {(matter.ai_swot.strengths || []).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#27ae60] shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="nm-inset p-4 space-y-2">
                    <p className="text-sm font-bold text-[#e67e22]">نقاط الضعف</p>
                    <ul className="space-y-1 text-xs text-[#2d3748]">
                      {(matter.ai_swot.weaknesses || []).map((s, idx) => (
                        <li key={idx}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="nm-inset p-4 space-y-2">
                    <p className="text-sm font-bold text-[#4a90d9]">الفرص</p>
                    <ul className="space-y-1 text-xs text-[#2d3748]">
                      {(matter.ai_swot.opportunities || []).map((s, idx) => (
                        <li key={idx}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="nm-inset p-4 space-y-2">
                    <p className="text-sm font-bold text-[#e74c3c]">التهديدات</p>
                    <ul className="space-y-1 text-xs text-[#2d3748]">
                      {(matter.ai_swot.threats || []).map((s, idx) => (
                        <li key={idx}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </NmCard>
      )}

      {tab === 'chat' && (
        <NmCard className="space-y-4">
          <h2 className="text-base font-bold text-[#2d3748]">محادثة ذكية مخصصة لملف القضية {matter.case_number}</h2>
          <div className="nm-inset p-4 h-80 overflow-y-auto space-y-3">
            {chatHistory.length === 0 && (
              <p className="text-xs text-[#718096] text-center py-12">
                اسأل براءة عن الجلسات، المهام المعلقة، الفواتير، أو اطلب مسودة رد قانوني مستندة لبيانات هذه القضية.
              </p>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'nm-pressed' : 'nm-raised-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatSending && <p className="text-xs text-[#718096]">جاري صياغة الرد القانوني...</p>}
          </div>
          <form onSubmit={handleSendCaseChat} className="flex gap-2">
            <NmVoiceInput
              value={chatInput}
              onChange={setChatInput}
              placeholder="اسأل براءة حول هذه القضية..."
              className="flex-1"
            />
            <NmButton type="submit" variant="primary" disabled={chatSending || !chatInput.trim()}>
              <Send className="w-4 h-4" />
              إرسال
            </NmButton>
          </form>
        </NmCard>
      )}

      {tab === 'moot' && (
        <NmCard className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#2d3748]">محاكي الجلسة القضائية بالذكاء الاصطناعي</h2>
              <p className="text-xs text-[#718096]">قدّم مرافعتك أمام قاضٍ افتراضي ومحامي خصم واحصل على قياس قوة الحجة</p>
            </div>
            <select
              value={mootScenario}
              onChange={(e) => setMootScenario(e.target.value)}
              className="nm-input max-w-xs"
            >
              <option value="جلسة مرافعة تجارية — إخلال تعاقدي">جلسة مرافعة تجارية — إخلال تعاقدي</option>
              <option value="جلسة تحكيم CRCICA — مناقشة الخبير">جلسة تحكيم CRCICA — مناقشة الخبير</option>
              <option value="دعوى عمالية — فصل تعسفي">دعوى عمالية — فصل تعسفي</option>
              <option value="جلسة استئناف — طعن في الحكم الابتدائي">جلسة استئناف — طعن في الحكم الابتدائي</option>
            </select>
          </div>

          <div className="space-y-4">
            {mootRounds.map((r, idx) => (
              <div key={idx} className="nm-inset p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4a90d9]">الجولة {idx + 1} — مرافعتك</span>
                  <span className={`nm-badge tabular-nums ${r.score >= 70 ? 'text-[#27ae60]' : r.score >= 45 ? 'text-[#e67e22]' : 'text-[#e74c3c]'}`}>
                    قوة الحجة: {r.strength} (%{r.score})
                  </span>
                </div>
                <p className="text-sm text-[#2d3748]">{r.argument}</p>
                <div className="nm-raised-sm p-3 space-y-1">
                  <p className="text-xs font-bold text-[#e74c3c]">دفع محامي الخصم:</p>
                  <p className="text-xs text-[#2d3748]">{r.opposing}</p>
                </div>
                <div className="nm-raised-sm p-3 space-y-1">
                  <p className="text-xs font-bold text-[#c9a84c]">سؤال القاضي:</p>
                  <p className="text-xs text-[#2d3748]">{r.judge}</p>
                </div>
                <p className="text-xs text-[#27ae60] font-semibold">توجيه تدريبي: {r.tip}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleRunMoot} className="space-y-3">
            <NmVoiceInput
              multiline
              rows={3}
              value={mootInput}
              onChange={setMootInput}
              placeholder="اكتب أو أملِ مرافعتك أو ردك على سؤال القاضي..."
            />
            <NmButton type="submit" variant="gold" disabled={mootLoading || !mootInput.trim()}>
              {mootLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              {mootLoading ? 'جاري محاكاة الجلسة...' : 'تقديم المرافعة'}
            </NmButton>
          </form>
        </NmCard>
      )}
    </div>
  );
}
