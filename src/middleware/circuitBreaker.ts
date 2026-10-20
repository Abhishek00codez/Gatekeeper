type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  public state: State = 'CLOSED';
  private failures = 0;
  private lastFailureTime: number | null = null;
  private threshold: number;
  private cooldownMs: number;

  constructor(threshold = 5, cooldownMs = 10000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  public allowRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN
    return true;
  }

  public recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

export const circuitBreaker = new CircuitBreaker();
