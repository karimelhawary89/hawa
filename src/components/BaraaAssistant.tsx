import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { NmVoiceInput } from './ui/NeumorphicPrimitives';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function BaraaAssistant({
  externalOpen,
  onExternalClose,
}: {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك في نظام براءة القانوني. كيف يمكنني مساعدتك اليوم في القضايا أو العقود أو البحث القانوني؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalOpen) setIsOpen(true);
  }, [externalOpen]);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!user) return null;

  const closeDrawer = () => {
    setIsOpen(false);
    onExternalClose?.();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const custom = localStorage.getItem('baraa_ai_custom_instructions') || '';
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await apiRequest<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history,
          systemCustom: custom,
        }),
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: err?.message || 'تعذّر الوصول لبراءة — يرجى المحاولة لاحقاً',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="فتح مساعد براءة"
          className="fixed bottom-6 left-6 z-40 nm-icon-btn w-14 h-14 flex items-center justify-center text-[#c9a84c] hover:scale-105 transition-transform no-print"
        >
          <Bot className="w-7 h-7" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] nm-modal flex flex-col overflow-hidden no-print">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="nm-raised-sm w-9 h-9 rounded-full flex items-center justify-center text-[#c9a84c]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#2d3748]">المساعد التنفيذي براءة</p>
                <p className="text-[11px] text-[#27ae60] font-semibold">جاهز للمساعدة القانونية</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome',
                      role: 'assistant',
                      content: 'تم مسح المحادثة. كيف يمكنني مساعدتك الآن؟',
                    },
                  ])
                }
                className="nm-icon-btn w-8 h-8 flex items-center justify-center text-[#718096]"
                title="مسح المحادثة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="nm-icon-btn w-8 h-8 flex items-center justify-center text-[#718096] hover:text-[#e74c3c]"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'nm-pressed text-[#2d3748]'
                      : 'nm-raised-sm text-[#2d3748]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-end">
                <div className="nm-raised-sm px-4 py-2 text-xs text-[#718096]">
                  جاري التفكير والتحليل القانوني...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 flex items-center gap-2"
          >
            <NmVoiceInput
              value={input}
              onChange={setInput}
              placeholder="اكتب سؤالك أو أمرك القانوني..."
              className="flex-1"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="nm-icon-btn w-10 h-10 flex items-center justify-center text-[#4a90d9] shrink-0"
              title="إرسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
