const startedAt = Date.now();

const metrics = {
  activeRequests: 0,
  totalRequests: 0,
  totalResponseTimeMs: 0,
  errorCount: 0,
};

function trackRequest(req, res, next) {
  const started = Date.now();

  metrics.activeRequests += 1;
  metrics.totalRequests += 1;

  res.on("finish", () => {
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
    metrics.totalResponseTimeMs += Date.now() - started;
  });

  next();
}

function trackError() {
  metrics.errorCount += 1;
}

function getMetrics() {
  return {
    ...metrics,
    startedAt,
    averageResponseTimeMs: metrics.totalRequests
      ? Math.round(metrics.totalResponseTimeMs / metrics.totalRequests)
      : 0,
  };
}

module.exports = {
  getMetrics,
  trackError,
  trackRequest,
};
