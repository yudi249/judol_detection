export const MAX_AUTO_SCROLL_STEPS = 500;
const DEFAULT_INTERVAL_MS = 2_000;
const DEFAULT_NO_PROGRESS_LIMIT = 3;

export type AutoScrollStatus =
  | 'idle'
  | 'running'
  | 'stopped'
  | 'bottom'
  | 'limit'
  | 'error';

export type AutoScrollState = {
  status: AutoScrollStatus;
  steps: number;
  max_steps: number;
  last_reason?: string;
};

export type ScrollMetrics = {
  y: number;
  height: number;
  viewport: number;
};

type EvaluateScroll = () => Promise<ScrollMetrics>;
type StateListener = (state: AutoScrollState) => void;

type AutoScrollOptions = {
  intervalMs?: number;
  noProgressLimit?: number;
  maxSteps?: number;
};

export class AutoScrollController {
  private readonly intervalMs: number;
  private readonly noProgressLimit: number;
  private readonly maxSteps: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private noProgressCount = 0;
  private previousY: number | undefined;
  private previousHeight: number | undefined;
  private state: AutoScrollState;

  constructor(
    private readonly evaluateScroll: EvaluateScroll,
    private readonly onState: StateListener,
    options: AutoScrollOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.noProgressLimit = options.noProgressLimit ?? DEFAULT_NO_PROGRESS_LIMIT;
    this.maxSteps = options.maxSteps ?? MAX_AUTO_SCROLL_STEPS;
    if (this.intervalMs < 1 || this.noProgressLimit < 1 || this.maxSteps < 1) {
      throw new Error('Auto-scroll options must be positive');
    }
    this.state = this.createState('idle');
  }

  getState(): AutoScrollState {
    return this.state;
  }

  start(): AutoScrollState {
    if (this.running) {
      return this.state;
    }
    this.clearTimer();
    this.running = true;
    this.noProgressCount = 0;
    this.previousY = undefined;
    this.previousHeight = undefined;
    this.state = this.createState('running');
    this.emit();
    void this.tick();
    return this.state;
  }

  stop(reason = 'user_stop'): AutoScrollState {
    this.running = false;
    this.clearTimer();
    if (this.state.status === 'running') {
      this.state = {
        ...this.state,
        status: 'stopped',
        last_reason: reason,
      };
      this.emit();
    }
    return this.state;
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      const metrics = await this.evaluateScroll();
      if (!this.running) {
        return;
      }
      const steps = this.state.steps + 1;
      if (
        this.previousY !== undefined &&
        this.previousHeight !== undefined &&
        metrics.y <= this.previousY &&
        metrics.height <= this.previousHeight
      ) {
        this.noProgressCount += 1;
      } else {
        this.noProgressCount = 0;
      }
      this.previousY = metrics.y;
      this.previousHeight = metrics.height;
      this.state = { ...this.state, steps };

      if (this.noProgressCount >= this.noProgressLimit) {
        const atBottom = metrics.y + metrics.viewport >= metrics.height - 4;
        this.finish(atBottom ? 'bottom' : 'stopped', atBottom ? 'page_bottom' : 'no_progress');
        return;
      }
      if (steps >= this.maxSteps) {
        this.finish('limit', 'max_steps');
        return;
      }

      this.emit();
      this.timer = setTimeout(() => {
        this.timer = undefined;
        void this.tick();
      }, this.intervalMs);
    } catch (error) {
      this.finish('error', error instanceof Error ? error.message : String(error));
    }
  }

  private finish(status: Exclude<AutoScrollStatus, 'idle' | 'running'>, reason: string): void {
    this.running = false;
    this.clearTimer();
    this.state = {
      ...this.state,
      status,
      last_reason: reason,
    };
    this.emit();
  }

  private createState(status: AutoScrollStatus): AutoScrollState {
    return {
      status,
      steps: 0,
      max_steps: this.maxSteps,
    };
  }

  private emit(): void {
    this.onState(this.state);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
