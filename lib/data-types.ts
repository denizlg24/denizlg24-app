export interface IBlog {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  timeToRead: number;
  media?: string[];
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBlogComment {
  _id: string;
  blogId: string;
  commentId?: string;
  authorName: string;
  content: string;
  sessionId?: string;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBlogView {
  _id: string;
  blogId: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICalendarEvent {
  _id: string;
  date: string;
  title: string;
  place?: string;
  links: {
    _id: string;
    label: string;
    icon?: string;
    url: string;
  }[];
  status: "scheduled" | "completed" | "canceled";
  notifyBySlack: boolean;
  isNotificationSent: boolean;
  notifyBeforeMinutes: number;
  notifyAt?: string;
}

export interface IContact {
  _id: string;
  ticketId: string;
  name: string;
  email: string;
  message: string;
  ipAddress: string;
  userAgent: string;
  status: "pending" | "read" | "responded" | "archived";
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IEmail {
  _id: string;
  accountId: string;
  messageId: string;
  subject: string;
  from: { name: string | undefined; address: string }[];
  date: string;
  seen: boolean;
  uid: number;
}

export interface IEmailAccount {
  _id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  imapPassword: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  inboxName: string;
  lastUid: number;
  emails?: IEmail[];
}

export interface IFolder {
  _id: string;
  name: string;
  parentFolder?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface INote {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface INowPage {
  _id: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

export interface IProject {
  _id: string;
  title: string;
  subtitle: string;
  images: string[];
  media?: string[];
  links: {
    _id: string;
    label: string;
    url: string;
    icon: "external" | "github" | "notepad";
  }[];
  markdown: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITimelineItem {
  _id: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
  dateFrom: string;
  dateTo?: string;
  topics: string[];
  category: "work" | "education" | "personal";
  order: number;
  links?: {
    label: string;
    url: string;
    icon: "external" | "github" | "notepad";
  }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const TIMETABLE_COLORS = [
  "background",
  "surface",
  "muted",
  "accent",
  "accent-strong",
  "foreground",
  "destructive",
] as const;

export type TimetableColor = (typeof TIMETABLE_COLORS)[number];

export interface ITimetableEntry {
  _id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  place?: string;
  links: {
    _id: string;
    label: string;
    url: string;
    icon?: string;
  }[];
  color: TimetableColor;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IWhiteboardElement {
  id: string;
  type: "drawing" | "component";
  componentType?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: Record<string, unknown>;
  zIndex: number;
}

export interface IWhiteboard {
  _id: string;
  name: string;
  elements: IWhiteboardElement[];
  viewState: { x: number; y: number; zoom: number };
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface IWhiteboardMeta {
  _id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
