// API Client - generated from OpenAPI
// To be implemented in M5

import type { AxiosInstance } from 'axios';

export interface WdcClient {
  auth: {
    signInMobile: (phone: string, pin: string, deviceId: string) => Promise<TokenResponse>;
    signInConsole: (email: string, password: string, totp: string, deviceId: string) => Promise<TokenResponse>;
    refresh: (refreshToken: string, deviceId: string) => Promise<TokenResponse>;
    signOut: () => Promise<void>;
  };
  users: {
    list: () => Promise<User[]>;
    get: (id: string) => Promise<User>;
    create: (data: CreateUser) => Promise<User>;
    updateAssignment: (id: string, lgaId: string, wardId: string) => Promise<User>;
    suspend: (id: string) => Promise<void>;
    reactivate: (id: string) => Promise<void>;
  };
  forms: {
    list: () => Promise<Form[]>;
    get: (id: string) => Promise<Form>;
    visible: () => Promise<Form[]>;
  };
  reports: {
    list: () => Promise<Report[]>;
    get: (id: string) => Promise<Report>;
    create: (data: CreateReport) => Promise<Report>;
    submit: (id: string) => Promise<Report>;
    approve: (id: string) => Promise<Report>;
    return: (id: string, notes: string) => Promise<Report>;
  };
  messages: {
    broadcast: (data: Broadcast) => Promise<Message>;
    listDeliveries: () => Promise<Delivery[]>;
    markRead: (id: string) => Promise<void>;
  };
  ai: {
    ask: (question: string) => Promise<AiResponse>;
  };
  telemetry: {
    log: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  };
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  role: 'secretary' | 'coordinator' | 'director';
  phone: string;
  lgaId: string | null;
  wardId: string | null;
  status: 'active' | 'suspended';
}

export interface CreateUser {
  role: 'secretary' | 'coordinator' | 'director';
  phone: string;
  lgaId?: string;
  wardId?: string;
}

export interface Form {
  id: string;
  slug: string;
  title: string;
  titleHa: string;
  status: 'draft' | 'deployed' | 'archived';
  currentVersionId: string | null;
}

export interface Report {
  id: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'returned' | 'sealed';
  wardId: string;
  formVersionId: string;
  canonical: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReport {
  formVersionId: string;
  wardId: string;
  fields: Record<string, unknown>;
}

export interface Broadcast {
  scope: 'state' | 'lga' | 'ward';
  scopeIds: string[];
  channels: string[];
  subject: string;
  body: string;
}

export interface Message {
  id: string;
  subject: string;
  body: string;
  scope: string;
}

export interface Delivery {
  id: string;
  messageId: string;
  recipientId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  sentAt: string | null;
  readAt: string | null;
}

export interface AiResponse {
  answer: string;
  sources: Array<{ type: string; snippet: string }>;
}

export function createClient(baseUrl: string, accessToken?: string): WdcClient {
  // Stub - to be generated from OpenAPI
  return {} as WdcClient;
}