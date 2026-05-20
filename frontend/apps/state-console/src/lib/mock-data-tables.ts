import { ReportState } from '@wdc/domain';

export interface SubmissionRow {
  id: string;
  ward: string;
  lga: string;
  secretary: string;
  submittedAt: string;
  status: ReportState;
  method: 'wizard' | 'amira' | 'snap';
}

export interface InvestigationCase {
  id: string;
  caseId: string;
  reportId: string;
  title: string;
  assignedTo: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  openedAt: string;
  updatedAt: string;
}

export interface UserRow {
  id: string;
  name: string;
  role: 'secretary' | 'coordinator' | 'director';
  phone: string;
  lga: string;
  ward: string | null;
  status: 'active' | 'suspended';
  lastActive: string;
}

export const mockSubmissions: SubmissionRow[] = [
  { id: 's1', ward: 'Birnin Gwari Ward 1', lga: 'Birnin Gwari', secretary: 'Aisha Bello', submittedAt: '2024-06-15T09:00:00Z', status: 'approved', method: 'wizard' },
  { id: 's2', ward: 'Chikun Ward 2', lga: 'Chikun', secretary: 'Ibrahim Musa', submittedAt: '2024-06-14T14:30:00Z', status: 'submitted', method: 'amira' },
  { id: 's3', ward: 'Giwa Ward 1', lga: 'Giwa', secretary: 'Fatima Yusuf', submittedAt: '2024-06-13T10:15:00Z', status: 'in_review', method: 'snap' },
  { id: 's4', ward: 'Igabi Ward 3', lga: 'Igabi', secretary: 'Abdulahi Sule', submittedAt: '2024-06-12T08:45:00Z', status: 'returned', method: 'wizard' },
  { id: 's5', ward: 'Jaba Ward 1', lga: 'Jaba', secretary: 'Mariam John', submittedAt: '2024-06-11T16:20:00Z', status: 'sealed', method: 'wizard' },
  { id: 's6', ward: 'Kaduna North Ward 2', lga: 'Kaduna North', secretary: 'Samuel Adamu', submittedAt: '2024-06-10T11:00:00Z', status: 'approved', method: 'snap' },
  { id: 's7', ward: 'Zaria Ward 5', lga: 'Zaria', secretary: 'Halima Garba', submittedAt: '2024-06-09T07:30:00Z', status: 'submitted', method: 'amira' },
  { id: 's8', ward: 'Kajuru Ward 1', lga: 'Kajuru', secretary: 'David Joshua', submittedAt: '2024-06-08T13:45:00Z', status: 'approved', method: 'wizard' },
  { id: 's9', ward: 'Kaura Ward 2', lga: 'Kaura', secretary: 'Grace Emmanuel', submittedAt: '2024-06-07T09:15:00Z', status: 'returned', method: 'snap' },
  { id: 's10', ward: 'Sabon Gari Ward 3', lga: 'Sabon Gari', secretary: 'James Peter', submittedAt: '2024-06-06T15:00:00Z', status: 'sealed', method: 'wizard' },
  { id: 's11', ward: 'Soba Ward 1', lga: 'Soba', secretary: 'Ruth Ibrahim', submittedAt: '2024-06-05T10:30:00Z', status: 'submitted', method: 'amira' },
  { id: 's12', ward: 'Lere Ward 2', lga: 'Lere', secretary: 'Paul Daniel', submittedAt: '2024-06-04T08:00:00Z', status: 'in_review', method: 'wizard' },
];

export const mockInvestigations: InvestigationCase[] = [
  { id: 'i1', caseId: 'INV-2024-001', reportId: 'rpt-1234', title: 'Attendance discrepancy in Birnin Gwari Ward 1', assignedTo: 'Ibrahim Abdullahi', status: 'open', priority: 'high', openedAt: '2024-06-15T10:00:00Z', updatedAt: '2024-06-15T10:00:00Z' },
  { id: 'i2', caseId: 'INV-2024-002', reportId: 'rpt-1235', title: 'Missing agenda items in Chikun Ward 2', assignedTo: 'Maryam Hassan', status: 'in_progress', priority: 'medium', openedAt: '2024-06-14T09:00:00Z', updatedAt: '2024-06-15T14:00:00Z' },
  { id: 'i3', caseId: 'INV-2024-003', reportId: 'rpt-1236', title: 'Duplicate submission from Giwa Ward 1', assignedTo: 'Unassigned', status: 'open', priority: 'low', openedAt: '2024-06-13T11:00:00Z', updatedAt: '2024-06-13T11:00:00Z' },
  { id: 'i4', caseId: 'INV-2024-004', reportId: 'rpt-1237', title: 'Falsified attendance record in Jaba Ward 1', assignedTo: 'Ibrahim Abdullahi', status: 'resolved', priority: 'critical', openedAt: '2024-06-10T08:00:00Z', updatedAt: '2024-06-14T16:00:00Z' },
  { id: 'i5', caseId: 'INV-2024-005', reportId: 'rpt-1238', title: 'Late submission pattern in Zaria Ward 5', assignedTo: 'Maryam Hassan', status: 'closed', priority: 'medium', openedAt: '2024-06-05T10:00:00Z', updatedAt: '2024-06-12T09:00:00Z' },
];

export interface FormRow {
  id: string;
  title: string;
  titleHa: string;
  scopeKind: 'state' | 'lga' | 'ward';
  scopeIds: string[];
  status: 'draft' | 'deployed' | 'archived';
  versionNumber: number;
  updatedAt: string;
}

export interface FormField {
  id: string;
  label: string;
  labelHa: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: string[];
}

export const mockForms: FormRow[] = [
  { id: 'f1', title: 'Monthly Ward Meeting Report', titleHa: 'Rahoton Taro na Unguwa na Wata-mako', scopeKind: 'ward', scopeIds: ['all'], status: 'deployed', versionNumber: 3, updatedAt: '2024-06-10T08:00:00Z' },
  { id: 'f2', title: 'Quarterly LGA Summary', titleHa: 'Takaitawar LGA na Kwata', scopeKind: 'lga', scopeIds: ['all'], status: 'deployed', versionNumber: 2, updatedAt: '2024-05-20T10:00:00Z' },
  { id: 'f3', title: 'Emergency Incident Form', titleHa: 'Tsarin Lamari na Gaggawa', scopeKind: 'state', scopeIds: ['all'], status: 'draft', versionNumber: 1, updatedAt: '2024-06-14T14:30:00Z' },
  { id: 'f4', title: 'Budget Allocation Tracker', titleHa: 'Mai Binde Rarraba Kasafin Kudi', scopeKind: 'ward', scopeIds: ['all'], status: 'archived', versionNumber: 1, updatedAt: '2024-01-15T09:00:00Z' },
];

export const mockFormFields: Record<string, FormField[]> = {
  f1: [
    { id: 'fld-1', label: 'Meeting Date', labelHa: 'Ranar Taro', type: 'date', required: true },
    { id: 'fld-2', label: 'Attendance Count', labelHa: 'Yawan Halartar', type: 'number', required: true },
    { id: 'fld-3', label: 'Agenda Items', labelHa: 'Abubuwan Taro', type: 'textarea', required: false },
    { id: 'fld-4', label: 'Decisions Made', labelHa: 'Sulallun da aka yanke', type: 'textarea', required: false },
    { id: 'fld-5', label: 'Next Meeting Date', labelHa: 'Ranar Taro na gaba', type: 'date', required: false },
  ],
  f2: [
    { id: 'fld-6', label: 'LGA Name', labelHa: 'Sunan LGA', type: 'text', required: true },
    { id: 'fld-7', label: 'Total Wards', labelHa: 'Jimillar Unguwoyi', type: 'number', required: true },
    { id: 'fld-8', label: 'Reports Submitted', labelHa: 'Rahotannin da aka tura', type: 'number', required: true },
  ],
  f3: [
    { id: 'fld-9', label: 'Incident Type', labelHa: 'Nau\'in Lamari', type: 'select', required: true, options: ['Flood', 'Fire', 'Accident', 'Disease Outbreak', 'Security'] },
    { id: 'fld-10', label: 'Location', labelHa: 'Wuri', type: 'text', required: true },
    { id: 'fld-11', label: 'Description', labelHa: 'Bayani', type: 'textarea', required: true },
    { id: 'fld-12', label: 'Requires Follow-up', labelHa: 'Bukatar Bi da Baya', type: 'checkbox', required: false },
  ],
  f4: [
    { id: 'fld-13', label: 'Project Name', labelHa: 'Sunan Aiki', type: 'text', required: true },
    { id: 'fld-14', label: 'Allocated Amount', labelHa: 'Adadin da aka ware', type: 'number', required: true },
    { id: 'fld-15', label: 'Spent Amount', labelHa: 'Adadin da aka kashe', type: 'number', required: true },
  ],
};

export interface BroadcastRow {
  id: string;
  subject: string;
  body: string;
  channels: string[];
  recipientCount: number;
  sentAt: string;
  status: 'delivered' | 'pending' | 'failed';
}

export interface AuditLogRow {
  id: string;
  timestamp: string;
  actor: string;
  action: 'create' | 'update' | 'delete' | 'seal';
  resource: string;
  details: string;
}

export const mockBroadcasts: BroadcastRow[] = [
  { id: 'b1', subject: 'Q2 Report Deadline Reminder', body: 'Please submit all Q2 ward meeting reports by June 30.', channels: ['in_app', 'sms'], recipientCount: 156, sentAt: '2024-06-15T08:00:00Z', status: 'delivered' },
  { id: 'b2', subject: 'New Form Available', body: 'The emergency incident form is now live statewide.', channels: ['in_app', 'email'], recipientCount: 42, sentAt: '2024-06-14T10:30:00Z', status: 'delivered' },
  { id: 'b3', subject: 'System Maintenance', body: 'Scheduled maintenance tonight 23:00–01:00.', channels: ['in_app'], recipientCount: 200, sentAt: '2024-06-13T14:00:00Z', status: 'pending' },
];

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ type: 'report' | 'form' | 'investigation'; id: string; label: string }>;
  actions?: Array<{ label: string; href: string }>;
  createdAt: string;
}

export const mockAiConversation: AiMessage[] = [
  {
    id: 'ai-msg-1',
    role: 'user',
    content: 'Summarize the submission trends for Zaria LGA this month.',
    createdAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 'ai-msg-2',
    role: 'assistant',
    content: 'Zaria LGA has shown a 23% increase in submissions this month compared to last month. The approval rate is 86%, which is above the state average of 78%. However, there are 4 wards with overdue reports: Ward 3 (5 days), Ward 7 (3 days), Ward 12 (2 days), and Ward 15 (1 day).',
    citations: [
      { type: 'report', id: 'rpt-1234', label: 'Zaria Ward 5 — June Report' },
      { type: 'report', id: 'rpt-1235', label: 'Zaria Ward 7 — June Report' },
    ],
    actions: [
      { label: 'ai.action.viewReport', href: '/review/rpt-1234' },
      { label: 'ai.action.sendReminder', href: '/messages' },
    ],
    createdAt: '2024-06-15T10:00:05Z',
  },
  {
    id: 'ai-msg-3',
    role: 'user',
    content: 'What anomalies were detected in Birnin Gwari Ward 1?',
    createdAt: '2024-06-15T10:05:00Z',
  },
  {
    id: 'ai-msg-4',
    role: 'assistant',
    content: 'Anomaly detected: The attendance count in Birnin Gwari Ward 1 dropped from 52 last month to 12 this month — a 77% decrease. The meeting duration also shortened significantly. This triggered investigation INV-2024-001.',
    citations: [
      { type: 'investigation', id: 'i1', label: 'INV-2024-001 — Attendance Discrepancy' },
      { type: 'report', id: 'rpt-1198', label: 'Birnin Gwari Ward 1 — June Report' },
    ],
    actions: [
      { label: 'ai.action.openInvestigation', href: '/investigations/i1' },
      { label: 'ai.action.viewReport', href: '/review/rpt-1198' },
    ],
    createdAt: '2024-06-15T10:05:08Z',
  },
];

export const mockAiCapabilities = [
  { key: 'ai.capability.summarize', icon: '📝' },
  { key: 'ai.capability.compare', icon: '⚖' },
  { key: 'ai.capability.anomaly', icon: '🔍' },
  { key: 'ai.capability.recommend', icon: '💡' },
];

export const mockRecentPrompts = [
  'Summarize Zaria LGA trends',
  'Compare Kaduna North vs Kaduna South',
  'Why did Giwa LGA drop 40%?',
  'Overdue wards in Jaba',
];

export const mockAuditLogs: AuditLogRow[] = [
  { id: 'a1', timestamp: '2024-06-15T09:12:00Z', actor: 'Ibrahim Abdullahi', action: 'update', resource: 'Report rpt-1234', details: 'Approved report from Birnin Gwari Ward 1' },
  { id: 'a2', timestamp: '2024-06-15T08:45:00Z', actor: 'System', action: 'seal', resource: 'Report rpt-1201', details: 'Auto-sealed after 30 days' },
  { id: 'a3', timestamp: '2024-06-14T16:20:00Z', actor: 'Maryam Hassan', action: 'create', resource: 'Investigation INV-2024-002', details: 'Opened investigation for missing agenda items' },
  { id: 'a4', timestamp: '2024-06-14T11:00:00Z', actor: 'Director General', action: 'update', resource: 'Form f1', details: 'Deployed new version v3' },
  { id: 'a5', timestamp: '2024-06-13T09:30:00Z', actor: 'Ibrahim Abdullahi', action: 'delete', resource: 'User u7', details: 'Suspended Abdulahi Sule' },
  { id: 'a6', timestamp: '2024-06-12T14:15:00Z', actor: 'System', action: 'create', resource: 'Report rpt-1234', details: 'Submitted via wizard by Aisha Bello' },
  { id: 'a7', timestamp: '2024-06-10T10:00:00Z', actor: 'Maryam Hassan', action: 'seal', resource: 'Report rpt-1199', details: 'Manual seal after review' },
  { id: 'a8', timestamp: '2024-06-09T08:00:00Z', actor: 'Director General', action: 'create', resource: 'Form f3', details: 'Created emergency incident form' },
];

export const mockUsers: UserRow[] = [
  { id: 'u1', name: 'Aisha Bello', role: 'secretary', phone: '+2348012345678', lga: 'Birnin Gwari', ward: 'Ward 1', status: 'active', lastActive: '2024-06-15T09:00:00Z' },
  { id: 'u2', name: 'Ibrahim Musa', role: 'secretary', phone: '+2348023456789', lga: 'Chikun', ward: 'Ward 2', status: 'active', lastActive: '2024-06-14T14:30:00Z' },
  { id: 'u3', name: 'Fatima Yusuf', role: 'secretary', phone: '+2348034567890', lga: 'Giwa', ward: 'Ward 1', status: 'active', lastActive: '2024-06-13T10:15:00Z' },
  { id: 'u4', name: 'Ibrahim Abdullahi', role: 'coordinator', phone: '+2348045678901', lga: 'Chikun', ward: null, status: 'active', lastActive: '2024-06-15T16:00:00Z' },
  { id: 'u5', name: 'Maryam Hassan', role: 'coordinator', phone: '+2348056789012', lga: 'Zaria', ward: null, status: 'active', lastActive: '2024-06-14T11:00:00Z' },
  { id: 'u6', name: 'Director General', role: 'director', phone: '+2348067890123', lga: 'All', ward: null, status: 'active', lastActive: '2024-06-15T08:00:00Z' },
  { id: 'u7', name: 'Abdulahi Sule', role: 'secretary', phone: '+2348078901234', lga: 'Igabi', ward: 'Ward 3', status: 'suspended', lastActive: '2024-06-01T10:00:00Z' },
  { id: 'u8', name: 'Mariam John', role: 'secretary', phone: '+2348089012345', lga: 'Jaba', ward: 'Ward 1', status: 'active', lastActive: '2024-06-11T16:20:00Z' },
  { id: 'u9', name: 'Samuel Adamu', role: 'secretary', phone: '+2348090123456', lga: 'Kaduna North', ward: 'Ward 2', status: 'active', lastActive: '2024-06-10T11:00:00Z' },
  { id: 'u10', name: 'Halima Garba', role: 'secretary', phone: '+2348101234567', lga: 'Zaria', ward: 'Ward 5', status: 'active', lastActive: '2024-06-09T07:30:00Z' },
];
