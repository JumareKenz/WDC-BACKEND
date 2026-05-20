export interface MockMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  createdAt: string;
  read: boolean;
}

export const mockMessages: MockMessage[] = [
  {
    id: 'msg-1',
    subject: 'Monthly Report Reminder',
    body: 'Please submit your ward monthly report by Friday.',
    from: 'LGA Coordinator',
    createdAt: '2024-06-14T09:00:00Z',
    read: false,
  },
  {
    id: 'msg-2',
    subject: 'Training Session',
    body: 'New training on digital reporting tools next Monday.',
    from: 'State Director',
    createdAt: '2024-06-10T14:00:00Z',
    read: true,
  },
];

export interface MockAlert {
  id: string;
  type: 'reportReturned' | 'reportApproved' | 'system';
  message: string;
  reportId?: string;
  createdAt: string;
  read: boolean;
}

export const mockAlerts: MockAlert[] = [
  {
    id: 'alt-1',
    type: 'reportReturned',
    message: 'Report returned for revision',
    reportId: 'rpt-4',
    createdAt: '2024-06-03T16:20:00Z',
    read: false,
  },
  {
    id: 'alt-2',
    type: 'reportApproved',
    message: 'Report approved',
    reportId: 'rpt-3',
    createdAt: '2024-06-09T11:00:00Z',
    read: true,
  },
];
