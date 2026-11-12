import React, { useEffect, useState, useMemo } from 'react';
import { Globe, Search, Star, ExternalLink } from 'lucide-react';
import { LegalWebsite } from '../types/erp';
import { listEntities, updateEntity } from '../lib/api';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

export default function LegalWebsites() {
  const toast = useToast();
  const [websites, setWebsites] = useState<LegalWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [countryFilter, setCountryFilter] = useState('الكل');
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    listEntities<LegalWebsite>('legal_websites')
      .then((items) => setWebsites(items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))))
      .catch(() => toast.error('تعذّر تحميل دليل المواقع القانونية'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const s = new Set(websites.map((w) => w.category));
    return ['الكل', ...Array.from(s)];
  }, [websites]);

  const countries = useMemo(() => {
    const s = new Set(websites.map((w) => w.country));
    return ['الكل', ...Array.from(s)];
  }, [websites]);

  // BUG-06: Genuinely filter search across Arabic/English names, descriptions, categories, countries
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return websites.filter((w) => {
      if (featuredOnly && !w.is_featured) return false;
      if (categoryFilter !== 'الكل' && w.category !== categoryFilter) return false;
      if (countryFilter !== 'الكل' && w.country !== countryFilter) return false;
      if (!q) return true;
      return (
        w.name_ar.toLowerCase().includes(q) ||
        (w.name_en || '').toLowerCase().includes(q) ||
        (w.description_ar || '').toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.country.toLowerCase().includes(q)
      );
    });
  }, [websites, search, categoryFilter, countryFilter, featuredOnly]);

  const toggleFeatured = async (w: LegalWebsite) => {
    try {
      const updated = await updateEntity<LegalWebsite>('legal_websites', w.id, {
        is_featured: !w.is_featured,
      });
      setWebsites((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      toast.error('تعذّر تحديث المفضلة');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#4a90d9]" />
            دليل المواقع والمنصات القانونية الرسمية ({websites.length})
          </h1>
          <p className="text-sm text-[#718096]">
            بوابات التقاضي، النشر التشريعي، السوابق القضائية، ومراكز التحكيم في مصر والسعودية والخليج والعالم
          </p>
        </div>
        <NmButton active={featuredOnly} variant="gold" onClick={() => setFeaturedOnly((v) => !v)}>
          <Star className="w-4 h-4" />
          المميزة فقط
        </NmButton>
      </div>

      <NmCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#718096] absolute right-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منصة (مثال: ناجز، نقض، CRCICA، قوانين)..."
              className="nm-input pr-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="nm-input"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'الكل' ? 'كل التصنيفات' : c}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="nm-input"
          >
            {countries.map((c) => (
              <option key={c} value={c}>{c === 'الكل' ? 'كل الدول' : c}</option>
            ))}
          </select>
        </div>
      </NmCard>

      {loading ? (
        <NmCard className="p-10 text-center text-[#718096]">جاري تحميل المنصات...</NmCard>
      ) : filtered.length === 0 ? (
        <NmCard className="p-10 text-center text-[#718096]">لا توجد مواقع مطابقة لبحثك</NmCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <NmCard key={w.id} className="p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#2d3748]">{w.name_ar}</h3>
                    {w.name_en && <div className="text-xs text-[#718096]">{w.name_en}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFeatured(w)}
                    className={`nm-icon-btn w-8 h-8 flex items-center justify-center ${
                      w.is_featured ? 'text-[#c9a84c]' : 'text-[#718096]'
                    }`}
                    title="تثبيت في المفضلة"
                  >
                    <Star className="w-4 h-4" fill={w.is_featured ? '#c9a84c' : 'none'} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={w.country} />
                  <span className="nm-badge text-[#4a90d9]">{w.category}</span>
                </div>
                {w.description_ar && (
                  <p className="text-xs text-[#718096] leading-relaxed">{w.description_ar}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-[#718096] truncate max-w-[180px]" dir="ltr">
                  {w.url.replace(/^https?:\/\//, '')}
                </span>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nm-btn px-3 py-1.5 text-xs text-[#4a90d9] inline-flex items-center gap-1.5"
                >
                  فتح الموقع
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </NmCard>
          ))}
        </div>
      )}
    </div>
  );
}
