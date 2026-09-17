const STYLE_ATTRIBUTE = 'data-judollens-selection-style';
const BUTTON_CLASS = 'judollens-selection-analyze-button';
const MIN_SELECTION_LENGTH = 3;

export type SelectionInfo = {
  text: string;
  rect: Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>;
};

export type SelectionAnalyzeTriggerOptions = {
  getSelectionInfo?: () => SelectionInfo | undefined;
  onAnalyze: (text: string) => void | Promise<void>;
};

export type SelectionAnalyzeTrigger = {
  start: () => void;
  stop: () => void;
};

export function createSelectionAnalyzeTrigger(
  options: SelectionAnalyzeTriggerOptions,
): SelectionAnalyzeTrigger {
  const getSelectionInfo = options.getSelectionInfo ?? readCurrentSelection;
  let button: HTMLButtonElement | undefined;
  let selectedText = '';
  let started = false;

  const update = () => {
    const selection = getSelectionInfo();

    if (!selection || selection.text.trim().length < MIN_SELECTION_LENGTH) {
      removeButton();
      return;
    }

    selectedText = selection.text.trim();
    const nextButton = ensureButton();
    nextButton.style.left = `${Math.max(8, selection.rect.left + window.scrollX)}px`;
    nextButton.style.top = `${Math.max(
      8,
      selection.rect.bottom + window.scrollY + 8,
    )}px`;
  };

  const hide = () => {
    if (!getSelectionInfo()) {
      removeButton();
    }
  };

  function ensureButton(): HTMLButtonElement {
    ensureSelectionAnalyzeStyles();

    if (button && button.isConnected) {
      return button;
    }

    button = document.createElement('button');
    button.className = BUTTON_CLASS;
    button.type = 'button';
    button.textContent = 'Analisis dengan JudolLens';
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    button.addEventListener('click', () => {
      const text = selectedText;
      removeButton();
      void options.onAnalyze(text);
    });
    document.body.append(button);

    return button;
  }

  function removeButton() {
    button?.remove();
    button = undefined;
    selectedText = '';
  }

  return {
    start() {
      if (started) {
        return;
      }

      started = true;
      document.addEventListener('mouseup', update);
      document.addEventListener('keyup', update);
      document.addEventListener('selectionchange', hide);
      window.addEventListener('scroll', removeButton, { passive: true });
    },
    stop() {
      if (!started) {
        return;
      }

      started = false;
      document.removeEventListener('mouseup', update);
      document.removeEventListener('keyup', update);
      document.removeEventListener('selectionchange', hide);
      window.removeEventListener('scroll', removeButton);
      removeButton();
    },
  };
}

export function ensureSelectionAnalyzeStyles(): void {
  if (document.head.querySelector(`style[${STYLE_ATTRIBUTE}]`)) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, 'true');
  style.textContent = `
.judollens-selection-analyze-button {
  align-items: center;
  background: #0b1117;
  border: 1px solid rgba(56, 189, 248, 0.55);
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.24);
  color: #f8fafc;
  cursor: pointer;
  display: inline-flex;
  font: 600 12px/1.2 "Segoe UI", system-ui, sans-serif;
  gap: 6px;
  letter-spacing: 0;
  padding: 8px 10px;
  position: absolute;
  z-index: 2147483647;
}
.judollens-selection-analyze-button:hover {
  background: #102033;
  border-color: rgba(56, 189, 248, 0.85);
}
`;
  document.head.append(style);
}

function readCurrentSelection(): SelectionInfo | undefined {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? '';

  if (!selection || selection.rangeCount === 0 || text.length < MIN_SELECTION_LENGTH) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return undefined;
  }

  return {
    text,
    rect,
  };
}
