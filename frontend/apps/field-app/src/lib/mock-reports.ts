import { ReportState, SubmissionMethod } from '@wdc/domain';

export interface MockReport {
  id: string;
  formVersionId: string;
  wardId: string;
  wardName: string;
  submittedBy: string;
  submissionMethod: SubmissionMethod;
  state: ReportState;
  sealedAt: string | null;
  canonical: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const mockReports: MockReport[] = [
  {
    id: 'rpt-1',
    formVersionId: 'fv-1',
    wardId: 'ward-1-1',
    wardName: 'Birnin Gwari Ward 1',
    submittedBy: 'user-1',
    submissionMethod: 'wizard',
    state: 'draft',
    sealedAt: null,
    canonical: { attendance: 45, agenda_items: 3, meeting_date: '2024-06-15' },
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
  {
    id: 'rpt-2',
    formVersionId: 'fv-1',
    wardId: 'ward-1-1',
    wardName: 'Birnin Gwari Ward 1',
    submittedBy: 'user-1',
    submissionMethod: 'amira',
    state: 'submitted',
    sealedAt: null,
    canonical: { attendance: 52, agenda_items: 4, meeting_date: '2024-06-08' },
    createdAt: '2024-06-08T14:30:00Z',
    updatedAt: '2024-06-08T14:30:00Z',
  },
  {
    id: 'rpt-3',
    formVersionId: 'fv-1',
    wardId: 'ward-1-2',
    wardName: 'Birnin Gwari Ward 2',
    submittedBy: 'user-1',
    submissionMethod: 'snap',
    state: 'approved',
    sealedAt: null,
    canonical: { attendance: 38, agenda_items: 2, meeting_date: '2024-06-05' },
    createdAt: '2024-06-05T09:15:00Z',
    updatedAt: '2024-06-09T11:00:00Z',
  },
  {
    id: 'rpt-4',
    formVersionId: 'fv-1',
    wardId: 'ward-1-1',
    wardName: 'Birnin Gwari Ward 1',
    submittedBy: 'user-1',
    submissionMethod: 'wizard',
    state: 'returned',
    sealedAt: null,
    canonical: { attendance: 30, agenda_items: 1, meeting_date: '2024-06-01' },
    createdAt: '2024-06-01T08:00:00Z',
    updatedAt: '2024-06-03T16:20:00Z',
  },
  {
    id: 'rpt-5',
    formVersionId: 'fv-1',
    wardId: 'ward-2-1',
    wardName: 'Chikun Ward 1',
    submittedBy: 'user-1',
    submissionMethod: 'wizard',
    state: 'draft',
    sealedAt: null,
    canonical: { attendance: 60, agenda_items: 5, meeting_date: '2024-06-12' },
    createdAt: '2024-06-12T11:00:00Z',
    updatedAt: '2024-06-12T11:00:00Z',
  },
];
