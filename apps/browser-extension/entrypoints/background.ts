import {
  ApiPredictionGateway,
  createApiPredictionGateway,
} from '@/api/api-prediction-gateway';
import type { PredictBatch } from '../src/predictor';
import { getExtensionSettings } from '@/storage';
import { handleJudolLensMessage } from '../src/background';
import { registerManualAnalysisContextMenu } from '../src/background/manual-context-menu';
import { XTimelineMonitor } from '../src/background/x-timeline-monitor';
import { YouTubeBrowseMonitor } from '../src/background/youtube-browse-monitor';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type { JudolLensRequestMessage } from '../src/shared';

const apiPredictionGateways = new Map<string, ApiPredictionGateway>();

const predictBatchWithApi: PredictBatch = async (request) => {
  const { apiEndpoint } = await getExtensionSettings();
  let gateway = apiPredictionGateways.get(apiEndpoint);
  if (!gateway) {
    gateway = createApiPredictionGateway(apiEndpoint);
    apiPredictionGateways.set(apiEndpoint, gateway);
  }
  return gateway.predictBatch(request);
};

export default defineBackground(() => {
  registerManualAnalysisContextMenu();
  const chromeApi = (globalThis as typeof globalThis & {
    chrome: {
      debugger: typeof Browser.debugger;
      runtime: typeof Browser.runtime;
    };
  }).chrome;
  const debuggerTransport = {
    runtime: chromeApi.runtime,
    attach: (target: { tabId: number }, version: string, callback: () => void) =>
      chromeApi.debugger.attach(target, version, callback),
    detach: (target: { tabId: number }, callback: () => void) =>
      chromeApi.debugger.detach(target, callback),
    sendCommand: (
      target: { tabId: number },
      method: string,
      params: Record<string, unknown>,
      callback: (result?: unknown) => void,
    ) => chromeApi.debugger.sendCommand(target, method, params, callback),
    onEvent: {
      addListener: (
        listener: (
          source: { tabId: number },
          method: string,
          params?: Record<string, unknown>,
        ) => void,
      ) =>
        chromeApi.debugger.onEvent.addListener((source, method, params) => {
          if (source.tabId !== undefined) {
            listener({ tabId: source.tabId }, method, params as Record<string, unknown> | undefined);
          }
        }),
    },
    onDetach: {
      addListener: (listener: (source: { tabId: number }, reason: string) => void) =>
        chromeApi.debugger.onDetach.addListener((source, reason) => {
          if (source.tabId !== undefined) {
            listener({ tabId: source.tabId }, reason);
          }
        }),
    },
  };
  const xTimelineMonitor = new XTimelineMonitor(
    debuggerTransport,
    async (tabId, items) => {
      const tab = await browser.tabs.get(tabId);
      const response = await handleJudolLensMessage(
        {
          type: 'judollens:x-timeline-items',
          payload: {
            sourceUrl: tab.url ?? 'https://x.com/',
            pageTitle: tab.title,
            items,
          },
        },
        { apiPredictBatch: predictBatchWithApi },
      );
      if (response?.type === 'judollens:x-timeline-predictions') {
        await browser.tabs.sendMessage(tabId, response);
      }
    },
  );
  const youtubeBrowseMonitor = new YouTubeBrowseMonitor(
    debuggerTransport,
    async (tabId, items) => {
      const tab = await browser.tabs.get(tabId);
      const response = await handleJudolLensMessage(
        {
          type: 'judollens:youtube-browse-items',
          payload: {
            sourceUrl: tab.url ?? 'https://youtube.com/',
            pageTitle: tab.title,
            items,
          },
        },
        { apiPredictBatch: predictBatchWithApi },
      );
      if (response?.type === 'judollens:youtube-browse-predictions') {
        await browser.tabs.sendMessage(tabId, response);
      }
    },
  );
  browser.tabs.onRemoved.addListener((tabId) => {
    void xTimelineMonitor.unsubscribe(tabId);
    void youtubeBrowseMonitor.unsubscribe(tabId);
  });

  browser.runtime.onMessage.addListener(
    (message: JudolLensRequestMessage, sender, sendResponse: (response: unknown) => void) => {
      if (message.type === 'judollens:x-timeline-subscribe' && sender.tab?.id !== undefined) {
        void xTimelineMonitor.subscribe(sender.tab.id).then(() => sendResponse(undefined));
        return true;
      }
      if (message.type === 'judollens:x-timeline-unsubscribe' && sender.tab?.id !== undefined) {
        void xTimelineMonitor.unsubscribe(sender.tab.id).then(() => sendResponse(undefined));
        return true;
      }

      if (message.type === 'judollens:youtube-browse-subscribe' && sender.tab?.id !== undefined) {
        void youtubeBrowseMonitor.subscribe(sender.tab.id).then(() => sendResponse(undefined));
        return true;
      }
      if (message.type === 'judollens:youtube-browse-unsubscribe' && sender.tab?.id !== undefined) {
        void youtubeBrowseMonitor.unsubscribe(sender.tab.id).then(() => sendResponse(undefined));
        return true;
      }

      void handleJudolLensMessage(message, { apiPredictBatch: predictBatchWithApi })
        .then(async (response) => {
          if (
            (response?.type === 'judollens:x-timeline-predictions' ||
              response?.type === 'judollens:youtube-browse-predictions') &&
            sender.tab?.id !== undefined
          ) {
            await browser.tabs.sendMessage(sender.tab.id, response);
            sendResponse(undefined);
            return;
          }
          sendResponse(response);
        })
        .catch((error) => {
          console.error('JudolLens background message failed.', error);
          sendResponse(undefined);
        });

      return true;
    },
  );
});
