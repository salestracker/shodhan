// src/types/service-worker.d.ts
interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision: string }>;
  __WB_DISABLE_DEV_LOGS: boolean;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  addEventListener: <K extends keyof ServiceWorkerGlobalScopeEventMap>(type: K, listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions) => void;
  skipWaiting: () => void;
  location: Location;
}

interface ServiceWorkerGlobalScopeEventMap {
  "activate": ExtendableEvent;
  "fetch": FetchEvent;
  "install": ExtendableEvent;
  "message": ExtendableMessageEvent;
  "notificationclick": NotificationEvent;
  "notificationclose": NotificationEvent;
  "push": PushEvent;
  "pushsubscriptionchange": ExtendableEvent;
  "sync": SyncEvent;
}

interface ExtendableEvent extends Event {
  waitUntil(f: Promise<unknown>): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: unknown;
  origin: string;
  lastEventId: string;
  source: Client | ServiceWorker | MessagePort | null;
  ports: ReadonlyArray<MessagePort>;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  preloadResponse: Promise<unknown>;
  clientId: string;
  resultingClientId: string;
  replaceClientId: string;
  handled: Promise<unknown>;
  respondWith(r: Response | PromiseLike<Response>): void;
}

interface NotificationEvent extends ExtendableEvent {
  notification: Notification;
  action: string;
}

interface PushEvent extends ExtendableEvent {
  data: PushMessageData | null;
}

interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): unknown;
  text(): string;
}

interface SyncEvent extends ExtendableEvent {
  lastChance: boolean;
  tag: string;
}

interface Clients {
  claim: () => Promise<void>;
  matchAll: (options?: ClientQueryOptions) => Promise<ReadonlyArray<Client>>;
}

interface ClientQueryOptions {
  includeUncontrolled?: boolean;
  type?: ClientTypes;
}

enum ClientTypes {
  window = 'window',
  worker = 'worker',
  sharedworker = 'sharedworker',
  all = 'all',
}

interface Client {
  id: string;
  type: ClientTypes;
  url: string;
  frameType: FrameType;
  focused: boolean;
  postMessage: (message: unknown, transfer: Transferable[] | StructuredSerializeOptions) => void;
}

enum FrameType {
  auxiliary = 'auxiliary',
  topLevel = 'top-level',
  nested = 'nested',
  none = 'none',
}

interface MessagePort {
  onerror: ((this: MessagePort, ev: MessageEvent) => unknown) | null;
}

interface IDBRequest {
  result: unknown;
  error: DOMException | null;
  source: IDBObjectStore | IDBIndex | IDBCursor;
  transaction: IDBTransaction | null;
  readyState: IDBRequestReadyState;
  onerror: ((this: IDBRequest, ev: Event) => unknown) | null;
  onsuccess: ((this: IDBRequest, ev: Event) => unknown) | null;
}

enum IDBRequestReadyState {
  pending = 'pending',
  done = 'done',
}

interface IDBTransaction {
  db: IDBDatabase;
  mode: IDBTransactionMode;
  error: DOMException | null;
  objectStore: (name: string) => IDBObjectStore;
  abort: () => void;
  commit: () => void;
  onabort: ((this: IDBTransaction, ev: Event) => unknown) | null;
  oncomplete: ((this: IDBTransaction, ev: Event) => unknown) | null;
  onerror: ((this: IDBTransaction, ev: Event) => unknown) | null;
}

enum IDBTransactionMode {
  readonly = 'readonly',
  readwrite = 'readwrite',
  versionchange = 'versionchange',
}

declare const self: ServiceWorkerGlobalScope;
