export type JudolLabel = 'judol' | 'non_judol';

export type RiskLevel = 'low' | 'medium' | 'high';

export type DetectionAction = 'none' | 'warn' | 'blur' | 'hide';

export type PredictionMode = 'mock' | 'api' | 'offline';

export type UnicodeSpanReason =
  | 'homoglyph'
  | 'invisible'
  | 'symbol'
  | 'mixed_script'
  | 'unknown';

export type UnicodeSpan = {
  start: number;
  end: number;
  char: string;
  reason: UnicodeSpanReason;
  normalizedAs?: string;
  unicodeName?: string;
};

export type HighlightRange = {
  start: number;
  end: number;
  kind: 'matched_term' | 'unicode_suspicious';
};

export type DetectionReason = {
  type: 'keyword' | 'unicode' | 'model_signal';
  value: string;
  weight: number;
};

export type UnicodeAnalysis = {
  hasSuspiciousUnicode: boolean;
  suspiciousCount: number;
  spans: UnicodeSpan[];
};

export type PredictionDisplay = {
  snippet: string;
  highlightRanges: HighlightRange[];
};

export type PredictionResult = {
  id: string;
  label: JudolLabel;
  confidence: number;
  riskLevel: RiskLevel;
  action: DetectionAction;
  reasons: DetectionReason[];
  matchedTerms: string[];
  unicodeAnalysis: UnicodeAnalysis;
  display: PredictionDisplay;
};

export type PredictionSourcePlatform =
  | 'youtube'
  | 'telegram'
  | 'x'
  | 'simulation'
  | 'unknown';

export type PredictionSource = {
  url?: string;
  platform: PredictionSourcePlatform;
  pageTitle?: string;
  capturedAt: string;
};

export type PredictionClient = {
  extensionVersion: string;
  predictionMode: PredictionMode;
  threshold: number;
};

export type PredictionItemContext = {
  kind: 'comment' | 'post' | 'message' | 'title' | 'description' | 'unknown';
  selectorHint?: string;
  visible: boolean;
  languageHint?: 'id' | 'en' | 'unknown';
};

export type PredictionItem = {
  id: string;
  text: string;
  context: PredictionItemContext;
};

export type PredictionBatchRequest = {
  requestId: string;
  source: PredictionSource;
  client: PredictionClient;
  items: PredictionItem[];
};

export type PredictionRequest = Omit<PredictionBatchRequest, 'items'> & {
  item: PredictionItem;
};

export type PredictionModelInfo = {
  name: string;
  version: string;
  architecture: string;
  isMock: boolean;
};

export type PredictionSummary = {
  totalItems: number;
  judolCount: number;
  unicodeSuspiciousCount: number;
  processingTimeMs: number;
};

export type PredictionError = {
  itemId?: string;
  code: string;
  message: string;
};

export type PredictionBatchResponse = {
  requestId: string;
  model: PredictionModelInfo;
  summary: PredictionSummary;
  results: PredictionResult[];
  errors: PredictionError[];
};

export type PredictionResponse = Omit<
  PredictionBatchResponse,
  'summary' | 'results'
> & {
  result?: PredictionResult;
};
