import type {
  DetectionAction,
  JudolLabel,
  PredictionMode,
  PredictionModelInfo,
  PredictionResult,
  RiskLevel,
  UnicodeAnalysis,
} from './prediction';
import type { Platform, PlatformScope, ProtectionStatus } from './platform';

export const STORAGE_KEYS = {
  settings: 'settings:extension',
  sessionStats: 'stats:session',
  detectionLogs: 'logs:detections',
  manualLastAnalysis: 'manual:lastAnalysis',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export type SettingsPredictionMode = Extract<PredictionMode, 'mock' | 'api'>;
export type BenchmarkTelemetrySettings = {
  enabled: boolean;
  otlpEndpoint: string;
  runId: string;
};

export type BenchmarkTelemetrySettingsPatch =
  Partial<BenchmarkTelemetrySettings>;

export type ExtensionSettingsPatch = Omit<Partial<ExtensionSettings>, 'benchmarkTelemetry'> & {
  benchmarkTelemetry?: BenchmarkTelemetrySettingsPatch;
};


export type ExtensionSettings = {
  schemaVersion: 1;
  predictionMode: SettingsPredictionMode;
  apiEndpoint: string;
  threshold: number;
  protectionEnabled: boolean;
  censorMode: DetectionAction;
  autoBlur: boolean;
  highlightUnicode: boolean;
  platformScope: PlatformScope;
  maxLogs: number;
  storeBoundedEvidence: boolean;
  storeSourceUrl: boolean;
  benchmarkTelemetry: BenchmarkTelemetrySettings;
};

export const defaultExtensionSettings: ExtensionSettings = {
  schemaVersion: 1,
  predictionMode: 'mock',
  apiEndpoint: 'http://localhost:8000',
  threshold: 0.75,
  protectionEnabled: true,
  censorMode: 'blur',
  autoBlur: true,
  highlightUnicode: true,
  platformScope: {
    youtube: true,
    telegram: true,
    x: true,
    simulation: true,
    otherSites: false,
  },
  maxLogs: 200,
  storeBoundedEvidence: true,
  storeSourceUrl: false,
  benchmarkTelemetry: {
    enabled: false,
    otlpEndpoint: 'http://127.0.0.1:4318/v1/traces',
    runId: '',
  },
};

export type SessionStats = {
  schemaVersion: 1;
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  protectionStatus: ProtectionStatus;
  activePlatform: Platform;
  activeUrl?: string;
  predictionMode: SettingsPredictionMode;
  scannedCount: number;
  detectedCount: number;
  unicodeSuspiciousCount: number;
  lastScanTimeMs?: number;
  lastError?: {
    code: string;
    message: string;
    occurredAt: string;
  };
};

export type DetectionLog = {
  id: string;
  timestamp: string;
  platform: Platform;
  sourceUrl?: string;
  snippet: string;
  label: JudolLabel;
  confidence: number;
  riskLevel: RiskLevel;
  action: DetectionAction;
  matchedTerms: string[];
  unicodeAnalysis: UnicodeAnalysis;
  model: PredictionModelInfo;
  requestId?: string;
  itemId?: string;
};

export type ManualAnalysisState = {
  schemaVersion: 1;
  inputText: string;
  sourcePlatform: Platform;
  sourceUrl?: string;
  analyzedAt?: string;
  result?: PredictionResult;
  model?: PredictionModelInfo;
  requestId?: string;
};

export type ExtensionStorageSchema = {
  [STORAGE_KEYS.settings]: ExtensionSettings;
  [STORAGE_KEYS.sessionStats]: SessionStats;
  [STORAGE_KEYS.detectionLogs]: DetectionLog[];
  [STORAGE_KEYS.manualLastAnalysis]: ManualAnalysisState;
};
