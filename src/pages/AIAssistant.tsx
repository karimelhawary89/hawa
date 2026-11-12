import React, { useEffect, useState } from 'react';
import { Sparkles, Send, Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { Matter } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity, apiRequest } from '../lib/api';
import { NmCard, NmButton, NmVoiceInput, NmCopyButton } from '../components/ui/NeumorphicPrimitives';
import { toArabicDateTime } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

interface AIConversation {
  id: string;
  title: string;
  matter_id?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; ts?: string }>;
  updated_at: string;
}

export default function AIAssistant() {
  const toast = useToast();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      listEntities<AIConversation>('ai_conversations'),
      listEntities<Matter>('matters'),
    ])
      .then(([convs, mList]) => {
        setConversations(convs);
        setMatters(mList);
        if (convs[0]) {
          setActiveId(convs[0].id);
          setSelectedMatterId(convs[0].matter_id || '');
        }
      })
      .catch(() => {});
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  const startNewChat = async () => {
    try {
      const created = await createEntity<AIConversation>('ai_conversations', {
        title: 'محادثة قانونية جديدة',
        matter_id: selectedMatterId || undefined,
        messages: [
          {
            role: 'assistant',
            content:
              'أهلاً بك في المساعد التنفيذي براءة. يمكنك سؤالي عن أي مسألة قانونية مصرية أو سعودية أو ربط المحادثة بملف قضية محددة.',
            ts: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString(),
      });
      setConversations((prev) => [created, ...prev]);
      setActiveId(created.id);
    } catch {
      toast.error('تعذّر إنشاء محادثة جديدة');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    let targetConv = activeConv;
    if (!targetConv) {
      targetConv = await createEntity<AIConversation>('ai_conversations', {
        title: text.slice(0, 40),
        matter_id: selectedMatterId || undefined,
        messages: [],
        updated_at: new Date().toISOString(),
      });
      setConversations((prev) => [targetConv!, ...prev]);
      setActiveId(targetConv.id);
    }

    const userMsg = { role: 'user' as const, content: text, ts: new Date().toISOString() };
    const nextMessages = [...(targetConv.messages || []), userMsg];
    setConversations((prev) =>
      prev.map((c) => (c.id === targetConv!.id ? { ...c, messages: nextMessages } : c))
    );

    try {
      const res = await apiRequest<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: targetConv.messages || [],
          matterId: selectedMatterId || targetConv.matter_id || undefined,
        }),
      });
      const aiMsg = {
        role: 'assistant' as const,
        content: res.reply,
        ts: new Date().toISOString(),
      };
      const updatedMsgs = [...nextMessages, aiMsg];
      const nextTitle =
        targetConv.title === 'محادثة قانونية جديدة' ? text.slice(0, 42) : targetConv.title;

      const updated = await updateEntity<AIConversation>('ai_conversations', targetConv.id, {
        title: nextTitle,
        matter_id: selectedMatterId || undefined,
        messages: updatedMsgs,
        updated_at: new Date().toISOString(),
      });
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر الوصول لبراءة');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await deleteEntity('ai_conversations', id);
      const rest = conversations.filter((c) => c.id !== id);
      setConversations(rest);
      if (activeId === id) setActiveId(rest[0]?.id || null);
      toast.success('تم حذف المحادثة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#c9a84c]" />
            براءة — المساعد القانوني التنفيذي
          </h1>
          <p className="text-sm text-[#718096]">
            محادثات قانونية محفوظة ومدعومة بسياق القضايا الفعلية والأحكام العربية
          </p>
        </div>
        <NmButton variant="gold" onClick={startNewChat}>
          <Plus className="w-4 h-4" />
          محادثة جديدة
        </NmButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Conversations Sidebar */}
        <NmCard className="lg:col-span-4 p-4 space-y-3 max-h-[72vh] overflow-y-auto">
          <div className="text-xs font-bold text-[#718096]">سجل المحادثات ({conversations.length})</div>
          {conversations.length === 0 ? (
            <div className="text-xs text-[#718096] py-6 text-center">لا توجد محادثات سابقة</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setActiveId(c.id);
                  setSelectedMatterId(c.matter_id || '');
                }}
                className={`p-3 rounded-xl cursor-pointer flex items-start justify-between gap-2 transition-all ${
                  activeId === c.id ? 'nm-pressed' : 'nm-raised'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#2d3748] truncate flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#4a90d9] shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    {toArabicDateTime(c.updated_at)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConv(c.id);
                  }}
                  className="text-[#718096] hover:text-[#e74c3c]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </NmCard>

        {/* Chat Area */}
        <NmCard className="lg:col-span-8 p-5 flex flex-col h-[72vh]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <span className="text-sm font-bold text-[#2d3748]">
              {activeConv?.title || 'محادثة مباشرة مع براءة'}
            </span>
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="nm-input w-full sm:w-72 text-xs"
            >
              <option value="">السياق العام للمكتب</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  ربط بقضية: {m.case_number} — {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="nm-inset flex-1 p-4 overflow-y-auto space-y-3">
            {(!activeConv || activeConv.messages.length === 0) && (
              <div className="text-center text-sm text-[#718096] py-12">
                ابدأ بكتابة أو إملاء سؤالك القانوني أدناه...
              </div>
            )}
            {activeConv?.messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl max-w-[88%] ${
                  m.role === 'user'
                    ? 'nm-raised mr-auto text-[#2d3748]'
                    : 'nm-raised ml-auto text-[#2d3748]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[11px] font-bold ${
                      m.role === 'user' ? 'text-[#4a90d9]' : 'text-[#9a7619]'
                    }`}
                  >
                    {m.role === 'user' ? 'أنت' : 'براءة AI'}
                  </span>
                  {m.role === 'assistant' && <NmCopyButton text={m.content} />}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
            ))}
            {sending && (
              <div className="nm-raised p-3 max-w-xs flex items-center gap-2 text-xs text-[#4a90d9]">
                <Loader2 className="w-4 h-4 animate-spin" />
                براءة تراجع السياق والأنظمة الآن...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="pt-3 flex items-end gap-2">
            <div className="flex-1">
              <NmVoiceInput
                multiline
                rows={2}
                value={input}
                onChange={setInput}
                placeholder="اكتب استشارتك القانونية أو اطلب صياغة مذكرة..."
              />
            </div>
            <NmButton type="submit" variant="primary" disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
              إرسال
            </NmButton>
          </form>
        </NmCard>
      </div>
    </div>
  );
}
