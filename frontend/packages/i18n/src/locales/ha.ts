export const haMessages = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Kuskure ya faru',
  'common.retry': 'Gwada',
  'common.cancel': 'Soke',
  'common.save': 'Ajiye',
  'common.delete': 'Goge',
  'common.edit': 'Shirya',
  'common.close': 'Rufe',
  'common.submit': 'Tura',
  'common.next': 'Na gaba',
  'common.back': 'Baya',
  'common.done': 'Gama',
  'common.search': 'Nema',
  'common.filter': 'Tace',
  'common.sort': 'Tsara',
  'common.yes': 'Eh',
  'common.no': 'A a',
  'common.confirm': 'Tabbatar',
  'common.dismiss': 'Rufe',
  'common.seeAll': 'Duba duk',
  'common.more': 'Kara',
  'common.less': 'Mafi ƙaranci',

  // Auth
  'auth.signIn': 'Shiga',
  'auth.signOut': 'Fita',
  'auth.pin': 'PIN',
  'auth.phone': 'Lambar tarho',
  'auth.password': 'Kalmar sirri',
  'auth.forgotPassword': 'An manta kalmar sirri?',
  'auth.createAccount': 'Bude sabon asusu',
  'auth.welcome': 'Barka da zuwa',

  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.reports': 'Rahotanni',
  'nav.messages': 'Sakoonai',
  'nav.settings': 'Saiti',
  'nav.profile': 'Bayani',
  'nav.overview': 'Bayanin bayani',
  'nav.wards': 'Unguwoyi',
  'nav.queue': 'Jere',
  'nav.alerts': 'Hango',

  // Reports
  'reports.new': 'Sabon Rahoto',
  'reports.draft': 'Shirin',
  'reports.submitted': 'An tura',
  'reports.inReview': 'A kan dubawa',
  'reports.approved': 'An amince',
  'reports.returned': 'An dawo',
  'reports.sealed': 'An rufe',
  'reports.status': 'Matsayi',
  'reports.date': 'Kwanan wata',
  'reports.ward': 'Unguwa',
  'reports.lga': 'LGA',
  'reports.meetingDate': 'Ranar Taro',
  'reports.attendance': 'Halartar',
  'reports.agenda': 'Shirin taro',
  'reports.actions': 'Ayyuka',
  'reports.comments': 'Sharhi',

  // Forms
  'forms.text': 'Rubutu',
  'forms.number': 'Lamba',
  'forms.date': 'Kwanan wata',
  'forms.select': 'Zaɓi',
  'forms.photo': 'Hoton',
  'forms.voice': 'Murya',
  'forms.required': 'Wajibi',
  'forms.optional': 'Na zaɓi',

  // Sync
  'sync.offline': 'Babu hanyar sadarwa',
  'sync.online': 'An dawo kan hanyar sadarwa',
  'sync.syncing': 'An haɗa...',
  'sync.synced': 'An haɗa',
  'sync.pending': 'Rahotanni {count} suna jira',
  'sync.lastSync': 'An haɗa karshe: {time}',

  // Toast
  'toast.saved': 'An ajiye cikin nasara',
  'toast.submitted': 'An tura cikin nasara',
  'toast.error': 'Wani abu bai yi ba',
  'toast.deleted': 'An goge',
  'toast.syncComplete': 'An gama haɗa',

  // Roles
  'role.secretary': 'Sakataren Unguwa',
  'role.coordinator': 'Hafsan LGA',
  'role.director': 'Daraktan Jihar',

  // Actions
  'action.approve': 'Amince',
  'action.return': 'Dawo',
  'action.review': 'Duba',
  'action.assign': 'Ba wa',
  'action.sendReminder': 'Tura tunatarwa',

  // AI Assistant
  'ai.ask': 'Tambayi wani tambaya...',
  'ai.thinking': 'Tana tunani...',
  'ai.sources': 'Masu bayani',
  'ai.noData': 'Babu bayani da za a amsa wannan tambaya',
} as const;

export type HaMessageKey = keyof typeof haMessages;
