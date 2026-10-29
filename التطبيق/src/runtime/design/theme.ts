/**
 * تكة — رموز التصميم المعتمدة (DESIGN 0.1)
 * «مغامرة هادئة»: ورق دافئ + حبر بحري. ممنوع الأحمر الصارخ #EF4444 والأسود النقي والأبيض النقي.
 */
export const theme = {
  color: {
    paper: '#F5F1E6',
    ink: '#173F38',
    journey: '#286253',
    apricot: '#E99B54',
    gold: '#F59E0B',
    gentle: '#FB923C',
    card: '#F8FAFC',
    sky: '#B8D4E3',
    sand: '#E8D5B7',
    leaf: '#7BAF8B',
    fog: '#D4DCC8',
  },
  font: {
    family: "'Tajawal','Readex Pro','Segoe UI',Tahoma,Arial,sans-serif",
    title: 28,
    section: 24,
    instruction: 20,
    hint: 18,
    small: 16,
    lineHeight: 1.6,
  },
  touch: {
    action: 72,
    actionMin: 56,
    dragMin: 56,
    safeEdge: 16,
  },
  radius: { sm: 10, md: 16, lg: 24 },
} as const;

export type Theme = typeof theme;
