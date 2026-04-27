# Load test results

> Filled in during M14 with real numbers from `tests/load/*.k6.js` runs.

Targets we will measure against:

| Metric                          | Target              |
| ------------------------------- | ------------------- |
| Read p95 latency @ 100 RPS      | < 200 ms            |
| Write p95 latency               | < 500 ms            |
| Sync batch (50 ops) end-to-end  | < 1 s               |
| Error rate                      | < 0.1%              |

Until M14, this file documents only the targets — the table of measurements is appended once we run k6 against a representative environment.
