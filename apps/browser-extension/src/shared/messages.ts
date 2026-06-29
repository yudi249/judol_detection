import type {
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionModelInfo,
  PredictionResult,
} from './prediction';
import type { Platform } from './platform';
import type {
  DetectionLog,
  ExtensionSettings,
  ManualAnalysisState,
  SessionStats,
} from './storage';

export const MESSAGE_TYPES = {
  scanBatch: 'judollens:scan-batch',
  getExtensionState: 'judollens:get-extension-state',
  updateSettings: 'judollens:update-settings',
  clearDetectionLogs: 'judollens:clear-detection-logs',
  getManualAnalysis: 'judollens:get-manual-analysis',
  analyzeManualText: 'judollens:analyze-manual-text',
  openManualAnalysis: 'judollens:open-manual-analysis',
  saveManualAnalysis: 'judollens:save-manual-analysis',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type ScanBatchMessage = {
  type: typeof MESSAGE_TYPES.scanBatch;
  payload: PredictionBatchRequest;
};

export type ScanBatchResponseMessage = {
  type: typeof MESSAGE_TYPES.scanBatch;
  payload: PredictionBatchResponse;
};

export type GetExtensionStateMessage = {
  type: typeof MESSAGE_TYPES.getExtensionState;
};

export type ExtensionStatePayload = {
  settings: ExtensionSettings;
  stats: SessionStats;
  recentLogs: DetectionLog[];
};

export type ExtensionStateResponseMessage = {
  type: typeof MESSAGE_TYPES.getExtensionState;
  payload: ExtensionStatePayload;
};

export type UpdateSettingsMessage = {
  type: typeof MESSAGE_TYPES.updateSettings;
  payload: Partial<ExtensionSettings>;
};

export type ClearDetectionLogsMessage = {
  type: typeof MESSAGE_TYPES.clearDetectionLogs;
};

export type GetManualAnalysisMessage = {
  type: typeof MESSAGE_TYPES.getManualAnalysis;
};

export type ManualAnalysisResponseMessage = {
  type: typeof MESSAGE_TYPES.getManualAnalysis;
  payload: {
    state: ManualAnalysisState;
  };
};

export type AnalyzeManualTextMessage = {
  type: typeof MESSAGE_TYPES.analyzeManualText;
  payload: {
    inputText: string;
    sourcePlatform?: Platform;
    sourceUrl?: string;
  };
};

export type OpenManualAnalysisMessage = {
  type: typeof MESSAGE_TYPES.openManualAnalysis;
  payload: {
    inputText: string;
    sourceUrl?: string;
  };
};

export type ManualAnalyzeResponseMessage = {
  type: typeof MESSAGE_TYPES.analyzeManualText;
  payload: {
    state: ManualAnalysisState;
    result: PredictionResult;
    model: PredictionModelInfo;
    requestId: string;
  };
};

export type SaveManualAnalysisMessage = {
  type: typeof MESSAGE_TYPES.saveManualAnalysis;
  payload: {
    state: ManualAnalysisState;
    result: PredictionResult;
  };
};

export type SaveManualAnalysisResponseMessage = {
  type: typeof MESSAGE_TYPES.saveManualAnalysis;
  payload: {
    state: ManualAnalysisState;
  };
};

export type JudolLensRequestMessage =
  | ScanBatchMessage
  | GetExtensionStateMessage
  | UpdateSettingsMessage
  | ClearDetectionLogsMessage
  | GetManualAnalysisMessage
  | AnalyzeManualTextMessage
  | OpenManualAnalysisMessage
  | SaveManualAnalysisMessage;

export type JudolLensResponseMessage =
  | ScanBatchResponseMessage
  | ExtensionStateResponseMessage
  | ManualAnalysisResponseMessage
  | ManualAnalyzeResponseMessage
  | SaveManualAnalysisResponseMessage;
