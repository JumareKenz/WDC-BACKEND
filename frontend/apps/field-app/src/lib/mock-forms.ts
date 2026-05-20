export interface FormField {
  key: string;
  label_en: string;
  label_ha: string;
  type: 'text' | 'number' | 'date' | 'select' | 'photo' | 'voice';
  required: boolean;
  options?: Array<{ value: string; label_en: string; label_ha: string }>;
  min?: number;
  max?: number;
  placeholder_en?: string;
  placeholder_ha?: string;
}

export interface MockFormVersion {
  id: string;
  formId: string;
  versionNumber: number;
  title_en: string;
  title_ha: string;
  fields: FormField[];
}

export const mockFormVersion: MockFormVersion = {
  id: 'fv-monthly-ward-1',
  formId: 'frm-monthly-ward',
  versionNumber: 1,
  title_en: 'Monthly Ward Development Meeting Report',
  title_ha: 'Rahoton Taro na Ci Gaban Unguwa na Wata',
  fields: [
    {
      key: 'meeting_date',
      label_en: 'Meeting Date',
      label_ha: 'Ranar Taro',
      type: 'date',
      required: true,
    },
    {
      key: 'chairperson_name',
      label_en: 'Chairperson Name',
      label_ha: 'Sunan Shugaban Taro',
      type: 'text',
      required: true,
      placeholder_en: 'Enter full name',
      placeholder_ha: 'Shigar da cikakken suna',
    },
    {
      key: 'meeting_type',
      label_en: 'Meeting Type',
      label_ha: 'Nau\'in Taro',
      type: 'select',
      required: true,
      options: [
        { value: 'regular', label_en: 'Regular Monthly', label_ha: 'Na Wata kai-tsaye' },
        { value: 'special', label_en: 'Special/Emergency', label_ha: 'Na Musamman' },
        { value: 'review', label_en: 'Review/Evaluation', label_ha: 'Bitar Aiki' },
      ],
    },
    {
      key: 'attendance',
      label_en: 'Number of Attendees',
      label_ha: 'Yawan Halartattu',
      type: 'number',
      required: true,
      min: 0,
      max: 500,
      placeholder_en: 'e.g. 45',
      placeholder_ha: 'misali 45',
    },
    {
      key: 'agenda_items',
      label_en: 'Agenda Items Discussed',
      label_ha: 'Abubuwan da aka tattauna',
      type: 'number',
      required: true,
      min: 1,
      max: 20,
      placeholder_en: 'e.g. 3',
      placeholder_ha: 'misali 3',
    },
    {
      key: 'summary',
      label_en: 'Meeting Summary',
      label_ha: 'Takaitaccen Taro',
      type: 'text',
      required: false,
      placeholder_en: 'Brief summary of key decisions...',
      placeholder_ha: 'Takaitaccen shawarwari masu muhimmanci...',
    },
    {
      key: 'photo_evidence',
      label_en: 'Photo Evidence',
      label_ha: 'Shaidar Hoto',
      type: 'photo',
      required: false,
    },
    {
      key: 'voice_notes',
      label_en: 'Voice Notes',
      label_ha: 'Bayanan Murya',
      type: 'voice',
      required: false,
    },
  ],
};

export function getFieldLabel(field: FormField, locale: 'en' | 'ha'): string {
  return locale === 'ha' ? field.label_ha : field.label_en;
}

export function getFieldPlaceholder(field: FormField, locale: 'en' | 'ha'): string | undefined {
  return locale === 'ha' ? field.placeholder_ha : field.placeholder_en;
}

export function getOptionLabel(option: { label_en: string; label_ha: string }, locale: 'en' | 'ha'): string {
  return locale === 'ha' ? option.label_ha : option.label_en;
}
