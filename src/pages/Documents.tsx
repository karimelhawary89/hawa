import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Printer,
  Trash2,
  Upload,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { LegalDocument, Matter, Client } from '../types/erp';
import { listEntities, createEntity, deleteEntity } from '../lib/api';
import {
  NmCard,
  NmButton,
  StatusBadge,
  NmModal,
  NmVoiceInput,
  NmCopyButton,
} from '../components/ui/NeumorphicPrimitives';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

async function computeSha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function Documents() {
  const { id: routeDocId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');

  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCodeQuery, setVerifyCodeQuery] = useState('');
  const [verifyResult, setVerifyResult] = useState<LegalDocument | null | 'not_found'>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    matter_id: '',
    client_id: '',
    document_type: 'مذكرة',
    status: 'معتمد',
    confidentiality: 'سري',
    version_number: '1.0',
    source_type: 'إدخال يدوي',
    content_text: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dList, mList, cList] = await Promise.all([
        listEntities<LegalDocument>('documents'),
        listEntities<Matter>('matters'),
        listEntities<Client>('clients'),
      ]);
      setDocs(dList);
      setMatters(mList);
      setClients(cList);
      if (routeDocId) {
        const target = dList.find((d) => d.id === routeDocId);
        if (target) setSelectedDoc(target);
      }
    } catch {
      toast.error('تعذّر تحميل المستندات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [routeDocId]);

  const matterMap = useMemo(() => {
    const map: Record<string, Matter> = {};
    matters.forEach((m) => (map[m.id] = m));
    return map;
  }, [matters]);

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach((c) => (map[c.id] = c));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (typeFilter !== 'الكل' && d.document_type !== typeFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.verify_code || '').toLowerCase().includes(q) ||
        (d.content_text || '').toLowerCase().includes(q)
      );
    });
  }, [docs, search, typeFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
        source_type: 'رفع ملف',
        content_text: text.slice(0, 12000),
      }));
      toast.success('تم استيراد محتوى الملف وتوثيق بصمته');
    } catch {
      toast.error('تعذّر قراءة الملف');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('يرجى إدخال عنوان المستند');
      return;
    }
    try {
      const basis = `${form.title}|${form.content_text}|${new Date().toISOString()}`;
      const sha256_hash = await computeSha256Hex(basis);
      const verify_code = `VRF-${Math.floor(100000 + Math.random() * 899999)}`;
      const created = await createEntity<LegalDocument>('documents', {
        ...form,
        matter_id: form.matter_id || undefined,
        client_id: form.client_id || undefined,
        responsible_user: user?.name || 'أ. كريم الهواري',
        document_date: new Date().toISOString(),
        sha256_hash,
        verify_code,
      });
      setDocs((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast.success('تم حفظ المستند وإصدار بصمة SHA-256 الرقمية');
    } catch (err: any) {
      toast.error(err?.message || 'تعذّر حفظ المستند');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('documents', id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setSelectedDoc(null);
      if (routeDocId) navigate('/documents');
      toast.success('تم حذف المستند');
    } catch {
      toast.error('تعذّر حذف المستند');
    }
  };

  const handleVerifyLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = verifyCodeQuery.trim().toLowerCase();
    if (!q) return;
    const found = docs.find(
      (d) =>
        (d.verify_code || '').toLowerCase() === q ||
        (d.sha256_hash || '').toLowerCase().includes(q)
    );
    setVerifyResult(found || 'not_found');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#4a90d9]" />
            إدارة المستندات والتوثيق الرقمي
          </h1>
          <p className="text-sm text-[#718096]">
            أرشيف العقود والمذكرات القانونية المزوّد ببصمة التحقق المشفّرة SHA-256
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NmButton
            variant="gold"
            onClick={() => {
              setVerifyResult(null);
              setVerifyCodeQuery('');
              setVerifyOpen(true);
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            التحقق من بصمة مستند
          </NmButton>
          <NmButton variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            إضافة / استيراد مستند
          </NmButton>
        </div>
      </div>

      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالعنوان، كود التحقق، أو النص..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="nm-input"
          >
            <option value="الكل">كل أنواع المستندات</option>
            <option value="عقد">عقد</option>
            <option value="مذكرة">مذكرة</option>
            <option value="حكم">حكم</option>
            <option value="توكيل">توكيل</option>
            <option value="بريد رسمي">بريد رسمي</option>
            <option value="دليل">دليل</option>
          </select>
        </div>
      </NmCard>

      {loading ? (
        <NmCard className="p-10 text-center text-[#718096]">جاري تحميل الأرشيف...</NmCard>
      ) : (
        <NmCard className="p-0 overflow-x-auto">
          <table className="nm-table w-full text-right">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>النوع</th>
                <th>القضية / العميل</th>
                <th>السرية</th>
                <th>الحالة</th>
                <th>كود التحقق</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#718096]">
                    لا توجد مستندات مطابقة
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="cursor-pointer"
                  >
                    <td className="font-bold text-[#2d3748]">{doc.title}</td>
                    <td className="text-sm text-[#718096]">{doc.document_type}</td>
                    <td className="text-sm text-[#4a90d9]">
                      {doc.matter_id && matterMap[doc.matter_id]
                        ? matterMap[doc.matter_id].title
                        : doc.client_id && clientMap[doc.client_id]
                        ? clientMap[doc.client_id].name
                        : 'مستند عام'}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#718096]">
                        <Lock className="w-3 h-3" />
                        {doc.confidentiality}
                      </span>
                    </td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td className="font-mono text-xs text-[#9a7619] tabular-nums">
                      {doc.verify_code || '—'}
                    </td>
                    <td className="text-xs text-[#718096]">{toArabicDate(doc.document_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </NmCard>
      )}

      {/* Document Detail & Digital Certificate Modal */}
      <NmModal
        open={Boolean(selectedDoc)}
        onClose={() => {
          setSelectedDoc(null);
          if (routeDocId) navigate('/documents');
        }}
        title={selectedDoc?.title || 'تفاصيل المستند'}
        maxWidth="max-w-3xl"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedDoc.document_type} />
              <StatusBadge status={selectedDoc.status} />
              <StatusBadge status={selectedDoc.confidentiality} />
              <span className="nm-badge text-[#4a90d9]">الإصدار {selectedDoc.version_number}</span>
            </div>

            <div className="nm-inset p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#718096]">المسؤول:</span>
                <span className="font-bold text-[#2d3748]">{selectedDoc.responsible_user}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#718096]">تاريخ التوثيق:</span>
                <span className="font-bold text-[#2d3748]">{toArabicDate(selectedDoc.document_date)}</span>
              </div>
              {selectedDoc.verify_code && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#718096]">كود شهادة التحقق:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#27ae60]">{selectedDoc.verify_code}</span>
                    <NmCopyButton text={selectedDoc.verify_code} />
                  </div>
                </div>
              )}
              {selectedDoc.sha256_hash && (
                <div className="pt-2">
                  <div className="text-xs text-[#718096] mb-1">بصمة SHA-256 الرقمية</div>
                  <div className="flex items-center gap-2 nm-raised px-3 py-2">
                    <code className="text-[11px] font-mono text-[#2d3748] break-all flex-1">
                      {selectedDoc.sha256_hash}
                    </code>
                    <NmCopyButton text={selectedDoc.sha256_hash} />
                  </div>
                </div>
              )}
            </div>

            {selectedDoc.content_text && (
              <div className="nm-inset p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#718096]">النص المحفوظ</span>
                  <NmCopyButton text={selectedDoc.content_text} label="نسخ النص" />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-[#2d3748] font-sans leading-relaxed max-h-64 overflow-y-auto">
                  {selectedDoc.content_text}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 no-print">
              <NmButton variant="danger" onClick={() => handleDelete(selectedDoc.id)}>
                <Trash2 className="w-4 h-4" />
                حذف المستند
              </NmButton>
              <NmButton variant="primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                طباعة شهادة التوثيق
              </NmButton>
            </div>
          </div>
        )}
      </NmModal>

      {/* Verify Certificate Modal */}
      <NmModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="التحقق من أصالة المستند (SHA-256)"
      >
        <form onSubmit={handleVerifyLookup} className="space-y-4">
          <p className="text-sm text-[#718096]">
            أدخل كود التحقق (مثال: VRF-884120) أو جزءاً من بصمة SHA-256 للتحقق الفوري من سلامة المستند.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyCodeQuery}
              onChange={(e) => setVerifyCodeQuery(e.target.value)}
              placeholder="VRF-XXXXXX"
              className="nm-input flex-1 font-mono"
            />
            <NmButton type="submit" variant="primary">تحقق الآن</NmButton>
          </div>

          {verifyResult === 'not_found' && (
            <div className="nm-inset p-4 text-sm text-[#e74c3c] font-bold">
              لم يتم العثور على مستند مطابق لهذا الكود أو البصمة في السجل.
            </div>
          )}

          {verifyResult && verifyResult !== 'not_found' && (
            <div className="nm-inset p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#27ae60] font-bold">
                <CheckCircle2 className="w-5 h-5" />
                مستند موثّق وسليم 100%
              </div>
              <div className="text-sm font-bold text-[#2d3748]">{verifyResult.title}</div>
              <div className="text-xs text-[#718096]">
                المسؤول: {verifyResult.responsible_user} · التاريخ: {toArabicDate(verifyResult.document_date)}
              </div>
              <code className="block text-[11px] font-mono text-[#2d3748] break-all pt-1">
                {verifyResult.sha256_hash}
              </code>
            </div>
          )}
        </form>
      </NmModal>

      {/* Create / Upload Document Modal */}
      <NmModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إضافة أو استيراد مستند قانوني"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="nm-inset p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-[#2d3748]">الاستيراد الذكي من ملف نصي</div>
              <div className="text-xs text-[#718096]">ارفع ملفاً نصياً لاستخراج محتواه وتوليد البصمة الرقمية تلقائياً</div>
            </div>
            <label className="nm-btn px-3 py-2 text-xs text-[#4a90d9] cursor-pointer inline-flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              اختيار ملف
              <input type="file" accept=".txt,.md,.json,.csv,.html" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">عنوان المستند *</label>
            <NmVoiceInput
              value={form.title}
              onChange={(val) => setForm({ ...form, title: val })}
              placeholder="مثال: مذكرة الدفاع الختامية — القضية 104"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">نوع المستند</label>
              <select
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                className="nm-input"
              >
                <option value="عقد">عقد</option>
                <option value="مذكرة">مذكرة</option>
                <option value="حكم">حكم</option>
                <option value="توكيل">توكيل</option>
                <option value="دليل">دليل</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">مستوى السرية</label>
              <select
                value={form.confidentiality}
                onChange={(e) => setForm({ ...form, confidentiality: e.target.value })}
                className="nm-input"
              >
                <option value="عام">عام</option>
                <option value="داخلي">داخلي</option>
                <option value="سري">سري</option>
                <option value="سري للغاية">سري للغاية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="nm-input"
              >
                <option value="مسودة">مسودة</option>
                <option value="قيد المراجعة">قيد المراجعة</option>
                <option value="معتمد">معتمد</option>
                <option value="موقّع">موقّع</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">القضية المرتبطة</label>
              <select
                value={form.matter_id}
                onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
                className="nm-input"
              >
                <option value="">غير مرتبط</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>{m.case_number} — {m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1.5">العميل</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="nm-input"
              >
                <option value="">غير محدد</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1.5">محتوى المستند</label>
            <NmVoiceInput
              multiline
              rows={4}
              value={form.content_text}
              onChange={(val) => setForm({ ...form, content_text: val })}
              placeholder="اكتب أو الصق نص المستند لتوثيقه رقمياً..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <NmButton type="button" onClick={() => setCreateOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ وتوثيق المستند</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
