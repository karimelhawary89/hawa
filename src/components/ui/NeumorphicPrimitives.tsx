import React, { useState, useRef } from 'react';
import { Mic, MicOff, Copy, Check, X, Loader2 } from 'lucide-react';
import { addDaysISO, toDateInputValue } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

export function NmCard({
  children,
  className = '',
  onClick,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`nm-card ${onClick ? 'cursor-pointer hover:translate-y-[-1px] transition-transform duration-150' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function NmButton({
  children,
  variant = 'default',
  active = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'gold' | 'danger' | 'success' | 'ghost';
  active?: boolean;
}) {
  const variantText: Record<string, string> = {
    default: 'text-[#2d3748]',
    primary: 'text-[#4a90d9]',
    gold: 'text-[#9a7619]',
    danger: 'text-[#e74c3c]',
    success: 'text-[#27ae60]',
    ghost: 'text-[#718096] shadow-none bg-transparent',
  };
  return (
    <button
      {...props}
      className={`${variant === 'ghost' ? 'bg-transparent border-0 cursor-pointer' : 'nm-btn'} ${
        active ? 'nm-btn-active' : ''
      } px-4 py-2 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${variantText[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const s = (status || '').trim();
  let colorClass = 'text-[#718096]';
  if (['نشط', 'مفتوح', 'مدفوعة', 'مكتمل', 'مكتملة', 'مستوفٍ', 'متصل', 'لا يوجد تعارض', 'آمن', 'قوية', 'منشور'].includes(s)) {
    colorClass = 'text-[#27ae60]';
  } else if (['معلق', 'جارية', 'قادم', 'قيد المراجعة', 'مدفوعة جزئياً', 'بانتظار العميل', 'بانتظار الموافقة', 'تعارض محتمل', 'متوسط', 'مخاطر متوسطة'].includes(s)) {
    colorClass = 'text-[#e67e22]';
  } else if (['عاجل', 'عاجلة', 'متأخر', 'متأخرة', 'غير مستوفٍ', 'تعارض مؤكد', 'عالٍ', 'مخاطر عالية', 'حرج', 'ملغى'].includes(s)) {
    colorClass = 'text-[#e74c3c]';
  } else if (['PRO', 'مميز', 'براءة', 'AI'].includes(s)) {
    colorClass = 'text-[#c9a84c]';
  } else if (['جديد', 'تم التواصل', 'مجدولة', 'مُرسَلة'].includes(s)) {
    colorClass = 'text-[#4a90d9]';
  }
  return <span className={`nm-badge ${colorClass} ${className}`}>{status}</span>;
}

export function NmVoiceInput({
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  className = '',
  id,
  name,
  disabled,
}: {
  value: string;
  onChange: (nextVal: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const toast = useToast();

  const toggleVoice = async () => {
    if (disabled || transcribing) return;

    // 1. Try Web Speech API first if available for instant Arabic (ar-EG)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec && !recording) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'ar-EG';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        setRecording(true);
        rec.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript || '';
          if (transcript) {
            onChange(value ? `${value} ${transcript}` : transcript);
            toast.success('تم تحويل الصوت إلى نص');
          }
          setRecording(false);
        };
        rec.onerror = () => {
          setRecording(false);
        };
        rec.onend = () => setRecording(false);
        rec.start();
        return;
      } catch {
        setRecording(false);
      }
    }

    // 2. Fallback: MediaRecorder -> /api/ai/transcribe (Gemini 3.5 Transcribe)
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          setTranscribing(true);
          try {
            const reader = new FileReader();
            const base64: string = await new Promise((resolve, reject) => {
              reader.onload = () => {
                const res = String(reader.result || '');
                resolve(res.split(',')[1] || '');
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            const resp = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64Audio: base64, mimeType: blob.type }),
            });
            const data = await resp.json();
            if (data.text) {
              onChange(value ? `${value} ${data.text}` : data.text);
              toast.success('تم تفريغ الصوت بنجاح');
            } else {
              toast.error(data.error || 'تعذّر تفريغ الصوت');
            }
          } catch {
            toast.error('تعذّر الوصول لخدمة التفريغ الصوتي');
          } finally {
            setTranscribing(false);
          }
        };
        mediaRecorderRef.current = mr;
        mr.start();
        setRecording(true);
      } catch {
        toast.warning('يرجى السماح بالوصول للميكروفون من إعدادات المتصفح');
      }
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  };

  return (
    <div className={`relative flex items-start gap-2 ${className}`}>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="nm-input pl-11 resize-y"
        />
      ) : (
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="nm-input pl-11"
        />
      )}
      <button
        type="button"
        onClick={toggleVoice}
        title={recording ? 'إيقاف التسجيل' : 'إدخال صوتي بالعربية'}
        className={`nm-icon-btn w-8 h-8 flex items-center justify-center absolute left-2 top-2 ${
          recording ? 'text-[#e74c3c]' : 'text-[#718096] hover:text-[#4a90d9]'
        }`}
      >
        {transcribing ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#4a90d9]" />
        ) : recording ? (
          <MicOff className="w-4 h-4 animate-pulse" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export function NmCopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم النسخ');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="nm-btn px-2.5 py-1 text-xs text-[#718096] hover:text-[#4a90d9] inline-flex items-center gap-1"
      title="نسخ"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#27ae60]" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{label}</span>}
    </button>
  );
}

export function NmDateShortcuts({ onSelect }: { onSelect: (dateVal: string) => void }) {
  const shortcuts = [
    { label: 'اليوم', days: 0 },
    { label: 'غداً', days: 1 },
    { label: 'بعد أسبوع', days: 7 },
    { label: 'بعد شهر', days: 30 },
    { label: 'بعد 3 أشهر', days: 90 },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {shortcuts.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onSelect(toDateInputValue(addDaysISO(s.days)))}
          className="nm-btn px-2 py-1 text-[11px] text-[#718096] hover:text-[#4a90d9]"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function NmModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d3748]/35 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`nm-modal w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-[#2d3748]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="nm-icon-btn w-9 h-9 flex items-center justify-center text-[#718096] hover:text-[#e74c3c]"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function NmDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#2d3748]/30 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="nm-modal w-full max-w-[480px] h-full rounded-none flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-bold text-[#2d3748]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="nm-icon-btn w-9 h-9 flex items-center justify-center text-[#718096] hover:text-[#e74c3c]"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
