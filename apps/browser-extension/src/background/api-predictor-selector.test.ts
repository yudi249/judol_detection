import { describe, expect, it, vi } from 'vitest';
import { selectPredictionGateway } from './api-predictor-selector';

describe('selectPredictionGateway', () => {
  it('selects the API gateway only when stored prediction mode is api', () => {
    const mockGateway = vi.fn();
    const apiGateway = vi.fn();

    expect(
      selectPredictionGateway(
        { predictionMode: 'mock', apiEndpoint: 'http://localhost:8000' } as never,
        mockGateway,
        apiGateway,
      ),
    ).toBe(mockGateway);
    expect(
      selectPredictionGateway(
        { predictionMode: 'api', apiEndpoint: 'http://localhost:8000' } as never,
        mockGateway,
        apiGateway,
      ),
    ).toBe(apiGateway);
  });
});
