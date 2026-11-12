export type UserRole =
  | 'شريك'
  | 'مشرف'
  | 'محامٍ أول'
  | 'محامٍ'
  | 'مساعد قانوني'
  | 'مالية'
  | 'عمليات';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  specialization: string;
  phone: string;
  avatar_url?: string;
  language_preference: 'العربية' | 'English';
  default_currency: 'SAR' | 'AED' | 'EGP' | 'KWD' | 'QAR' | 'BHD' | 'OMR';
  hourly_rate: number;
  license_number: string;
  department: string;
  plan: 'free' | 'pro';
  is_active: boolean;
}

export interface Client {
  id: string;
  serial_number: string;
  name: string;
  client_type: 'فرد' | 'شركة' | 'جهة حكومية' | 'مؤسسة';
  status: 'نشط' | 'محتمل' | 'مؤجل' | 'مغلق';
  phone: string;
  whatsapp?: string;
  email: string;
  nationality: string;
  id_or_commercial_reg: string;
  address: string;
  responsible_user: string;
  referral_source: string;
  registration_date: string;
  engagement_letter_signed?: boolean;
  kyc_completed?: boolean;
  ai_risk_score?: number;
  ai_payment_behavior?: string;
  ai_lifetime_value?: number;
  notes?: string;
}

export interface Matter {
  id: string;
  case_number: string;
  title: string;
  client_id: string;
  matter_type: string;
  jurisdiction: string;
  stage: string;
  status: 'مفتوح' | 'نشط' | 'معلق' | 'مغلق';
  priority: 'عاجلة' | 'عالية' | 'متوسطة' | 'منخفضة';
  court_or_authority: string;
  authority_case_number?: string;
  lead_lawyer: string;
  opposing_counsel?: string;
  legal_basis?: string;
  open_date: string;
  expected_close_date?: string;
  statute_of_limitations_date?: string;
  agreed_fees: number;
  case_value?: number;
  power_of_attorney_received?: boolean;
  client_retainer_signed?: boolean;
  conflict_check_done?: boolean;
  court_fees_paid?: boolean;
  color_code?: string;
  is_pinned?: boolean;
  // AI fields MUST remain undefined until user clicks "تشغيل التحليل" (BUG-05)
  ai_success_probability?: number;
  ai_risk_level?: string;
  ai_estimated_duration_days?: number;
  ai_strategy_notes?: string;
  ai_swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    recommendation: string;
  };
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  matter_id?: string;
  status: 'لم تبدأ' | 'جارية' | 'بانتظار العميل' | 'بانتظار الموافقة' | 'مكتملة' | 'ملغاة';
  priority: 'عاجلة' | 'عالية' | 'متوسطة' | 'منخفضة';
  assigned_to: string;
  due_date: string;
  task_type: string;
  is_recurring?: boolean;
  notes?: string;
}

export interface Hearing {
  id: string;
  title: string;
  matter_id: string;
  hearing_type: string;
  hearing_date: string; // ISO UTC
  status: 'قادم' | 'مكتمل' | 'ملغى' | 'مؤجل';
  priority: 'عاجلة' | 'مهمة' | 'عادية';
  location: string;
  room_number?: string;
  judge?: string;
  responsible_user: string;
  preparation_notes?: string;
  hearing_result?: string;
  next_hearing_date?: string;
  ai_preparation_checklist?: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  matter_id?: string;
  client_id?: string;
  document_type: string;
  status: string;
  confidentiality: string;
  responsible_user: string;
  document_date: string;
  version_number: string;
  source_type: string;
  sha256_hash?: string;
  verify_code?: string;
  content_text?: string;
  ai_risk_level?: string;
  ai_summary?: string;
  notes?: string;
}

export interface Inquiry {
  id: string;
  serial_number: string;
  inquirer_name: string;
  phone: string;
  email: string;
  matter_type: string;
  inquiry_channel: string;
  status: string;
  priority: string;
  referral_source?: string;
  assigned_to: string;
  inquiry_date: string;
  ai_qualification_score?: number;
  ai_recommended_action?: string;
  ai_case_viability?: string;
  notes?: string;
  client_id?: string;
}

export interface Consultation {
  id: string;
  title: string;
  client_id?: string;
  matter_id?: string;
  consultation_type: string;
  status: string;
  consultation_date: string;
  duration_minutes: number;
  lawyer: string;
  fee: number;
  summary?: string;
  recommendations?: string;
  converted_to_matter?: boolean;
}

export interface ConflictCheck {
  id: string;
  check_date: string;
  parties_checked: string;
  check_result: 'لا يوجد تعارض' | 'تعارض محتمل' | 'تعارض مؤكد';
  conflict_details?: string;
  matters_flagged?: string[];
  checked_by: string;
  action_taken?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  matter_id?: string;
  invoice_date: string;
  due_date: string;
  status: 'مسودة' | 'مُرسَلة' | 'مدفوعة' | 'مدفوعة جزئياً' | 'متأخرة' | 'ملغاة';
  currency: 'SAR' | 'AED' | 'EGP' | 'KWD';
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  line_items: InvoiceLineItem[];
  notes?: string;
}

export interface Payment {
  id: string;
  payment_reference: string;
  invoice_id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  matter_id: string;
  lawyer: string;
  entry_date: string;
  hours: number;
  hourly_rate: number;
  total_amount: number;
  category: string;
  description: string;
  is_billable: boolean;
  invoice_id?: string;
}

export interface LegalWebsite {
  id: string;
  name_ar: string;
  name_en?: string;
  url: string;
  category: string;
  country: string;
  description_ar?: string;
  is_featured: boolean;
  sort_order: number;
}

export interface BlogPost {
  id: string;
  title_ar: string;
  title_en?: string;
  slug: string;
  content_ar: string;
  excerpt_ar: string;
  author_name: string;
  category: string;
  cover_image_url?: string;
  is_published: boolean;
  is_featured: boolean;
  views_count: number;
  published_at: string;
}

export interface ClauseItem {
  id: string;
  title_ar: string;
  category: string;
  contract_type: string;
  text_ar: string;
  text_en: string;
  law_ref: string;
  risk_level: 'منخفض' | 'متوسط' | 'عالٍ';
  negotiability: 'ثابت' | 'قابل للتفاوض' | 'اختياري';
  alternatives: string[];
  usage_frequency: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  language: string;
  content: string;
  tags: string;
  source_url?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface ComplianceDomain {
  id: string;
  sector: string;
  domain_name: string;
  law_reference: string;
  authority: string;
  status: 'مستوفٍ' | 'قيد المراجعة' | 'غير مستوفٍ';
  deadline?: string;
  document_required: string;
  checklist: { item: string; passed: boolean }[];
}

export interface ArbitrationMatter {
  id: string;
  arbitration_ref: string;
  title: string;
  client_id: string;
  institution: 'CRCICA' | 'ICC' | 'UNCITRAL' | 'ICSID' | 'تحكيم محلي' | 'مركز التحكيم السعودي';
  seat: string;
  claim_value: number;
  currency: 'SAR' | 'EGP' | 'USD' | 'AED';
  status: string;
  arbitrators: string;
  filing_date: string;
  notes?: string;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  category: string;
  workflow_component: string;
  prompt_text: string;
  is_active: boolean;
  usage_count: number;
}

export interface AuditLogEntry {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  details?: string;
}
