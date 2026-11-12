import { GoogleGenAI, Type } from '@google/genai';
import { getDb } from './db.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('تعذّر الوصول لبراءة — يرجى التحقق من إعداد مفتاح الذكاء الاصطناعي في بيئة التشغيل.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function runChat(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  matterId?: string;
  systemCustom?: string;
}) {
  const ai = getAiClient();
  const db = getDb();

  let contextBlock = '';
  if (params.matterId) {
    const matter = db.matters.find((m: any) => m.id === params.matterId);
    if (matter) {
      const client = db.clients.find((c: any) => c.id === matter.client_id);
      const tasks = db.tasks.filter((t: any) => t.matter_id === matter.id);
      const hearings = db.hearings.filter((h: any) => h.matter_id === matter.id);
      const invoices = db.invoices.filter((i: any) => i.matter_id === matter.id);
      contextBlock = `\n\nبيانات القضية المحددة (${matter.case_number}):
- العنوان: ${matter.title}
- العميل: ${client?.name || 'غير محدد'}
- النوع والاختصاص: ${matter.matter_type} / ${matter.jurisdiction}
- المرحلة والحالة: ${matter.stage} / ${matter.status}
- المحكمة: ${matter.court_or_authority}
- قيمة المطالبة: ${matter.case_value || 0} ريال سعودي
- المهام المرتبطة: ${tasks.map((t: any) => `${t.title} (${t.status})`).join(' | ') || 'لا توجد'}
- الجلسات: ${hearings.map((h: any) => `${h.title} (${h.hearing_date})`).join(' | ') || 'لا توجد'}
- الفواتير: ${invoices.map((i: any) => `${i.invoice_number} متبقي ${i.balance_due}`).join(' | ') || 'لا توجد'}`;
    }
  } else {
    contextBlock = `\n\nملخص المكتب الحالي:
- عدد العملاء: ${db.clients.length}
- عدد القضايا النشطة: ${db.matters.filter((m: any) => m.status !== 'مغلق').length}
- إجمالي القضايا: ${db.matters.length}
- المهام المعلقة: ${db.tasks.filter((t: any) => t.status !== 'مكتملة' && t.status !== 'ملغاة').length}
- الجلسات القادمة: ${db.hearings.filter((h: any) => h.status === 'قادم').length}`;
  }

  const systemInstruction = `أنتِ "براءة"، المساعد القانوني الذكي لنظام براءة القانوني (Baraa Legal ERP) المتخصص في القانون المصري والسعودي والخليجي.
- التزمي باللغة العربية الفصحى القانونية الدقيقة والواضحة.
- استشهدي بالمواد القانونية الصحيحة (مثل القانون المدني المصري 131/1948، نظام المعاملات المدنية السعودي، نظام العمل، قانون التحكيم 27/1994) عند الإمكان دون اختلاق أرقام قضايا غير موجودة.
- إذا طُلب منك تنفيذ إجراء في النظام (مثل: أضف عميل، أضف مهمة، ابحث عن قضية)، أجيبي بوضوح واقترحي تفاصيل الإجراء.${params.systemCustom ? `\nتعليمات إضافية من المكتب: ${params.systemCustom}` : ''}${contextBlock}`;

  const contents = [
    ...(params.history || []).slice(-10).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: params.message }] },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction,
    },
  });

  return {
    reply: response.text || 'لم يتم استلام رد من المساعد.',
  };
}

export async function analyzeMatter(matterId: string) {
  const ai = getAiClient();
  const db = getDb();
  const matter = db.matters.find((m: any) => m.id === matterId);
  if (!matter) throw new Error('القضية غير موجودة');

  const client = db.clients.find((c: any) => c.id === matter.client_id);
  const hearings = db.hearings.filter((h: any) => h.matter_id === matter.id);
  const docs = db.documents.filter((d: any) => d.matter_id === matter.id);

  const prompt = `حلّل هذه القضية القانونية تحليلاً استراتيجياً شاملاً:
- رقم القضية: ${matter.case_number}
- العنوان: ${matter.title}
- العميل: ${client?.name || 'غير محدد'}
- النوع: ${matter.matter_type} | الاختصاص: ${matter.jurisdiction}
- المرحلة: ${matter.stage} | المحكمة: ${matter.court_or_authority}
- الأساس القانوني: ${matter.legal_basis || 'غير محدد'}
- قيمة المطالبة: ${matter.case_value || 0} SAR
- الملاحظات: ${matter.notes || 'لا توجد'}
- المستندات المرفقة: ${docs.map((d: any) => d.title).join(', ') || 'لا توجد'}
- الجلسات: ${hearings.map((h: any) => h.title).join(', ') || 'لا توجد'}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'أنت مستشار قانوني استراتيجي رفيع المستوى في القانون المصري والسعودي. أرجع تحليلاً دقيقاً بصيغة JSON باللغة العربية فقط.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          success_probability: { type: Type.INTEGER, description: 'نسبة احتمال النجاح من 1 إلى 99' },
          risk_level: { type: Type.STRING, description: 'واحدة من: منخفض، متوسط، عالٍ، حرج' },
          estimated_duration_days: { type: Type.INTEGER, description: 'المدة التقديرية المتبقية بالأيام' },
          strategy_notes: { type: Type.STRING, description: 'خطة العمل والتوصية الاستراتيجية المفصلة بالعربية' },
          swot: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              threats: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING },
            },
          },
        },
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim());
  return parsed;
}

export async function reviewContract(params: {
  contractText: string;
  contractType: string;
  jurisdiction: string;
  checkSharia?: boolean;
}) {
  const ai = getAiClient();
  const prompt = `قم بمراجعة العقد التالي مراجعة قانونية شاملة من 5 مراحل (كشف المخاطر، الامتثال الشرعي إن وجد، تحليل الفجوات، مقارنة السوق، والتقرير النهائي).
نوع العقد: ${params.contractType}
الاختصاص القانوني: ${params.jurisdiction}
فحص الامتثال الشرعي: ${params.checkSharia ? 'مطلوب بدقة (فحص الربا والغرر)' : 'تقييم عام'}

نص العقد:
${params.contractText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'أنت محامٍ متخصص في مراجعة العقود وفق القانون المدني المصري رقم 131/1948 ونظام المعاملات المدنية السعودي. أعد تقريراً منظماً بصيغة JSON بالعربية.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overall_risk_score: { type: Type.INTEGER, description: 'درجة المخاطر من 0 إلى 100' },
          compliance_score: { type: Type.INTEGER, description: 'نسبة الامتثال القانوني من 0 إلى 100' },
          executive_summary: { type: Type.STRING },
          sharia_status: { type: Type.STRING },
          sharia_notes: { type: Type.STRING },
          missing_clauses: { type: Type.ARRAY, items: { type: Type.STRING } },
          market_benchmark_notes: { type: Type.STRING },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clause_title: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                severity: { type: Type.STRING, description: 'عالي أو متوسط أو منخفض' },
                law_reference: { type: Type.STRING },
                issue_explanation: { type: Type.STRING },
                suggested_rewrite: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse((response.text || '{}').trim());
}

export async function draftBilingualContract(params: {
  contractType: string;
  partyOne: string;
  partyTwo: string;
  value: string;
  jurisdiction: string;
  keyTerms: string;
}) {
  const ai = getAiClient();
  const prompt = `اصغ عقداً قانونياً كاملاً ثنائي اللغة (عربي + إنجليزي متقابلين) مع النص العربي هو النص السائد قانونياً:
- نوع العقد: ${params.contractType}
- الطرف الأول: ${params.partyOne}
- الطرف الثاني: ${params.partyTwo}
- القيمة المالية: ${params.value}
- القانون الحاكم والاختصاص: ${params.jurisdiction}
- الشروط والتفاصيل الخاصة: ${params.keyTerms}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'أنت مستشار صياغة عقود دولي. أعد بنود العقد بصيغة JSON تتضمن النص العربي الفصيح والترجمة الإنجليزية والمرجع القانوني ودليل التفاوض.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title_ar: { type: Type.STRING },
          title_en: { type: Type.STRING },
          preamble_ar: { type: Type.STRING },
          preamble_en: { type: Type.STRING },
          clauses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                heading_ar: { type: Type.STRING },
                heading_en: { type: Type.STRING },
                body_ar: { type: Type.STRING },
                body_en: { type: Type.STRING },
                law_reference: { type: Type.STRING },
                negotiability: { type: Type.STRING },
              },
            },
          },
          negotiation_guide: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse((response.text || '{}').trim());
}

export async function compareContracts(params: { versionA: string; versionB: string }) {
  const ai = getAiClient();
  const prompt = `قارن بين النسختين التاليتين من العقد واكتشف التعديلات الجوهرية والتناقضات الداخلية:

--- النسخة الأولى (الأصل) ---
${params.versionA}

--- النسخة الثانية (المعدّلة) ---
${params.versionB}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: 'أنت مدقق عقود قانوني. أخرج المقارنة بصيغة JSON باللغة العربية.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          substantive_changes_count: { type: Type.INTEGER },
          changes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'إضافة أو حذف أو تعديل' },
                category: { type: Type.STRING, description: 'جوهري أو إجرائي أو تنسيقي' },
                impact: { type: Type.STRING, description: 'عالٍ أو متوسط أو منخفض' },
                original_text: { type: Type.STRING },
                new_text: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                counter_proposal: { type: Type.STRING },
              },
            },
          },
          internal_contradictions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });

  return JSON.parse((response.text || '{}').trim());
}

export async function runLegalResearch(params: { query: string; jurisdiction: string }) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `أجرِ بحثاً قانونياً معمقاً حول السؤال التالي ضمن اختصاص (${params.jurisdiction}):\n${params.query}`,
    config: {
      systemInstruction:
        'أنت باحث قانوني متخصص في أحكام محكمة النقض المصرية والأنظمة السعودية والخليجية. قدم جواباً موثقاً بالمبادئ القانونية والنصوص التشريعية دون اختلاق أرقام طعون غير مؤكدة.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          legal_principles: { type: Type.ARRAY, items: { type: Type.STRING } },
          relevant_statutes: { type: Type.ARRAY, items: { type: Type.STRING } },
          practical_guidance: { type: Type.STRING },
          citation_text: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse((response.text || '{}').trim());
}

export async function runMootCourt(params: {
  matterId?: string;
  scenario: string;
  argument: string;
  history: Array<{ speaker: string; text: string }>;
}) {
  const ai = getAiClient();
  const db = getDb();
  const matter = params.matterId ? db.matters.find((m: any) => m.id === params.matterId) : null;

  const prompt = `محاكاة جلسة قضائية (Moot Court):
السيناريو: ${params.scenario}
${matter ? `بيانات القضية: ${matter.title} | المحكمة: ${matter.court_or_authority} | الأساس: ${matter.legal_basis || ''}` : ''}
تاريخ الجلسة حتى الآن:
${params.history.map((h) => `${h.speaker}: ${h.text}`).join('\n')}

مرافعة المحامي الحالية:
${params.argument}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'قم بدور القاضي ومحامي الخصم معاً لتدريب المحامي، وقيّم قوة مرافعته في هذه الجولة بصيغة JSON عربية.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          argument_strength: { type: Type.STRING, description: 'ضعيف أو مقبول أو قوي' },
          strength_score: { type: Type.INTEGER },
          opposing_counsel_reply: { type: Type.STRING },
          judge_question: { type: Type.STRING },
          coaching_tip: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse((response.text || '{}').trim());
}

export async function runLegalWidget(params: { widgetKey: string; widgetName: string; inputs: Record<string, any> }) {
  const ai = getAiClient();
  const prompt = `نفّذ أداة الذكاء القانوني: "${params.widgetName}" (${params.widgetKey}).
المدخلات المقدمة من المحامي:
${JSON.stringify(params.inputs, null, 2)}

أنتج مخرجاً قانونياً عربياً رسمياً متكاملاً وقابلاً للاستخدام والطباعة المباشرة، مع ذكر النصوص القانونية ذات الصلة وتنبيه المراجعة المهنية.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'أنت محامٍ ومستشار قانوني خبير في القوانين المصرية والسعودية والخليجية. قدّم المخرجات بصيغة واضحة ومنسقة بالعربية الفصحى القانونية.',
    },
  });

  return {
    output: response.text || '',
    generated_at: new Date().toISOString(),
  };
}

export async function transcribeAudio(params: { base64Audio: string; mimeType: string }) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || 'audio/webm',
            data: params.base64Audio,
          },
        },
        {
          text: 'فرّغ هذا التسجيل الصوتي باللغة العربية بدقة تامة دون إضافة تعليقات.',
        },
      ],
    },
  });
  return { text: (response.text || '').trim() };
}
