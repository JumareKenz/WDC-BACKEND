import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  registry!: Registry;

  httpRequestsTotal!: Counter;
  httpRequestDuration!: Histogram;
  httpRequestErrors!: Counter;
  jobQueueDepth!: Gauge;
  dbQueryDuration!: Histogram;

  onModuleInit() {
    this.registry = new Registry();

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total HTTP request errors',
      labelNames: ['method', 'path', 'error'],
      registers: [this.registry],
    });

    this.jobQueueDepth = new Gauge({
      name: 'job_queue_depth',
      help: 'Current number of jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.logger.log('Metrics initialized');
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsAsJson() {
    return this.registry.getMetricsAsJSON();
  }
}

export const METRICS_SERVICE = Symbol('METRICS_SERVICE');