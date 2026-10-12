/**
 * Three.js Level of Detail (LOD) Performance Benchmark Suite for DEVRA
 * Measures graph generation time, LOD filtering throughput, edge aggregation,
 * and memory behavior across 1,000, 5,000, and 10,000 node graphs.
 */

import {
  buildGraphLayout,
  filterGraphForLOD,
  generateSyntheticGraph,
  determineLODLevel,
  LOD_LEVELS,
  LOD_THRESHOLDS
} from "./graphLayout.js";

export function runLodBenchmark(targetSizes = [1000, 5000, 10000]) {
  const results = [];

  for (const size of targetSizes) {
    const memoryBefore = typeof process !== "undefined" && process.memoryUsage
      ? process.memoryUsage().heapUsed
      : 0;

    const tStart = performance.now();
    const graph = generateSyntheticGraph(size, 1.8);
    const layoutDurationMs = Math.round((performance.now() - tStart) * 100) / 100;

    // Measure LOD filtering speeds for each level
    const lodFilterTimes = {};
    for (const [levelName, levelCode] of Object.entries(LOD_LEVELS)) {
      const fStart = performance.now();
      const filtered = filterGraphForLOD(graph, levelCode);
      const fTime = Math.round((performance.now() - fStart) * 100) / 100;
      lodFilterTimes[levelName] = {
        timeMs: fTime,
        visibleNodes: filtered.nodes.length,
        visibleEdges: filtered.edges.length,
        lineBufferSize: filtered.linePositions.byteLength
      };
    }

    const memoryAfter = typeof process !== "undefined" && process.memoryUsage
      ? process.memoryUsage().heapUsed
      : 0;
    const memoryDeltaMb = Math.round(((memoryAfter - memoryBefore) / (1024 * 1024)) * 100) / 100;

    results.push({
      targetNodes: size,
      actualNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      aggregatedEdges: graph.aggregatedEdges.length,
      layoutDurationMs,
      memoryDeltaMb,
      lodFilterTimes
    });
  }

  return results;
}

export default {
  runLodBenchmark
};
