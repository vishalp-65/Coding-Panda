import { performance } from 'perf_hooks';
import { logger } from '../logger';

export interface BenchmarkResult {
    name: string;
    duration: number;
    iterations: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    throughput: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface LoadTestOptions {
    concurrency: number;
    duration: number; // in seconds
    rampUp?: number; // in seconds
    target: () => Promise<any>;
    name: string;
}

export interface LoadTestResult {
    name: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    throughput: number;
    errorRate: number;
    duration: number;
    errors: Array<{ error: string; count: number }>;
}

export class PerformanceBenchmark {
    private results: BenchmarkResult[] = [];

    async benchmark(
        name: string,
        fn: () => Promise<any>,
        iterations = 100,
        warmup = 10
    ): Promise<BenchmarkResult> {
        logger.info(`Starting benchmark: ${name} (${iterations} iterations, ${warmup} warmup)`);

        // Warmup runs
        for (let i = 0; i < warmup; i++) {
            try {
                await fn();
            } catch (error) {
                logger.warn(`Warmup iteration ${i + 1} failed:`, error);
            }
        }

        const durations: number[] = [];
        let successCount = 0;

        // Actual benchmark runs
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();

            try {
                await fn();
                const duration = performance.now() - start;
                durations.push(duration);
                successCount++;
            } catch (error) {
                logger.warn(`Benchmark iteration ${i + 1} failed:`, error);
                durations.push(performance.now() - start);
            }
        }

        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const avgDuration = totalDuration / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        const throughput = (successCount / (totalDuration / 1000)); // operations per second

        const result: BenchmarkResult = {
            name,
            duration: totalDuration,
            iterations: durations.length,
            avgDuration,
            minDuration,
            maxDuration,
            throughput,
            timestamp: new Date(),
            metadata: {
                successRate: (successCount / iterations) * 100,
                failureCount: iterations - successCount,
            },
        };

        this.results.push(result);
        logger.info(`Benchmark completed: ${name}`, {
            avgDuration: `${avgDuration.toFixed(2)}ms`,
            throughput: `${throughput.toFixed(2)} ops/sec`,
            successRate: `${result.metadata!.successRate.toFixed(2)}%`,
        });

        return result;
    }

    async loadTest(options: LoadTestOptions): Promise<LoadTestResult> {
        const { concurrency, duration, rampUp = 0, target, name } = options;

        logger.info(`Starting load test: ${name}`, {
            concurrency,
            duration: `${duration}s`,
            rampUp: `${rampUp}s`,
        });

        const results: Array<{ duration: number; success: boolean; error?: string }> = [];
        const errors = new Map<string, number>();
        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);

        let activeWorkers = 0;
        const maxWorkers = concurrency;

        const worker = async (): Promise<void> => {
            while (Date.now() < endTime) {
                const requestStart = performance.now();

                try {
                    await target();
                    const requestDuration = performance.now() - requestStart;
                    results.push({ duration: requestDuration, success: true });
                } catch (error) {
                    const requestDuration = performance.now() - requestStart;
                    const errorMessage = error instanceof Error ? error.message : String(error);

                    results.push({
                        duration: requestDuration,
                        success: false,
                        error: errorMessage
                    });

                    errors.set(errorMessage, (errors.get(errorMessage) || 0) + 1);
                }

                // Small delay to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            activeWorkers--;
        };

        // Ramp up workers gradually
        if (rampUp > 0) {
            const rampUpInterval = (rampUp * 1000) / maxWorkers;

            for (let i = 0; i < maxWorkers; i++) {
                activeWorkers++;
                worker();

                if (i < maxWorkers - 1) {
                    await new Promise(resolve => setTimeout(resolve, rampUpInterval));
                }
            }
        } else {
            // Start all workers immediately
            for (let i = 0; i < maxWorkers; i++) {
                activeWorkers++;
                worker();
            }
        }

        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, duration * 1000));

        // Wait for remaining workers to finish
        while (activeWorkers > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate results
        const totalRequests = results.length;
        const successfulRequests = results.filter(r => r.success).length;
        const failedRequests = totalRequests - successfulRequests;

        const durations = results.map(r => r.duration);
        const avgResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const minResponseTime = Math.min(...durations);
        const maxResponseTime = Math.max(...durations);

        const actualDuration = (Date.now() - startTime) / 1000;
        const throughput = totalRequests / actualDuration;
        const errorRate = (failedRequests / totalRequests) * 100;

        const loadTestResult: LoadTestResult = {
            name,
            totalRequests,
            successfulRequests,
            failedRequests,
            avgResponseTime,
            minResponseTime,
            maxResponseTime,
            throughput,
            errorRate,
            duration: actualDuration,
            errors: Array.from(errors.entries()).map(([error, count]) => ({ error, count })),
        };

        logger.info(`Load test completed: ${name}`, {
            totalRequests,
            throughput: `${throughput.toFixed(2)} req/sec`,
            avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
            errorRate: `${errorRate.toFixed(2)}%`,
        });

        return loadTestResult;
    }

    getResults(): BenchmarkResult[] {
        return [...this.results];
    }

    clearResults(): void {
        this.results = [];
    }

    generateReport(): string {
        if (this.results.length === 0) {
            return 'No benchmark results available.';
        }

        let report = 'Performance Benchmark Report\n';
        report += '================================\n\n';

        this.results.forEach((result, index) => {
            report += `${index + 1}. ${result.name}\n`;
            report += `   Iterations: ${result.iterations}\n`;
            report += `   Average Duration: ${result.avgDuration.toFixed(2)}ms\n`;
            report += `   Min Duration: ${result.minDuration.toFixed(2)}ms\n`;
            report += `   Max Duration: ${result.maxDuration.toFixed(2)}ms\n`;
            report += `   Throughput: ${result.throughput.toFixed(2)} ops/sec\n`;
            report += `   Success Rate: ${result.metadata?.successRate?.toFixed(2)}%\n`;
            report += `   Timestamp: ${result.timestamp.toISOString()}\n\n`;
        });

        return report;
    }
}

// Performance monitoring utilities
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics = new Map<string, number[]>();

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    startTimer(name: string): () => number {
        const start = performance.now();

        return () => {
            const duration = performance.now() - start;
            this.recordMetric(name, duration);
            return duration;
        };
    }

    recordMetric(name: string, value: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const values = this.metrics.get(name)!;
        values.push(value);

        // Keep only last 1000 measurements
        if (values.length > 1000) {
            values.shift();
        }
    }

    getMetricStats(name: string): {
        count: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    } | null {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) {
            return null;
        }

        const sorted = [...values].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);

        return {
            count,
            avg: sum / count,
            min: sorted[0],
            max: sorted[count - 1],
            p50: sorted[Math.floor(count * 0.5)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
        };
    }

    getAllMetrics(): Record<string, any> {
        const result: Record<string, any> = {};

        for (const [name] of this.metrics) {
            result[name] = this.getMetricStats(name);
        }

        return result;
    }

    clearMetrics(): void {
        this.metrics.clear();
    }
}

// Decorator for automatic performance monitoring
export function monitor(metricName?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const name = metricName || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
            const monitor = PerformanceMonitor.getInstance();
            const endTimer = monitor.startTimer(name);

            try {
                const result = await method.apply(this, args);
                endTimer();
                return result;
            } catch (error) {
                endTimer();
                throw error;
            }
        };

        return descriptor;
    };
}

// Memory usage monitoring
export class MemoryMonitor {
    static getMemoryUsage(): NodeJS.MemoryUsage {
        return process.memoryUsage();
    }

    static formatMemoryUsage(usage: NodeJS.MemoryUsage): Record<string, string> {
        const formatBytes = (bytes: number): string => {
            const mb = bytes / 1024 / 1024;
            return `${mb.toFixed(2)} MB`;
        };

        return {
            rss: formatBytes(usage.rss),
            heapTotal: formatBytes(usage.heapTotal),
            heapUsed: formatBytes(usage.heapUsed),
            external: formatBytes(usage.external),
            arrayBuffers: formatBytes(usage.arrayBuffers),
        };
    }

    static logMemoryUsage(label = 'Memory Usage'): void {
        const usage = MemoryMonitor.getMemoryUsage();
        const formatted = MemoryMonitor.formatMemoryUsage(usage);
        logger.info(label, formatted);
    }
}