import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, Plug, CheckCircle2, Sparkles } from 'lucide-react';
import ProGate from '../components/ProGate';
import { listEntities, updateEntity, getConfig, saveConfig } from '../lib/api';
import { NmCard, NmButton, StatusBadge } from '../components/ui/NeumorphicPrimitives';
import { useToast } from '../context/ToastContext';

export default function WidgetsAndIntegrations() {
  const location = useLocation();
  const toast = useToast();
  const path = location.pathname;

  const initialTab = path.includes('integrations')
    ? 'integrations'
    : path.includes('my-widgets')
    ? 'my'
    : 'gallery';

  const [tab, setTab] = useState<'gallery' | 'my' | 'integrations'>(initialTab);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [enabledKeys, setEnabledKeys] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    listEntities('widget_catalogue').then(setCatalogue).catch(() => {});
    listEntities('integrations').then(setIntegrations).catch(() => {});
    getConfig<any>('widget_instances')
      .then((val) => {
        if (Array.isArray(val)) setEnabledKeys(val);
        else if (val?.enabled) setEnabledKeys(val.enabled);
      })
      .catch(() => {});
  }, []);

  const toggleWidget = async (key: string) => {
    const next = enabledKeys.includes(key)
      ? enabledKeys.filter((k) => k !== key)
      : [...enabledKeys, key];
    setEnabledKeys(next);
    try {
      await saveConfig('widget_instances', { enabled: next });
      toast.success('تم تحديث الويدجت المثبتة');
    } catch {
      toast.error('تعذّر الحفظ');
    }
  };

  const toggleIntegration = async (integ: any) => {
    const nextStatus = integ.status === 'متصل' ? 'غير متصل' : 'متصل';
    try {
      const updated = await updateEntity<any>('integrations', integ.id, { status: nextStatus });
      setIntegrations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(`تم تحديث حالة ${integ.name_ar} إلى ${nextStatus}`);
    } catch {
      toast.error('تعذّر تحديث التكامل');
    }
  };

  return (
    <ProGate>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#9a7619]" />
              معرض الويدجت والتكاملات المؤسسية
            </h1>
            <p className="text-sm text-[#718096]">
              تخصيص الأدوات القانونية الذكية وربط المكتب بمنصات Notion و Coda وواتساب والمدفوعات
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NmButton active={tab === 'gallery'} onClick={() => setTab('gallery')}>
              معرض الويدجت ({catalogue.length})
            </NmButton>
            <NmButton active={tab === 'my'} onClick={() => setTab('my')}>
              ويدجت مكتبي ({enabledKeys.length})
            </NmButton>
            <NmButton active={tab === 'integrations'} onClick={() => setTab('integrations')}>
              <Plug className="w-4 h-4" />
              التكاملات ({integrations.length})
            </NmButton>
          </div>
        </div>

        {(tab === 'gallery' || tab === 'my') && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(tab === 'my'
              ? catalogue.filter((w) => enabledKeys.includes(w.key))
              : catalogue
            ).map((w) => {
              const active = enabledKeys.includes(w.key);
              return (
                <NmCard key={w.id} className="p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[#2d3748]">{w.name_ar}</h3>
                      <StatusBadge status={w.category} />
                    </div>
                    <p className="text-xs text-[#718096]">{w.description_ar}</p>
                  </div>
                  <NmButton
                    variant={active ? 'success' : 'primary'}
                    active={active}
                    onClick={() => toggleWidget(w.key)}
                  >
                    {active ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {active ? 'مفعّل في لوحة المكتب' : 'تفعيل في مكتبي'}
                  </NmButton>
                </NmCard>
              );
            })}
            {tab === 'my' && enabledKeys.length === 0 && (
              <NmCard className="p-8 text-center text-[#718096] md:col-span-3">
                لم تقم بتفعيل أي ويدجت بعد. اختر من معرض الويدجت أعلاه.
              </NmCard>
            )}
          </div>
        )}

        {tab === 'integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integ) => (
              <NmCard key={integ.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#2d3748]">{integ.name_ar}</h3>
                    <StatusBadge status={integ.status} />
                  </div>
                  <p className="text-xs text-[#718096]">{integ.description_ar}</p>
                </div>
                <NmButton
                  variant={integ.status === 'متصل' ? 'default' : 'primary'}
                  onClick={() => toggleIntegration(integ)}
                >
                  {integ.status === 'متصل' ? 'إيقاف الربط' : 'تفعيل الربط الآن'}
                </NmButton>
              </NmCard>
            ))}
          </div>
        )}
      </div>
    </ProGate>
  );
}
