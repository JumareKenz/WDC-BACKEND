import { mockReports as baseReports } from './mock-reports';

export const mockCoordinatorUser = {
  id: 'user-coord-1',
  role: 'coordinator' as const,
  fullName: 'Ibrahim Abdullahi',
  phone: '+2348023456789',
  lgaId: 'lga-2',
  wardId: null,
  status: 'active' as const,
};

// Coordinator sees reports from all wards in their LGA (lga-2 = Chikun)
export const mockCoordinatorReports = [
  ...baseReports,
  {
    id: 'rpt-c1',
    formVersionId: 'fv-1',
    wardId: 'ward-2-1',
    wardName: 'Chikun Ward 1',
    submittedBy: 'user-sec-1',
    submissionMethod: 'wizard' as const,
    state: 'submitted' as const,
    sealedAt: null,
    canonical: { attendance: 55, agenda_items: 4, meeting_date: '2024-06-14' },
    createdAt: '2024-06-14T09:00:00Z',
    updatedAt: '2024-06-14T09:00:00Z',
  },
  {
    id: 'rpt-c2',
    formVersionId: 'fv-1',
    wardId: 'ward-2-2',
    wardName: 'Chikun Ward 2',
    submittedBy: 'user-sec-2',
    submissionMethod: 'amira' as const,
    state: 'in_review' as const,
    sealedAt: null,
    canonical: { attendance: 42, agenda_items: 3, meeting_date: '2024-06-13' },
    createdAt: '2024-06-13T10:30:00Z',
    updatedAt: '2024-06-13T14:00:00Z',
  },
  {
    id: 'rpt-c3',
    formVersionId: 'fv-1',
    wardId: 'ward-2-3',
    wardName: 'Chikun Ward 3',
    submittedBy: 'user-sec-3',
    submissionMethod: 'snap' as const,
    state: 'submitted' as const,
    sealedAt: null,
    canonical: { attendance: 38, agenda_items: 2, meeting_date: '2024-06-12' },
    createdAt: '2024-06-12T08:15:00Z',
    updatedAt: '2024-06-12T08:15:00Z',
  },
  {
    id: 'rpt-c4',
    formVersionId: 'fv-1',
    wardId: 'ward-2-1',
    wardName: 'Chikun Ward 1',
    submittedBy: 'user-sec-1',
    submissionMethod: 'wizard' as const,
    state: 'returned' as const,
    sealedAt: null,
    canonical: { attendance: 30, agenda_items: 1, meeting_date: '2024-06-10' },
    createdAt: '2024-06-10T11:00:00Z',
    updatedAt: '2024-06-11T16:20:00Z',
  },
];

export const mockWardsForCoordinator = [
  { id: 'ward-2-1', name: 'Chikun Ward 1', nameHa: 'Unguwa 1, Chikun', reportCount: 2 },
  { id: 'ward-2-2', name: 'Chikun Ward 2', nameHa: 'Unguwa 2, Chikun', reportCount: 1 },
  { id: 'ward-2-3', name: 'Chikun Ward 3', nameHa: 'Unguwa 3, Chikun', reportCount: 1 },
];
