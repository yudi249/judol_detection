import {
  detectPlatformFromUrl,
  type ManualAnalysisState,
} from '../shared';
import { setManualAnalysisState } from '../storage';

export const MANUAL_ANALYSIS_CONTEXT_MENU_ID =
  'judollens-analyze-selection';

export type ManualAnalysisSelectionInput = {
  selectionText?: string;
  pageUrl?: string;
};

export function buildManualAnalysisStateFromSelection(
  input: ManualAnalysisSelectionInput,
): ManualAnalysisState {
  const state: ManualAnalysisState = {
    schemaVersion: 1,
    inputText: input.selectionText?.trim() ?? '',
    sourcePlatform: detectPlatformFromUrl(input.pageUrl),
  };

  if (input.pageUrl) {
    state.sourceUrl = input.pageUrl;
  }

  return state;
}

export function registerManualAnalysisContextMenu() {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: MANUAL_ANALYSIS_CONTEXT_MENU_ID,
      title: 'Analisis dengan JudolLens',
      contexts: ['selection'],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MANUAL_ANALYSIS_CONTEXT_MENU_ID) {
      return;
    }

    void openManualAnalysisFromSelection({
      selectionText: info.selectionText,
      pageUrl: info.pageUrl ?? tab?.url,
    });
  });
}

export async function openManualAnalysisFromSelection(
  input: ManualAnalysisSelectionInput,
) {
  await setManualAnalysisState(buildManualAnalysisStateFromSelection(input));
  await browser.tabs.create({
    url: browser.runtime.getURL('/manual-analysis.html'),
  });
}
