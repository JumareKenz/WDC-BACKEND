export interface KpiData {
  label: string;
  value: number;
  change: number; // percent change from last month
  changeLabel: string;
  color: string;
}

export interface LgaHeatmapData {
  id: string;
  name: string;
  submissions: number;
  approved: number;
  pending: number;
  returned: number;
}

export interface AiInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface NeedsAttentionItem {
  id: string;
  type: 'overdue' | 'returned' | 'pendingSealing';
  title: string;
  ward: string;
  lga: string;
  daysOverdue?: number;
  submittedAt: string;
}

export const mockKpis: KpiData[] = [
  {
    label: 'kpi.totalSubmissions',
    value: 2847,
    change: 12.5,
    changeLabel: 'kpi.fromLastMonth',
    color: 'forestGreen',
  },
  {
    label: 'kpi.approved',
    value: 1923,
    change: 8.3,
    changeLabel: 'kpi.fromLastMonth',
    color: 'forestGreenDark',
  },
  {
    label: 'kpi.pendingReview',
    value: 412,
    change: -5.2,
    changeLabel: 'kpi.fromLastMonth',
    color: 'amber',
  },
  {
    label: 'kpi.returned',
    value: 156,
    change: 3.1,
    changeLabel: 'kpi.fromLastMonth',
    color: 'softRed',
  },
  {
    label: 'kpi.sealed',
    value: 892,
    change: 15.7,
    changeLabel: 'kpi.fromLastMonth',
    color: 'aubergine',
  },
];

export const mockLgaHeatmap: LgaHeatmapData[] = [
  { id: 'lga-1', name: 'Birnin Gwari', submissions: 142, approved: 98, pending: 24, returned: 8 },
  { id: 'lga-2', name: 'Chikun', submissions: 198, approved: 156, pending: 28, returned: 14 },
  { id: 'lga-3', name: 'Giwa', submissions: 87, approved: 52, pending: 18, returned: 4 },
  { id: 'lga-4', name: 'Igabi', submissions: 134, approved: 92, pending: 22, returned: 12 },
  { id: 'lga-5', name: 'Jaba', submissions: 76, approved: 48, pending: 14, returned: 6 },
  { id: 'lga-6', name: 'Jema\'a', submissions: 112, approved: 74, pending: 20, returned: 8 },
  { id: 'lga-7', name: 'Kaduna North', submissions: 245, approved: 198, pending: 32, returned: 15 },
  { id: 'lga-8', name: 'Kaduna South', submissions: 221, approved: 178, pending: 28, returned: 15 },
  { id: 'lga-9', name: 'Kajuru', submissions: 98, approved: 62, pending: 18, returned: 8 },
  { id: 'lga-10', name: 'Kaura', submissions: 67, approved: 42, pending: 12, returned: 4 },
  { id: 'lga-11', name: 'Kubau', submissions: 54, approved: 32, pending: 10, returned: 4 },
  { id: 'lga-12', name: 'Kudan', submissions: 43, approved: 28, pending: 8, returned: 3 },
  { id: 'lga-13', name: 'Lere', submissions: 89, approved: 56, pending: 16, returned: 8 },
  { id: 'lga-14', name: 'Makarfi', submissions: 72, approved: 48, pending: 12, returned: 6 },
  { id: 'lga-15', name: 'Sabon Gari', submissions: 156, approved: 112, pending: 24, returned: 12 },
  { id: 'lga-16', name: 'Sanga', submissions: 38, approved: 24, pending: 6, returned: 4 },
  { id: 'lga-17', name: 'Soba', submissions: 82, approved: 52, pending: 14, returned: 8 },
  { id: 'lga-18', name: 'Zangon Kataf', submissions: 64, approved: 42, pending: 12, returned: 4 },
  { id: 'lga-19', name: 'Zaria', submissions: 312, approved: 268, pending: 28, returned: 16 },
  { id: 'lga-20', name: 'Kachia', submissions: 94, approved: 62, pending: 18, returned: 8 },
  { id: 'lga-21', name: 'Kagarko', submissions: 52, approved: 32, pending: 10, returned: 4 },
  { id: 'lga-22', name: 'Jema\'a (South)', submissions: 78, approved: 48, pending: 14, returned: 8 },
  { id: 'lga-23', name: 'Kaura (North)', submissions: 61, approved: 38, pending: 12, returned: 4 },
];

export const mockAiInsights: AiInsight[] = [
  {
    id: 'ai-1',
    type: 'trend',
    title: 'Submission rates up 12% this month',
    description: 'Ward secretaries in Kaduna North and Zaria LGAs are submitting reports 2 days earlier on average.',
    severity: 'info',
  },
  {
    id: 'ai-2',
    type: 'anomaly',
    title: 'Giwa LGA reports dropped 40%',
    description: 'Only 3 reports submitted in the last 7 days vs. 12 in the previous week.',
    severity: 'warning',
  },
  {
    id: 'ai-3',
    type: 'recommendation',
    title: 'Send reminder to 4 wards in Jaba',
    description: 'Reports are overdue for more than 5 days in Jaba Ward 1, 2, 3, and 5.',
    severity: 'critical',
  },
];

export interface AnalyticsPeriod {
  label: string;
  submissions: number;
  approved: number;
  returned: number;
}

export const mockAnalyticsPeriods: AnalyticsPeriod[] = [
  { label: '2024-W23', submissions: 142, approved: 98, returned: 12 },
  { label: '2024-W24', submissions: 156, approved: 112, returned: 8 },
  { label: '2024-W25', submissions: 198, approved: 156, returned: 14 },
  { label: '2024-W26', submissions: 134, approved: 92, returned: 12 },
  { label: '2024-W27', submissions: 187, approved: 142, returned: 10 },
  { label: '2024-W28', submissions: 245, approved: 198, returned: 15 },
];

export const mockAnalyticsByMethod = [
  { method: 'wizard', count: 1842 },
  { method: 'amira', count: 623 },
  { method: 'snap', count: 382 },
];

export const mockNeedsAttention: NeedsAttentionItem[] = [
  {
    id: 'na-1',
    type: 'overdue',
    title: 'Monthly Ward Meeting Report',
    ward: 'Jaba Ward 1',
    lga: 'Jaba',
    daysOverdue: 7,
    submittedAt: '2024-06-08T00:00:00Z',
  },
  {
    id: 'na-2',
    type: 'overdue',
    title: 'Monthly Ward Meeting Report',
    ward: 'Jaba Ward 2',
    lga: 'Jaba',
    daysOverdue: 6,
    submittedAt: '2024-06-09T00:00:00Z',
  },
  {
    id: 'na-3',
    type: 'returned',
    title: 'Monthly Ward Meeting Report',
    ward: 'Chikun Ward 3',
    lga: 'Chikun',
    submittedAt: '2024-06-10T00:00:00Z',
  },
  {
    id: 'na-4',
    type: 'pendingSealing',
    title: 'Monthly Ward Meeting Report',
    ward: 'Zaria Ward 5',
    lga: 'Zaria',
    submittedAt: '2024-06-05T00:00:00Z',
  },
  {
    id: 'na-5',
    type: 'overdue',
    title: 'Monthly Ward Meeting Report',
    ward: 'Giwa Ward 2',
    lga: 'Giwa',
    daysOverdue: 5,
    submittedAt: '2024-06-10T00:00:00Z',
  },
];
