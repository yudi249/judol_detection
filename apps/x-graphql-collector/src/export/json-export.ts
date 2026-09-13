import type { XCollectionBatch } from '../graphql/models';
import type { MonitorState } from '../storage/collector-storage';

export function buildCollectionExport(state: MonitorState): XCollectionBatch {
  return {
    schema_version: 1,
    source: 'x_search_timeline',
    query: state.query,
    collected_at: state.updated_at,
    items: state.items,
  };
}

export function downloadCollectionJson(state: MonitorState): void {
  const exportData = buildCollectionExport(state);
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `x-search-timeline-${filePart(state.query)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function filePart(query: string): string {
  const value = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return value || 'collection';
}
