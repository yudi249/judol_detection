import type {
  PredictionBatchRequest,
  PredictionBatchResponse,
  PredictionModelInfo,
  PredictionResult,
} from './prediction';
import type { PredictionError } from './prediction';
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
  xTimelineSubscribe: 'judollens:x-timeline-subscribe',
  xTimelineUnsubscribe: 'judollens:x-timeline-unsubscribe',
  xTimelineItems: 'judollens:x-timeline-items',
  xTimelinePredictions: 'judollens:x-timeline-predictions',
  youtubeBrowseSubscribe: 'judollens:youtube-browse-subscribe',
  youtubeBrowseUnsubscribe: 'judollens:youtube-browse-unsubscribe',
  youtubeBrowseItems: 'judollens:youtube-browse-items',
  youtubeBrowsePredictions: 'judollens:youtube-browse-predictions',
} as const;

export type XTimelineSubscribeMessage = {
  type: typeof MESSAGE_TYPES.xTimelineSubscribe;
};

export type XTimelineUnsubscribeMessage = {
  type: typeof MESSAGE_TYPES.xTimelineUnsubscribe;
};

export type XTimelineItemsMessage = {
  type: typeof MESSAGE_TYPES.xTimelineItems;
  payload: {
    sourceUrl: string;
    pageTitle?: string;
    items: Array<{ id: string; text: string }>;
  };
};

export type XTimelinePredictionsMessage = {
  type: typeof MESSAGE_TYPES.xTimelinePredictions;
  payload: PredictionBatchResponse;
};

export type YouTubeBrowseSubscribeMessage = {
  type: typeof MESSAGE_TYPES.youtubeBrowseSubscribe;
};

export type YouTubeBrowseUnsubscribeMessage = {
  type: typeof MESSAGE_TYPES.youtubeBrowseUnsubscribe;
};

export type YouTubeBrowseItemsMessage = {
  type: typeof MESSAGE_TYPES.youtubeBrowseItems;
  payload: {
    sourceUrl: string;
    pageTitle?: string;
    items: Array<{ id: string; text: string }>;
  };
};

export type YouTubeBrowsePredictionsMessage = {
  type: typeof MESSAGE_TYPES.youtubeBrowsePredictions;
  payload: PredictionBatchResponse;
};

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

export type ManualAnalyzeSuccessResponseMessage = {
  type: typeof MESSAGE_TYPES.analyzeManualText;
  payload: {
    kind: 'success';
    state: ManualAnalysisState;
    result: PredictionResult;
    model: PredictionModelInfo;
    requestId: string;
  };
};

export type ManualAnalyzeErrorResponseMessage = {
  type: typeof MESSAGE_TYPES.analyzeManualText;
  payload: {
    kind: 'error';
    error: PredictionError;
  };
};

export type ManualAnalyzeResponseMessage =
  | ManualAnalyzeSuccessResponseMessage
  | ManualAnalyzeErrorResponseMessage;

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
  | SaveManualAnalysisMessage
  | XTimelineSubscribeMessage
  | XTimelineUnsubscribeMessage
  | XTimelineItemsMessage
  | YouTubeBrowseSubscribeMessage
  | YouTubeBrowseUnsubscribeMessage
  | YouTubeBrowseItemsMessage;

export type JudolLensResponseMessage =
  | ScanBatchResponseMessage
  | ExtensionStateResponseMessage
  | ManualAnalysisResponseMessage
  | ManualAnalyzeResponseMessage
  | SaveManualAnalysisResponseMessage
  | XTimelinePredictionsMessage
  | YouTubeBrowsePredictionsMessage;
