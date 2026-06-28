import type {
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionResult,
} from './prediction';
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

export type SaveManualAnalysisMessage = {
  type: typeof MESSAGE_TYPES.saveManualAnalysis;
  payload: {
    state: ManualAnalysisState;
    result: PredictionResult;
  };
};

export type JudolLensRequestMessage =
  | ScanBatchMessage
  | GetExtensionStateMessage
  | UpdateSettingsMessage
  | ClearDetectionLogsMessage
  | SaveManualAnalysisMessage;

export type JudolLensResponseMessage =
  | ScanBatchResponseMessage
  | ExtensionStateResponseMessage;
