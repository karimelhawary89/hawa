import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Database, Plus, Sliders, Search, Trash2 } from 'lucide-react';
import ProGate from '../components/ProGate';
import { KnowledgeEntry } from '../types/erp';
import { listEntities, createEntity, deleteEntity, getConfig, saveConfig } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
} from '../components/ui/NeumorphicPrimitives';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function KnowledgeBase() {
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const isSettingsPath = location.pathname.includes('settings');

  const [tab, setTab] = useState<'docs' | 'rag'>(isSettingsPath ? 'rag' : 'docs');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'مذكرات نموذجية',
    jurisdiction: 'السعودية',
    content: '',
    tags: '',
  });

  const [ragConfig, setRagConfig] = useState({
    chunk_size: '800',
    chunk_overlap: '120',
    top_k: '6',
    citation_strictness: 'صارم (ذكر المادة والحكم)',
    include_private_memos: true,
  });

  useEffect(() => {
    setTab(isSettingsPath ? 'rag' : 'docs');
  }, [isSettingsPath]);

  useEffect(() => {
    listEntities<KnowledgeEntry>('knowledge_base').then(setEntries).catch(() => {});
    getConfig<any>('rag_settings')
      .then((cfg) => {
        if (cfg) {
          setRagConfig({
            chunk_size: String(cfg.chunk_size || 800),
            chunk_overlap: String(cfg.chunk_overlap || 120),
            top_k: String(cfg.top_k || 6),
            citation_strictness: cfg.citation_strictness || 'صارم (ذكر المادة والحكم)',
            include_private_memos: Boolean(cfg.include_private_memos ?? true),
          });
        }
      })
      .catch(() => {});
  }, []);

  const filtered = entries.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.toLowerCase().includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('يرجى إدخال العنوان والمحتوى المعرفي');
      return;
    }
    try {
      const created = await createEntity<KnowledgeEntry>('knowledge_base', {
        ...form,
        language: 'العربية',
        is_public: false,
        created_by: user?.name || 'أ. كريم الهواري',
        created_at: new Date().toISOString(),
      });
      setEntries((prev) => [created, ...prev]);
      setCreateOpen(false);
      setForm({ title: '', category: 'مذكرات نموذجية', jurisdiction: 'السعودية', content: '', tags: '' });
      toast.success('تمت إضافة المادة إلى قاعدة المعرفة');
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  const handleSaveRag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveConfig('rag_settings', {
        chunk_size: Number(ragConfig.chunk_size) || 800,
        chunk_overlap: Number(ragConfig.chunk_overlap) || 120,
        top_k: Number(ragConfig.top_k) || 6,
        citation_strictness: ragConfig.citation_strictness,
        include_private_memos: ragConfig.include_private_memos,
      });
      toast.success('تم حفظ إعدادات محرك المعرفة (RAG)');
    } catch {
      toast.error('تعذّر حفظ الإعدادات');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('knowledge_base', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('تم حذف المادة');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <ProGate>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
              <Database className="w-6 h-6 text-[#4a90d9]" />
              قاعدة المعرفة الدلالية (RAG)
            </h1>
            <p className="text-sm text-[#718096]">
              فهرسة مذكرات المكتب والسوابق القضائية وإعدادات الاسترجاع الدلالي لبراءة AI
            </p>
          </div>
          <div className="flex gap-2">
            <NmButton active={tab === 'docs'} onClick={() => setTab('docs')}>
              <Database className="w-4 h-4" />
              الوثائق المفهرسة
            </NmButton>
            <NmButton active={tab === 'rag'} onClick={() => setTab('rag')}>
              <Sliders className="w-4 h-4" />
              إعدادات RAG
            </NmButton>
            {tab === 'docs' && (
              <NmButton variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                إضافة معرفة
              </NmButton>
            )}
          </div>
        </div>

        {tab === 'docs' ? (
          <>
            <NmCard className="p-4">
              <div className="relative">
                <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في قاعدة المعرفة..."
                  className="nm-input pr-10"
                />
              </div>
            </NmCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((entry) => (
                <NmCard key={entry.id} className="p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-[#2d3748]">{entry.title}</h3>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="text-[#718096] hover:text-[#e74c3c]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={entry.category} />
                    <span className="nm-badge text-[#4a90d9]">{entry.jurisdiction}</span>
                  </div>
                  <p className="text-xs text-[#718096] leading-relaxed">{entry.content}</p>
                  <div className="text-[11px] text-[#718096]">
                    بواسطة {entry.created_by} · {toArabicDate(entry.created_at)}
                  </div>
                </NmCard>
              ))}
            </div>
          </>
        ) : (
          <NmCard className="p-6 max-w-2xl">
            <form onSubmit={handleSaveRag} className="space-y-4">
              <h2 className="text-lg font-bold text-[#2d3748]">إعدادات التقطيع والاسترجاع الدلالي (RAG)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">حجم المقطع (Chunk Size)</label>
                  <input
                    type="text"
                    value={ragConfig.chunk_size}
                    onChange={(e) => setRagConfig({ ...ragConfig, chunk_size: e.target.value })}
                    className="nm-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">التداخل (Overlap)</label>
                  <input
                    type="text"
                    value={ragConfig.chunk_overlap}
                    onChange={(e) => setRagConfig({ ...ragConfig, chunk_overlap: e.target.value })}
                    className="nm-input tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#718096] mb-1">أفضل النتائج (Top-K)</label>
                  <input
                    type="text"
                    value={ragConfig.top_k}
                    onChange={(e) => setRagConfig({ ...ragConfig, top_k: e.target.value })}
                    className="nm-input tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">مستوى صرامة الاستشهاد</label>
                <select
                  value={ragConfig.citation_strictness}
                  onChange={(e) => setRagConfig({ ...ragConfig, citation_strictness: e.target.value })}
                  className="nm-input"
                >
                  <option value="صارم (ذكر المادة والحكم)">صارم (ذكر المادة والحكم)</option>
                  <option value="متوازن">متوازن</option>
                  <option value="استرشادي مرن">استرشادي مرن</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ragConfig.include_private_memos}
                  onChange={(e) =>
                    setRagConfig({ ...ragConfig, include_private_memos: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#4a90d9]"
                />
                تضمين مذكرات المكتب الداخلية في إجابات براءة AI
              </label>
              <NmButton type="submit" variant="primary">حفظ إعدادات RAG</NmButton>
            </form>
          </NmCard>
        )}

        <NmModal open={createOpen} onClose={() => setCreateOpen(false)} title="إضافة مادة إلى قاعدة المعرفة">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">العنوان *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="nm-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">التصنيف</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="nm-input"
                >
                  <option value="مذكرات نموذجية">مذكرات نموذجية</option>
                  <option value="سوابق نقض">سوابق نقض</option>
                  <option value="أنظمة ولوائح">أنظمة ولوائح</option>
                  <option value="قوالب عقود">قوالب عقود</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">الاختصاص</label>
                <select
                  value={form.jurisdiction}
                  onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                  className="nm-input"
                >
                  <option value="السعودية">السعودية</option>
                  <option value="مصر">مصر</option>
                  <option value="الإمارات">الإمارات</option>
                  <option value="مشترك">مشترك</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">النص القانوني *</label>
              <NmVoiceInput
                multiline
                rows={4}
                value={form.content}
                onChange={(val) => setForm({ ...form, content: val })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الوسوم</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="تجاري، تعويض، نقض"
                className="nm-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
              <NmButton type="submit" variant="primary">حفظ في قاعدة المعرفة</NmButton>
            </div>
          </form>
        </NmModal>
      </div>
    </ProGate>
  );
}
