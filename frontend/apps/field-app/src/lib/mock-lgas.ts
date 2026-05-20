export const mockLgas = [
  { id: 'lga-1', name: 'Birnin Gwari', nameHa: 'Birnin Gwari' },
  { id: 'lga-2', name: 'Chikun', nameHa: 'Chikun' },
  { id: 'lga-3', name: 'Giwa', nameHa: 'Giwa' },
  { id: 'lga-4', name: 'Igabi', nameHa: 'Igabi' },
  { id: 'lga-5', name: 'Jaba', nameHa: 'Jaba' },
  { id: 'lga-6', name: 'Jema\'a', nameHa: 'Jema\'a' },
  { id: 'lga-7', name: 'Kaduna North', nameHa: 'Arewacin Kaduna' },
  { id: 'lga-8', name: 'Kaduna South', nameHa: 'Kudancin Kaduna' },
  { id: 'lga-9', name: 'Kajuru', nameHa: 'Kajuru' },
  { id: 'lga-10', name: 'Kaura', nameHa: 'Kaura' },
];

export const mockWards: Record<string, Array<{ id: string; name: string; nameHa: string }>> = {
  'lga-1': [
    { id: 'ward-1-1', name: 'Birnin Gwari Ward 1', nameHa: 'Unguwa 1, Birnin Gwari' },
    { id: 'ward-1-2', name: 'Birnin Gwari Ward 2', nameHa: 'Unguwa 2, Birnin Gwari' },
    { id: 'ward-1-3', name: 'Birnin Gwari Ward 3', nameHa: 'Unguwa 3, Birnin Gwari' },
  ],
  'lga-2': [
    { id: 'ward-2-1', name: 'Chikun Ward 1', nameHa: 'Unguwa 1, Chikun' },
    { id: 'ward-2-2', name: 'Chikun Ward 2', nameHa: 'Unguwa 2, Chikun' },
    { id: 'ward-2-3', name: 'Chikun Ward 3', nameHa: 'Unguwa 3, Chikun' },
  ],
  'lga-3': [
    { id: 'ward-3-1', name: 'Giwa Ward 1', nameHa: 'Unguwa 1, Giwa' },
    { id: 'ward-3-2', name: 'Giwa Ward 2', nameHa: 'Unguwa 2, Giwa' },
  ],
  'lga-4': [
    { id: 'ward-4-1', name: 'Igabi Ward 1', nameHa: 'Unguwa 1, Igabi' },
    { id: 'ward-4-2', name: 'Igabi Ward 2', nameHa: 'Unguwa 2, Igabi' },
    { id: 'ward-4-3', name: 'Igabi Ward 3', nameHa: 'Unguwa 3, Igabi' },
  ],
  'lga-5': [
    { id: 'ward-5-1', name: 'Jaba Ward 1', nameHa: 'Unguwa 1, Jaba' },
    { id: 'ward-5-2', name: 'Jaba Ward 2', nameHa: 'Unguwa 2, Jaba' },
  ],
  'lga-6': [
    { id: 'ward-6-1', name: 'Jema\'a Ward 1', nameHa: 'Unguwa 1, Jema\'a' },
    { id: 'ward-6-2', name: 'Jema\'a Ward 2', nameHa: 'Unguwa 2, Jema\'a' },
  ],
  'lga-7': [
    { id: 'ward-7-1', name: 'Kaduna North Ward 1', nameHa: 'Unguwa 1, Arewacin Kaduna' },
    { id: 'ward-7-2', name: 'Kaduna North Ward 2', nameHa: 'Unguwa 2, Arewacin Kaduna' },
  ],
  'lga-8': [
    { id: 'ward-8-1', name: 'Kaduna South Ward 1', nameHa: 'Unguwa 1, Kudancin Kaduna' },
    { id: 'ward-8-2', name: 'Kaduna South Ward 2', nameHa: 'Unguwa 2, Kudancin Kaduna' },
  ],
  'lga-9': [
    { id: 'ward-9-1', name: 'Kajuru Ward 1', nameHa: 'Unguwa 1, Kajuru' },
    { id: 'ward-9-2', name: 'Kajuru Ward 2', nameHa: 'Unguwa 2, Kajuru' },
  ],
  'lga-10': [
    { id: 'ward-10-1', name: 'Kaura Ward 1', nameHa: 'Unguwa 1, Kaura' },
    { id: 'ward-10-2', name: 'Kaura Ward 2', nameHa: 'Unguwa 2, Kaura' },
  ],
};
