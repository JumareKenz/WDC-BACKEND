export const enMessages = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
  'common.submit': 'Submit',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.sort': 'Sort',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.confirm': 'Confirm',
  'common.dismiss': 'Dismiss',
  'common.seeAll': 'See all',
  'common.more': 'More',
  'common.less': 'Less',

  // Auth
  'auth.signIn': 'Sign In',
  'auth.signOut': 'Sign Out',
  'auth.pin': 'PIN',
  'auth.phone': 'Phone Number',
  'auth.password': 'Password',
  'auth.forgotPassword': 'Forgot password?',
  'auth.createAccount': 'Create account',
  'auth.welcome': 'Welcome',

  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.reports': 'Reports',
  'nav.messages': 'Messages',
  'nav.settings': 'Settings',
  'nav.profile': 'Profile',
  'nav.overview': 'Overview',
  'nav.wards': 'Wards',
  'nav.queue': 'Queue',
  'nav.alerts': 'Alerts',

  // Reports
  'reports.new': 'New Report',
  'reports.draft': 'Draft',
  'reports.submitted': 'Submitted',
  'reports.inReview': 'In Review',
  'reports.approved': 'Approved',
  'reports.returned': 'Returned',
  'reports.sealed': 'Sealed',
  'reports.status': 'Status',
  'reports.date': 'Date',
  'reports.ward': 'Ward',
  'reports.lga': 'LGA',
  'reports.meetingDate': 'Meeting Date',
  'reports.attendance': 'Attendance',
  'reports.agenda': 'Agenda',
  'reports.actions': 'Actions',
  'reports.comments': 'Comments',

  // Forms
  'forms.text': 'Text',
  'forms.number': 'Number',
  'forms.date': 'Date',
  'forms.select': 'Select',
  'forms.photo': 'Photo',
  'forms.voice': 'Voice',
  'forms.required': 'Required',
  'forms.optional': 'Optional',

  // Sync
  'sync.offline': 'You are offline',
  'sync.online': 'Back online',
  'sync.syncing': 'Syncing...',
  'sync.synced': 'Synced',
  'sync.pending': '{count} reports pending',
  'sync.lastSync': 'Last synced: {time}',

  // Toast
  'toast.saved': 'Saved successfully',
  'toast.submitted': 'Submitted successfully',
  'toast.error': 'Something went wrong',
  'toast.deleted': 'Deleted',
  'toast.syncComplete': 'Sync complete',

  // Roles
  'role.secretary': 'Ward Secretary',
  'role.coordinator': 'LGA Coordinator',
  'role.director': 'State Director',

  // Actions
  'action.approve': 'Approve',
  'action.return': 'Return',
  'action.review': 'Review',
  'action.assign': 'Assign',
  'action.sendReminder': 'Send Reminder',

  // AI Assistant
  'ai.ask': 'Ask a question...',
  'ai.thinking': 'Thinking...',
  'ai.sources': 'Sources',
  'ai.noData': 'No data available to answer this question',
} as const;

export type EnMessageKey = keyof typeof enMessages;
