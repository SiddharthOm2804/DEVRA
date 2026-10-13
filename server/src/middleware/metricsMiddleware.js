/**
 * DEVRA Metrics & Tracing Middleware
 * Intercepts all incoming HTTP transactions, records latency histograms,
 * tracks in-flight counters, and handles /metrics endpoint protection.
 */

import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpInFlightRequestsGauge,
  normalizeRoute,
  register
} from "../metrics/prometheus.js";

/**
 * Express middleware for automatic HTTP metrics collection
 */
export function metricsMiddleware(req, res, next) {
  // Exclude /metrics itself and health check pings from skewing API latency statistics
  if (req.path === "/metrics" || req.path === "/api/health" || req.path === "/api/health/ready") {
    return next();
  }

  const startTime = process.hrtime();
  const method = req.method;

  httpInFlightRequestsGauge.inc({ method });

  const onFinish = () => {
    try {
      httpInFlightRequestsGauge.dec({ method });

      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;

      // Extract route template if available from express router, otherwise normalize path
      const route = req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : normalizeRoute(req.path || req.url);
      const statusCode = String(res.statusCode || 200);
      const statusClass = `${statusCode.charAt(0)}xx`;

      httpRequestsTotal.inc({
        method,
        route,
        status_code: statusCode,
        status_class: statusClass
      });

      httpRequestDurationSeconds.observe(
        {
          method,
          route,
          status_class: statusClass
        },
        durationSeconds
      );
    } catch {
      // Metrics collection must never crash or interfere with the response lifecycle
    }
  };

  if (typeof res.on === "function") {
    res.on("finish", onFinish);
  } else if (typeof res.once === "function") {
    res.once("finish", onFinish);
  }

  next();
}

/**
 * Controller for the Prometheus /metrics endpoint with optional token/secret protection
 */
export async function metricsHandler(req, res) {
  try {
    const metricsToken = process.env.METRICS_AUTH_TOKEN;
    if (metricsToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${metricsToken}`) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Invalid or missing metrics authorization token."
        });
      }
    }

    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    if (typeof res.send === "function") {
      res.send(metrics);
    } else {
      res.end(metrics);
    }
  } catch (err) {
    if (typeof res.status === "function") {
      res.status(500);
    }
    if (typeof res.send === "function") {
      res.send(err.message);
    } else if (typeof res.end === "function") {
      res.end(err.message);
    }
  }
}
