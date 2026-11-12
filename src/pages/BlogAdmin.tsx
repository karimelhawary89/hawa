import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Plus, Trash2, Edit3, Eye, ExternalLink } from 'lucide-react';
import { BlogPost } from '../types/erp';
import { listEntities, createEntity, updateEntity, deleteEntity } from '../lib/api';
import { NmCard, NmButton, StatusBadge, NmModal, NmVoiceInput } from '../components/ui/NeumorphicPrimitives';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function BlogAdmin() {
  const toast = useToast();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);

  const [form, setForm] = useState({
    title_ar: '',
    slug: '',
    category: 'العقود التجارية',
    excerpt_ar: '',
    content_ar: '',
    is_published: true,
    is_featured: false,
  });

  useEffect(() => {
    listEntities<BlogPost>('blog_posts')
      .then(setPosts)
      .catch(() => toast.error('تعذّر تحميل المقالات'));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title_ar: '',
      slug: '',
      category: 'العقود التجارية',
      excerpt_ar: '',
      content_ar: '',
      is_published: true,
      is_featured: false,
    });
    setModalOpen(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title_ar: p.title_ar,
      slug: p.slug,
      category: p.category,
      excerpt_ar: p.excerpt_ar,
      content_ar: p.content_ar,
      is_published: p.is_published,
      is_featured: p.is_featured,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title_ar.trim() || !form.content_ar.trim()) {
      toast.error('يرجى إدخال عنوان المقال والمحتوى');
      return;
    }
    const slug =
      form.slug.trim() ||
      `article-${Date.now()}`;
    try {
      if (editing) {
        const updated = await updateEntity<BlogPost>('blog_posts', editing.id, {
          ...form,
          slug,
        });
        setPosts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast.success('تم تحديث المقال');
      } else {
        const created = await createEntity<BlogPost>('blog_posts', {
          ...form,
          slug,
          author_name: user?.name || 'أ. كريم الهواري',
          views_count: 1,
          published_at: new Date().toISOString(),
        });
        setPosts((prev) => [created, ...prev]);
        toast.success('تم نشر المقال في المدونة القانونية');
      }
      setModalOpen(false);
    } catch {
      toast.error('تعذّر حفظ المقال');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntity('blog_posts', id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('تم حذف المقال');
    } catch {
      toast.error('تعذّر الحذف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-[#4a90d9]" />
            إدارة المدونة القانونية
          </h1>
          <p className="text-sm text-[#718096]">
            كتابة ونشر المقالات التوعوية والأحكام القانونية في البوابة العامة للمكتب
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/blog">
            <NmButton>
              <ExternalLink className="w-4 h-4" />
              معاينة المدونة العامة
            </NmButton>
          </Link>
          <NmButton variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            مقال جديد
          </NmButton>
        </div>
      </div>

      <NmCard className="p-0 overflow-x-auto">
        <table className="nm-table w-full text-right">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>التصنيف</th>
              <th>الكاتب</th>
              <th>المشاهدات</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="font-bold text-[#2d3748]">{p.title_ar}</td>
                <td><span className="nm-badge text-[#4a90d9]">{p.category}</span></td>
                <td className="text-xs text-[#2d3748]">{p.author_name}</td>
                <td className="text-xs tabular-nums">
                  <span className="inline-flex items-center gap-1 text-[#718096]">
                    <Eye className="w-3.5 h-3.5" />
                    {p.views_count}
                  </span>
                </td>
                <td><StatusBadge status={p.is_published ? 'منشور' : 'مسودة'} /></td>
                <td className="text-xs text-[#718096]">{toArabicDate(p.published_at)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="nm-icon-btn w-8 h-8 flex items-center justify-center text-[#4a90d9]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="nm-icon-btn w-8 h-8 flex items-center justify-center text-[#e74c3c]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </NmCard>

      <NmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل المقال' : 'كتابة مقال قانوني جديد'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">عنوان المقال *</label>
            <NmVoiceInput
              value={form.title_ar}
              onChange={(val) => setForm({ ...form, title_ar: val })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">التصنيف</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="nm-input"
              >
                <option value="العقود التجارية">العقود التجارية</option>
                <option value="التحكيم التجاري">التحكيم التجاري</option>
                <option value="قانون العمل">قانون العمل</option>
                <option value="الشركات والحوكمة">الشركات والحوكمة</option>
                <option value="التقاضي والذكاء الاصطناعي">التقاضي والذكاء الاصطناعي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الرابط المختصر (Slug)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="commercial-contracts-guide"
                className="nm-input font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">المقتطف التعريفي</label>
            <textarea
              rows={2}
              value={form.excerpt_ar}
              onChange={(e) => setForm({ ...form, excerpt_ar: e.target.value })}
              className="nm-input"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#718096] mb-1">نص المقال *</label>
            <NmVoiceInput
              multiline
              rows={6}
              value={form.content_ar}
              onChange={(val) => setForm({ ...form, content_ar: val })}
            />
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[#2d3748]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="w-4 h-4 accent-[#4a90d9]"
              />
              نشر المقال للعامة
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="w-4 h-4 accent-[#c9a84c]"
              />
              مقال مميز في الواجهة
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <NmButton type="button" onClick={() => setModalOpen(false)}>إلغاء</NmButton>
            <NmButton type="submit" variant="primary">حفظ ونشر</NmButton>
          </div>
        </form>
      </NmModal>
    </div>
  );
}
