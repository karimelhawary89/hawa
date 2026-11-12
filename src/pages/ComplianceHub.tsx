import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Calculator,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { ComplianceDomain } from '../types/erp';
import { listEntities, updateEntity } from '../lib/api';
import { NmCard, NmButton, StatusBadge, NmCopyButton } from '../components/ui/NeumorphicPrimitives';
import { parseMoneyInput, sanitizeMoneyText, formatSAR } from '../utils/currencyUtils';
import { toArabicDate } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

export default function ComplianceHub() {
  const toast = useToast();
  const [tab, setTab] = useState<'checklist' | 'filings' | 'calculators'>('checklist');
  const [domains, setDomains] = useState<ComplianceDomain[]>([]);
  const [loading, setLoading] = useState(true);

  // Filing Generator
  const [filingAuthority, setFilingAuthority] = useState('الهيئة العامة للاستثمار والمناطق الحرة (GAFI)');
  const [filingCompany, setFilingCompany] = useState('شركة المدار للتطوير العقاري ش.م.م');
  const [filingReg, setFilingReg] = useState('CR-4030118922');
  const [filingSubject, setFilingSubject] = useState('محضر اجتماع الجمعية العامة العادية السنوية والمصادقة على القوائم المالية');

  // Employment Termination Calculator (BUG-02 compliant text money inputs)
  const [salaryStr, setSalaryStr] = useState('15000');
  const [yearsStr, setYearsStr] = useState('6');
  const [termType, setTermType] = useState<'employer' | 'resignation' | 'contract_end'>('employer');

  // Real Estate Cost Calculator
  const [propPriceStr, setPropPriceStr] = useState('1800000');
  const [isFirstHome, setIsFirstHome] = useState(false);

  useEffect(() => {
    setLoading(true);
    listEntities<ComplianceDomain>('compliance_checks')
      .then(setDomains)
      .catch(() => toast.error('تعذّر تحميل سجلات الامتثال'))
      .finally(() => setLoading(false));
  }, []);

  const toggleChecklistItem = async (domain: ComplianceDomain, idx: number) => {
    const nextChecklist = domain.checklist.map((it, i) =>
      i === idx ? { ...it, passed: !it.passed } : it
    );
    const passedCount = nextChecklist.filter((c) => c.passed).length;
    const nextStatus: ComplianceDomain['status'] =
      passedCount === nextChecklist.length
        ? 'مستوفٍ'
        : passedCount === 0
        ? 'غير مستوفٍ'
        : 'قيد المراجعة';

    try {
      const updated = await updateEntity<ComplianceDomain>('compliance_checks', domain.id, {
        checklist: nextChecklist,
        status: nextStatus,
      });
      setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast.success('تم تحديث بند الامتثال');
    } catch {
      toast.error('تعذّر تحديث الحالة');
    }
  };

  // End-of-service calculation (Saudi Labor Law Art. 84/85)
  const salary = parseMoneyInput(salaryStr);
  const years = Math.max(0, parseMoneyInput(yearsStr));
  const fullEOS = years <= 5 ? (salary / 2) * years : (salary / 2) * 5 + salary * (years - 5);
  let eosPayable = fullEOS;
  if (termType === 'resignation') {
    if (years < 2) eosPayable = 0;
    else if (years < 5) eosPayable = fullEOS / 3;
    else if (years < 10) eosPayable = (fullEOS * 2) / 3;
  }

  // Real Estate Transaction Tax (RETT 5% in KSA with 1M SAR first-home exemption)
  const propPrice = parseMoneyInput(propPriceStr);
  const taxableBase = isFirstHome ? Math.max(0, propPrice - 1000000) : propPrice;
  const rettTax = taxableBase * 0.05;
  const brokerageFee = propPrice * 0.025;
  const totalRealEstateCost = propPrice + rettTax + brokerageFee;

  const filingDocumentText = `نموذج إيداع نظامي رسمي
الجهة المختصة: ${filingAuthority}
اسم المنشأة: ${filingCompany}
رقم السجل التجاري / القيد: ${filingReg}
التاريخ: ${toArabicDate(new Date().toISOString())}

الموضوع: ${filingSubject}

السادة / ${filingAuthority} المحترمين،
السلام عليكم ورحمة الله وبركاته،،،

بصفتنا الوكلاء الشرعيين والنظاميين عن المنشأة الموضحة بياناتها أعلاه، نتقدم بطلب إيداع واعتماد المستند النظامي المرفق وفقاً لأحكام نظام الشركات واللوائح التنفيذية المعمول بها.

المرفقات النظامية:
1. صورة السجل التجاري ساري المفعول.
2. محضر الاجتماع موقّع من رئيس الجمعية وأمين السر.
3. صورة الوكالة الشرعية السارية للمفوض بالإيداع.

وتفضلوا بقبول فائق الاحترام والتقدير،،،`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#2d3748] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#27ae60]" />
            مركز الامتثال والحوكمة والنماذج
          </h1>
          <p className="text-sm text-[#718096]">
            متابعة الالتزامات التنظيمية، توليد نماذج الجهات الرسمية، وحاسبات المستحقات والضرائب
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 no-print">
        <NmButton active={tab === 'checklist'} onClick={() => setTab('checklist')}>
          <ShieldCheck className="w-4 h-4" />
          مصفوفة الامتثال ({domains.length})
        </NmButton>
        <NmButton active={tab === 'filings'} onClick={() => setTab('filings')}>
          <FileSpreadsheet className="w-4 h-4" />
          مولد الطلبات الرسمية
        </NmButton>
        <NmButton active={tab === 'calculators'} onClick={() => setTab('calculators')}>
          <Calculator className="w-4 h-4" />
          حاسبات العمل والعقارات
        </NmButton>
      </div>

      {tab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {loading ? (
            <NmCard className="p-8 text-center text-[#718096] lg:col-span-2">جاري التحميل...</NmCard>
          ) : (
            domains.map((dom) => {
              const done = dom.checklist.filter((c) => c.passed).length;
              const pct = dom.checklist.length ? Math.round((done / dom.checklist.length) * 100) : 0;
              return (
                <NmCard key={dom.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#4a90d9]">{dom.sector}</span>
                      <h3 className="text-lg font-bold text-[#2d3748]">{dom.domain_name}</h3>
                    </div>
                    <StatusBadge status={dom.status} />
                  </div>

                  <div className="text-xs text-[#718096] space-y-1">
                    <div>المرجع النظامي: <span className="text-[#2d3748] font-medium">{dom.law_reference}</span></div>
                    <div>الجهة الرقابية: <span className="text-[#2d3748] font-medium">{dom.authority}</span></div>
                    {dom.deadline && (
                      <div>الموعد النهائي: <span className="text-[#e67e22] font-bold">{toArabicDate(dom.deadline)}</span></div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#718096]">
                      <span>نسبة الاستيفاء</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="nm-inset h-2.5 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-[#27ae60] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {dom.checklist.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleChecklistItem(dom, idx)}
                        className="w-full nm-inset px-3 py-2 flex items-center gap-2.5 text-right text-sm text-[#2d3748] hover:text-[#4a90d9] cursor-pointer"
                      >
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#27ae60] shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#718096] shrink-0" />
                        )}
                        <span className={item.passed ? 'line-through text-[#718096]' : ''}>
                          {item.item}
                        </span>
                      </button>
                    ))}
                  </div>
                </NmCard>
              );
            })
          )}
        </div>
      )}

      {tab === 'filings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <NmCard className="lg:col-span-5 p-5 space-y-4 no-print">
            <h3 className="font-bold text-[#2d3748]">تجهيز نموذج الإيداع الرسمي</h3>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">الجهة الرسمية</label>
              <select
                value={filingAuthority}
                onChange={(e) => setFilingAuthority(e.target.value)}
                className="nm-input"
              >
                <option value="الهيئة العامة للاستثمار والمناطق الحرة (GAFI)">الهيئة العامة للاستثمار والمناطق الحرة (GAFI)</option>
                <option value="وزارة التجارة — السجل التجاري">وزارة التجارة — السجل التجاري</option>
                <option value="المحكمة التجارية المختصة">المحكمة التجارية المختصة</option>
                <option value="هيئة الزكاة والضريبة والجمارك (ZATCA)">هيئة الزكاة والضريبة والجمارك (ZATCA)</option>
                <option value="نقابة المحامين / الهيئة السعودية للمحامين">نقابة المحامين / الهيئة السعودية للمحامين</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">اسم الشركة / الموكل</label>
              <input
                type="text"
                value={filingCompany}
                onChange={(e) => setFilingCompany(e.target.value)}
                className="nm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">رقم السجل التجاري / القيد</label>
              <input
                type="text"
                value={filingReg}
                onChange={(e) => setFilingReg(e.target.value)}
                className="nm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">موضوع الطلب</label>
              <textarea
                rows={3}
                value={filingSubject}
                onChange={(e) => setFilingSubject(e.target.value)}
                className="nm-input"
              />
            </div>
          </NmCard>

          <NmCard className="lg:col-span-7 p-6 space-y-4">
            <div className="flex items-center justify-between no-print">
              <h3 className="font-bold text-[#2d3748]">معاينة المستند الجاهز للطباعة</h3>
              <div className="flex gap-2">
                <NmCopyButton text={filingDocumentText} label="نسخ" />
                <NmButton variant="primary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  طباعة
                </NmButton>
              </div>
            </div>
            <pre className="nm-inset p-5 whitespace-pre-wrap font-sans text-sm text-[#2d3748] leading-loose">
              {filingDocumentText}
            </pre>
          </NmCard>
        </div>
      )}

      {tab === 'calculators' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* End of Service Calculator */}
          <NmCard className="p-5 space-y-4">
            <h3 className="text-lg font-bold text-[#2d3748]">حاسبة مكافأة نهاية الخدمة (نظام العمل)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">الأجر الشهري الإجمالي (SAR)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={salaryStr}
                  onChange={(e) => setSalaryStr(sanitizeMoneyText(e.target.value))}
                  className="nm-input tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#718096] mb-1">سنوات الخدمة</label>
                <input
                  type="text"
                  inputMode="decimal"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={yearsStr}
                  onChange={(e) => setYearsStr(sanitizeMoneyText(e.target.value))}
                  className="nm-input tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">سبب إنهاء العلاقة العمالية</label>
              <select
                value={termType}
                onChange={(e) => setTermType(e.target.value as any)}
                className="nm-input"
              >
                <option value="employer">إنهاء من صاحب العمل (المادة 84 — كامل المكافأة)</option>
                <option value="contract_end">انتهاء مدة العقد المحدد (كامل المكافأة)</option>
                <option value="resignation">استقالة العامل (المادة 85 — نسب متدرجة)</option>
              </select>
            </div>
            <div className="nm-inset p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#718096]">إجمالي المكافأة الكاملة:</span>
                <span className="font-bold text-[#2d3748] tabular-nums">{formatSAR(fullEOS)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="font-bold text-[#2d3748]">المستحق صرفه فعلياً:</span>
                <span className="font-bold text-[#27ae60] tabular-nums">{formatSAR(eosPayable)}</span>
              </div>
            </div>
          </NmCard>

          {/* Real Estate Cost Calculator */}
          <NmCard className="p-5 space-y-4">
            <h3 className="text-lg font-bold text-[#2d3748]">حاسبة تكاليف التصرفات العقارية والسعي</h3>
            <div>
              <label className="block text-xs font-bold text-[#718096] mb-1">قيمة الصفقة العقارية (SAR)</label>
              <input
                type="text"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                value={propPriceStr}
                onChange={(e) => setPropPriceStr(sanitizeMoneyText(e.target.value))}
                className="nm-input tabular-nums"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#2d3748] cursor-pointer">
              <input
                type="checkbox"
                checked={isFirstHome}
                onChange={(e) => setIsFirstHome(e.target.checked)}
                className="w-4 h-4 accent-[#4a90d9]"
              />
              المسكن الأول للمواطن (إعفاء أول 1,000,000 ريال من ضريبة التصرفات)
            </label>
            <div className="nm-inset p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#718096]">ضريبة التصرفات العقارية (5%):</span>
                <span className="font-bold text-[#e67e22] tabular-nums">{formatSAR(rettTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">رسوم الوساطة العقارية (2.5%):</span>
                <span className="font-bold text-[#2d3748] tabular-nums">{formatSAR(brokerageFee)}</span>
              </div>
              <div className="flex justify-between text-base pt-2">
                <span className="font-bold text-[#2d3748]">إجمالي التكلفة الشاملة:</span>
                <span className="font-bold text-[#4a90d9] tabular-nums">{formatSAR(totalRealEstateCost)}</span>
              </div>
            </div>
          </NmCard>
        </div>
      )}
    </div>
  );
}
