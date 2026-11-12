import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Calendar,
  User,
  Eye,
  Share2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { listEntities, updateEntity } from '../lib/api';
import { BlogPost } from '../types/erp';
import { toArabicDate } from '../utils/dateUtils';
import { NmCard, NmButton } from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

const CATEGORY_LABELS: Record<string, string> = {
  الكل: 'الكل',
  تحكيم: 'تحكيم',
  تكنولوجيا_قانونية: 'تكنولوجيا قانونية',
  قانون_عمل: 'قانون عمل',
  قانون_تجاري: 'قانون تجاري',
  ملكية_فكرية: 'ملكية فكرية',
  قانون_مدني: 'قانون مدني',
  قانون_جنائي: 'قانون جنائي',
  عام: 'عام',
};

function renderMarkdown(content: string) {
  return (content || '').split('\n').map((line, idx) => {
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-2xl font-extrabold text-[#2d3748] mt-6 mb-3">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-xl font-bold text-[#4a90d9] mt-6 mb-2">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <li key={idx} className="text-[#2d3748] mr-5 list-disc leading-relaxed my-1">
          {line.slice(2)}
        </li>
      );
    }
    if (!line.trim()) return <div key={idx} className="h-2" />;
    return (
      <p key={idx} className="text-[#2d3748] leading-relaxed my-2 text-base">
        {line}
      </p>
    );
  });
}

export default function BlogPublic() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('الكل');

  useEffect(() => {
    listEntities<BlogPost>('blog_posts')
      .then((items) => setPosts(items))
      .finally(() => setLoading(false));
  }, []);

  const currentPost = useMemo(
    () => (slug ? posts.find((p) => p.slug === slug) || null : null),
    [slug, posts]
  );

  useEffect(() => {
    if (currentPost) {
      updateEntity('blog_posts', currentPost.id, {
        views_count: (currentPost.views_count || 0) + 1,
      }).catch(() => {});
    }
  }, [currentPost?.id]);

  const published = useMemo(() => posts.filter((p) => p.is_published), [posts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return published.filter((p) => {
      const catOk = category === 'الكل' || p.category === category;
      const qOk =
        !q ||
        p.title_ar.toLowerCase().includes(q) ||
        p.excerpt_ar.toLowerCase().includes(q) ||
        p.content_ar.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [published, category, searchQuery]);

  if (slug && !loading && currentPost) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] text-[#2d3748] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <NmButton onClick={() => navigate('/blog')}>
              <ArrowRight className="w-4 h-4" />
              العودة للمدونة
            </NmButton>
            <Link to="/landing" className="text-xs font-bold text-[#4a90d9]">
              نظام براءة القانوني
            </Link>
          </div>

          <NmCard className="p-8 space-y-5">
            <div className="flex items-center gap-3 text-xs text-[#718096]">
              <span className="nm-badge text-[#c9a84c]">
                {CATEGORY_LABELS[currentPost.category] || currentPost.category}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {currentPost.author_name}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {toArabicDate(currentPost.published_at)}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye className="w-3.5 h-3.5" />
                {(currentPost.views_count || 0) + 1}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#2d3748] leading-snug">
              {currentPost.title_ar}
            </h1>

            <div className="pt-2">{renderMarkdown(currentPost.content_ar)}</div>

            <div className="pt-6 flex flex-wrap items-center gap-3">
              <NmButton
                variant="primary"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('تم نسخ رابط المقال');
                }}
              >
                <Share2 className="w-4 h-4" />
                نسخ الرابط
              </NmButton>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${currentPost.title_ar}\n${window.location.href}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <NmButton variant="success">مشاركة عبر واتساب</NmButton>
              </a>
            </div>
          </NmCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-[#2d3748]">
      {/* Public Header */}
      <header className="px-6 py-4 max-w-[1240px] mx-auto flex items-center justify-between gap-6">
        <Link to="/landing" className="flex items-center gap-3">
          <img
            src="/assets/logo-animated.gif"
            alt="براءة"
            className="w-10 h-10 object-contain rounded-full"
          />
          <span className="text-lg font-extrabold text-[#2d3748]">المدونة القانونية — براءة</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/landing">
            <NmButton>الرئيسية</NmButton>
          </Link>
          <Link to="/home">
            <NmButton variant="primary">لوحة التحكم</NmButton>
          </Link>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-6 py-8 space-y-8">
        <NmCard className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="nm-inset w-12 h-12 rounded-xl flex items-center justify-center text-[#c9a84c]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#2d3748]">المدونة القانونية</h1>
              <p className="text-sm text-[#718096]">
                مقالات وأبحاث محكّمة في القانون المصري والسعودي والتحكيم الدولي
              </p>
            </div>
          </div>
          <div className="w-full md:w-80 relative nm-inset flex items-center px-3 py-1.5 gap-2">
            <Search className="w-4 h-4 text-[#718096]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المقالات..."
              className="bg-transparent border-0 outline-none w-full text-sm text-[#2d3748]"
            />
          </div>
        </NmCard>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(CATEGORY_LABELS).map((cat) => (
            <NmButton
              key={cat}
              active={category === cat}
              variant={category === cat ? 'primary' : 'default'}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </NmButton>
          ))}
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <NmCard key={i} className="h-56 animate-pulse">
                <div />
              </NmCard>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <NmCard className="text-center py-14 space-y-2">
            <p className="text-lg font-bold text-[#2d3748]">لا توجد مقالات مطابقة</p>
            <p className="text-sm text-[#718096]">جرّب تغيير كلمة البحث أو التصنيف</p>
          </NmCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <NmCard
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#718096]">
                    <span className="font-bold text-[#4a90d9]">
                      {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                    {post.is_featured && <span className="nm-badge text-[#c9a84c]">مميز</span>}
                  </div>
                  <h2 className="text-lg font-bold text-[#2d3748] leading-snug">{post.title_ar}</h2>
                  <p className="text-sm text-[#718096] line-clamp-3 leading-relaxed">
                    {post.excerpt_ar}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[#718096]">
                  <span>{toArabicDate(post.published_at)}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#4a90d9]">
                    اقرأ المقال
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </span>
                </div>
              </NmCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
