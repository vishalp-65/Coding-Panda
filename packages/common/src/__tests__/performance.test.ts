import {
  PerformanceBenchmark,
  PerformanceMonitor,
  MemoryMonitor,
  monitor,
} from '../performance/benchmarking';

describe('PerformanceBenchmark', () => {
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
  });

  describe('benchmark', () => {
    it('should run benchmark and return results', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await benchmark.benchmark('test-function', mockFn, 5, 2);

      expect(result.name).toBe('test-function');
      expect(result.iterations).toBe(5);
      expect(mockFn).toHaveBeenCalledTimes(7); // 5 + 2 warmup
      expect(result.avgDuration).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
      expect(result.metadata?.successRate).toBe(100);
    });

    it('should handle function failures', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce('warmup1')
        .mockResolvedValueOnce('warmup2')
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValueOnce('success1')
        .mockRejectedValueOnce(new Error('fail2'));

      const result = await benchmark.benchmark(
        'failing-function',
        mockFn,
        3,
        2
      );

      expect(result.iterations).toBe(3);
      expect(result.metadata?.successRate).toBe(33.33333333333333); // 1 out of 3
      expect(result.metadata?.failureCount).toBe(2);
    });

    it('should measure performance accurately', async () => {
      const delay = 10; // 10ms delay
      const mockFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, delay))
        );

      const result = await benchmark.benchmark(
        'delayed-function',
        mockFn,
        3,
        1
      );

      expect(result.avgDuration).toBeGreaterThanOrEqual(delay);
      expect(result.minDuration).toBeGreaterThanOrEqual(delay);
      expect(result.maxDuration).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('loadTest', () => {
    it('should run load test and return results', async () => {
      const mockTarget = jest.fn().mockResolvedValue('success');

      const result = await benchmark.loadTest({
        name: 'load-test',
        concurrency: 2,
        duration: 0.1, // 100ms
        target: mockTarget,
      });

      expect(result.name).toBe('load-test');
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.successfulRequests).toBe(result.totalRequests);
      expect(result.failedRequests).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('should handle target failures in load test', async () => {
      let callCount = 0;
      const mockTarget = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Simulated failure'));
        }
        return Promise.resolve('success');
      });

      const result = await benchmark.loadTest({
        name: 'failing-load-test',
        concurrency: 1,
        duration: 0.1,
        target: mockTarget,
      });

      expect(result.failedRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toBe('Simulated failure');
    });
  });

  describe('results management', () => {
    it('should store and retrieve results', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await benchmark.benchmark('test1', mockFn, 1, 0);
      await benchmark.benchmark('test2', mockFn, 1, 0);

      const results = benchmark.getResults();
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('test1');
      expect(results[1].name).toBe('test2');
    });

    it('should clear results', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      await benchmark.benchmark('test', mockFn, 1, 0);

      benchmark.clearResults();
      expect(benchmark.getResults()).toHaveLength(0);
    });

    it('should generate report', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      await benchmark.benchmark('test-report', mockFn, 1, 0);

      const report = benchmark.generateReport();
      expect(report).toContain('Performance Benchmark Report');
      expect(report).toContain('test-report');
      expect(report).toContain('Iterations: 1');
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
  });

  describe('timer functionality', () => {
    it('should measure execution time', async () => {
      const endTimer = monitor.startTimer('test-operation');

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = endTimer();

      expect(duration).toBeGreaterThanOrEqual(10);

      const stats = monitor.getMetricStats('test-operation');
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBeGreaterThanOrEqual(10);
    });

    it('should record multiple measurements', () => {
      monitor.recordMetric('test-metric', 100);
      monitor.recordMetric('test-metric', 200);
      monitor.recordMetric('test-metric', 150);

      const stats = monitor.getMetricStats('test-metric');
      expect(stats?.count).toBe(3);
      expect(stats?.avg).toBe(150);
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(200);
    });

    it('should calculate percentiles correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      values.forEach(value => monitor.recordMetric('percentile-test', value));

      const stats = monitor.getMetricStats('percentile-test');
      expect(stats?.p50).toBe(60); // 50th percentile of 10 values is at index 5 (0-based)
      expect(stats?.p95).toBe(100); // 95th percentile of 10 values is at index 9
      expect(stats?.p99).toBe(100); // 99th percentile of 10 values is at index 9
    });
  });

  describe('metrics management', () => {
    it('should return null for non-existent metrics', () => {
      const stats = monitor.getMetricStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should get all metrics', () => {
      monitor.recordMetric('metric1', 100);
      monitor.recordMetric('metric2', 200);

      const allMetrics = monitor.getAllMetrics();
      expect(Object.keys(allMetrics)).toContain('metric1');
      expect(Object.keys(allMetrics)).toContain('metric2');
    });

    it('should limit stored values to 1000', () => {
      // Record 1500 values
      for (let i = 0; i < 1500; i++) {
        monitor.recordMetric('large-metric', i);
      }

      const stats = monitor.getMetricStats('large-metric');
      expect(stats?.count).toBe(1000);
      expect(stats?.min).toBe(500); // First 500 should be removed
    });
  });

  describe('singleton behavior', () => {
    it('should return same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('monitor decorator', () => {
  class TestClass {
    @monitor('custom-metric-name')
    async monitoredMethod(delay: number): Promise<string> {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'completed';
    }

    @monitor()
    async autoNamedMethod(): Promise<string> {
      return 'auto-named';
    }

    @monitor('error-method')
    async errorMethod(): Promise<never> {
      throw new Error('Test error');
    }
  }

  let testInstance: TestClass;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    testInstance = new TestClass();
    performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.clearMetrics();
  });

  it('should monitor method execution time with custom name', async () => {
    const result = await testInstance.monitoredMethod(10);

    expect(result).toBe('completed');

    const stats = performanceMonitor.getMetricStats('custom-metric-name');
    expect(stats?.count).toBe(1);
    expect(stats?.avg).toBeGreaterThanOrEqual(10);
  });

  it('should monitor method with auto-generated name', async () => {
    const result = await testInstance.autoNamedMethod();

    expect(result).toBe('auto-named');

    const stats = performanceMonitor.getMetricStats(
      'TestClass.autoNamedMethod'
    );
    expect(stats?.count).toBe(1);
  });

  it('should monitor method even when it throws error', async () => {
    await expect(testInstance.errorMethod()).rejects.toThrow('Test error');

    const stats = performanceMonitor.getMetricStats('error-method');
    expect(stats?.count).toBe(1);
  });
});

describe('MemoryMonitor', () => {
  describe('getMemoryUsage', () => {
    it('should return memory usage object', () => {
      const usage = MemoryMonitor.getMemoryUsage();

      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(usage).toHaveProperty('arrayBuffers');

      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.heapTotal).toBe('number');
      expect(typeof usage.heapUsed).toBe('number');
    });
  });

  describe('formatMemoryUsage', () => {
    it('should format memory usage in MB', () => {
      const mockUsage = {
        rss: 1024 * 1024 * 10, // 10 MB
        heapTotal: 1024 * 1024 * 5, // 5 MB
        heapUsed: 1024 * 1024 * 3, // 3 MB
        external: 1024 * 1024 * 1, // 1 MB
        arrayBuffers: 1024 * 1024 * 0.5, // 0.5 MB
      };

      const formatted = MemoryMonitor.formatMemoryUsage(mockUsage);

      expect(formatted.rss).toBe('10.00 MB');
      expect(formatted.heapTotal).toBe('5.00 MB');
      expect(formatted.heapUsed).toBe('3.00 MB');
      expect(formatted.external).toBe('1.00 MB');
      expect(formatted.arrayBuffers).toBe('0.50 MB');
    });
  });

  describe('logMemoryUsage', () => {
    it('should not throw when logging memory usage', () => {
      expect(() => {
        MemoryMonitor.logMemoryUsage('Test Memory Usage');
      }).not.toThrow();
    });
  });
});
