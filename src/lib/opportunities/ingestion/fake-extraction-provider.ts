import 'server-only';

import {
  ExtractionProviderFailureError, ExtractionProviderTimeoutError,
  type ExtractionProviderPort, type ExtractionProviderRequest,
} from './extraction-contracts';

export type FakeExtractionProviderMode =
  | { kind: 'success'; output: unknown; delayMilliseconds?: number; ignoreAbort?: boolean }
  | { kind: 'failure' }
  | { kind: 'timeout' };

export class DeterministicFakeExtractionProvider implements ExtractionProviderPort {
  readonly identifier = 'deterministic-fake';
  calls = 0;
  constructor(private readonly mode: FakeExtractionProviderMode) {}

  async extract(request: ExtractionProviderRequest): Promise<unknown> {
    this.calls += 1;
    if (this.mode.kind === 'failure') throw new ExtractionProviderFailureError();
    if (this.mode.kind === 'timeout') throw new ExtractionProviderTimeoutError();
    const mode = this.mode;
    if (mode.delayMilliseconds) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, mode.delayMilliseconds);
        if (!mode.ignoreAbort) request.signal.addEventListener('abort', () => {
          clearTimeout(timer); reject(new ExtractionProviderTimeoutError());
        }, { once: true });
      });
    }
    return structuredClone(mode.output);
  }
}
