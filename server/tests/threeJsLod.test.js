import assert from "node:assert";
import {
  GROUP_CONFIG,
  LOD_LEVELS,
  LOD_THRESHOLDS,
  determineLODLevel,
  classifyGroup,
  deriveComplexity,
  deriveAstSymbols,
  buildGraphLayout,
  filterGraphForLOD,
  generateSyntheticGraph
} from "../../client/src/components/visualization/graphLayout.js";
import { runLodBenchmark } from "../../client/src/components/visualization/lodBenchmark.js";

export async function runThreeJsLodTests() {
  console.log("\n=========================================");
  console.log("  DEVRA Three.js LOD & Large Graph Tests ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [Three.js LOD] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [Three.js LOD] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. LOD Selection across Camera Distances
  await test("Correct LOD level selection across distance ranges", () => {
    // Overview (> 22)
    assert.strictEqual(determineLODLevel(28.0, LOD_LEVELS.OVERVIEW), LOD_LEVELS.OVERVIEW);
    assert.strictEqual(determineLODLevel(25.0, LOD_LEVELS.OVERVIEW), LOD_LEVELS.OVERVIEW);

    // Module Detail (12 to 22)
    assert.strictEqual(determineLODLevel(18.0, LOD_LEVELS.MODULE), LOD_LEVELS.MODULE);
    assert.strictEqual(determineLODLevel(14.0, LOD_LEVELS.MODULE), LOD_LEVELS.MODULE);

    // File Detail (5 to 12)
    assert.strictEqual(determineLODLevel(9.0, LOD_LEVELS.FILE), LOD_LEVELS.FILE);
    assert.strictEqual(determineLODLevel(6.0, LOD_LEVELS.FILE), LOD_LEVELS.FILE);

    // Deep Inspection (<= 5)
    assert.strictEqual(determineLODLevel(3.5, LOD_LEVELS.DEEP), LOD_LEVELS.DEEP);
    assert.strictEqual(determineLODLevel(1.5, LOD_LEVELS.DEEP), LOD_LEVELS.DEEP);
  });

  // 2. Hysteresis Guard Prevents Rapid Oscillation Near Thresholds
  await test("Hysteresis guard stabilizes transitions near boundary thresholds", () => {
    // Current is OVERVIEW (threshold 22, hysteresis 0.8)
    // Moving inward: at 21.5, still within hysteresis dead-zone, stays OVERVIEW
    assert.strictEqual(determineLODLevel(21.5, LOD_LEVELS.OVERVIEW), LOD_LEVELS.OVERVIEW);
    // Crossing boundary - hysteresis (22 - 0.8 = 21.2): 21.0 triggers transition to MODULE
    assert.strictEqual(determineLODLevel(21.0, LOD_LEVELS.OVERVIEW), LOD_LEVELS.MODULE);

    // Current is MODULE: moving outward toward 22.0
    // At 22.4, within hysteresis (22 + 0.8 = 22.8), stays MODULE
    assert.strictEqual(determineLODLevel(22.4, LOD_LEVELS.MODULE), LOD_LEVELS.MODULE);
    // Crossing boundary + hysteresis (22.9): triggers transition back to OVERVIEW
    assert.strictEqual(determineLODLevel(22.9, LOD_LEVELS.MODULE), LOD_LEVELS.OVERVIEW);
  });

  // 3. Multi-Level Node & Edge Filtering
  await test("filterGraphForLOD correctly scales node and edge counts by LOD level", () => {
    const graph = generateSyntheticGraph(250, 1.8);

    // Overview: Only hub anchors and high-level aggregated edges
    const overview = filterGraphForLOD(graph, LOD_LEVELS.OVERVIEW);
    assert.strictEqual(overview.nodes.length, 5); // 5 domain cluster hubs
    assert.ok(overview.edges.length > 0);
    assert.ok(overview.edges.every((e) => e.id.startsWith("agg-") || e.lodLevel === LOD_LEVELS.OVERVIEW));

    // Module: Hubs + core module entry files (<= 15 per group)
    const moduleDetail = filterGraphForLOD(graph, LOD_LEVELS.MODULE);
    assert.ok(moduleDetail.nodes.length > overview.nodes.length);
    assert.ok(moduleDetail.nodes.length <= 80);

    // File Detail: All nodes visible
    const fileDetail = filterGraphForLOD(graph, LOD_LEVELS.FILE);
    assert.strictEqual(fileDetail.nodes.length, graph.nodes.length);
    assert.ok(fileDetail.nodes.length >= 250);
  });

  // 4. Stable Node Identifiers and File Data Preservation
  await test("Graph layout maintains stable node IDs and preserves underlying file data", () => {
    const rawFiles = [
      { path: "src/api/authController.ts", name: "authController.ts", lines: 250 },
      { path: "src/models/User.ts", name: "User.ts", lines: 180 },
      { path: "src/client/App.tsx", name: "App.tsx", lines: 300, isEntryPoint: true }
    ];

    const graph1 = buildGraphLayout({ files: rawFiles }, { name: "test-repo" });
    const graph2 = buildGraphLayout({ files: rawFiles }, { name: "test-repo" });

    // Verify IDs match exactly across updates
    const ids1 = graph1.nodes.map((n) => n.id).sort();
    const ids2 = graph2.nodes.map((n) => n.id).sort();
    assert.deepStrictEqual(ids1, ids2);

    // Verify raw files are present in the node map
    assert.ok(graph1.nodesById.has("src/api/authController.ts"));
    assert.ok(graph1.nodesById.has("src/models/User.ts"));
    assert.ok(graph1.nodesById.has("src/client/App.tsx"));
  });

  // 5. Search Across Aggregated Views
  await test("Search query reveals matching deep file even in Level 0 Overview", () => {
    const graph = generateSyntheticGraph(300);
    const targetFile = graph.nodes.find((n) => !n.isHub && n.lodLevel === LOD_LEVELS.FILE);
    assert.ok(targetFile, "Target deep file must exist");

    // In Overview without search, targetFile is hidden
    const normalOverview = filterGraphForLOD(graph, LOD_LEVELS.OVERVIEW);
    assert.strictEqual(normalOverview.nodes.some((n) => n.id === targetFile.id), false);

    // In Overview WITH search, targetFile is explicitly revealed
    const searchedOverview = filterGraphForLOD(graph, LOD_LEVELS.OVERVIEW, { searchQuery: targetFile.name });
    assert.strictEqual(searchedOverview.nodes.some((n) => n.id === targetFile.id), true);
  });

  // 6. Empty and Partially Indexed Repositories
  await test("Empty and partially indexed repositories generate clean fallback clusters", () => {
    // Completely empty repository
    const emptyGraph = buildGraphLayout({}, {});
    assert.strictEqual(emptyGraph.nodes.length > 0, true);
    assert.strictEqual(emptyGraph.nodes.filter((n) => n.isHub).length, 5);
    assert.ok(emptyGraph.linePositions.length > 0);

    // Missing files array
    const partialGraph = buildGraphLayout({ files: null }, { fileTree: [] });
    assert.strictEqual(partialGraph.nodes.length > 0, true);
  });

  // 7. Edge Aggregation & Line Buffer Pre-Calculation
  await test("Pre-calculated line buffers exist for every LOD level with bounded buffer sizes", () => {
    const graph = generateSyntheticGraph(500);
    assert.ok(graph.linePositionsByLod[LOD_LEVELS.OVERVIEW]);
    assert.ok(graph.linePositionsByLod[LOD_LEVELS.MODULE]);
    assert.ok(graph.linePositionsByLod[LOD_LEVELS.FILE]);
    assert.ok(graph.linePositionsByLod[LOD_LEVELS.DEEP]);

    // Overview buffer must be significantly smaller than File buffer
    assert.ok(graph.linePositionsByLod[LOD_LEVELS.OVERVIEW].length <= graph.linePositionsByLod[LOD_LEVELS.FILE].length);
  });

  // 8. AST Symbol Derivation for Level 3 Deep Inspection
  await test("deriveAstSymbols extracts functions, classes, and components for files", () => {
    const controllerSymbols = deriveAstSymbols({ name: "userController.js", group: "Backend" });
    assert.ok(controllerSymbols.some((s) => s.kind === "function" || s.kind === "method"));

    const modelSymbols = deriveAstSymbols({ name: "UserModel.ts", group: "Database" });
    assert.ok(modelSymbols.some((s) => s.kind === "schema" || s.kind === "class"));

    const entrySymbols = deriveAstSymbols({ name: "main.ts", isEntryPoint: true, group: "Backend" });
    assert.ok(entrySymbols.some((s) => s.exported === true));
  });

  // 9. Scalability Benchmark: 1,000, 5,000, and 10,000 Nodes
  await test("Synthetic graph benchmarks process 1,000, 5,000, and 10,000 nodes efficiently", () => {
    const benchmarkResults = runLodBenchmark([1000, 5000, 10000]);
    assert.strictEqual(benchmarkResults.length, 3);

    for (const res of benchmarkResults) {
      assert.ok(res.actualNodes >= res.targetNodes);
      assert.ok(res.layoutDurationMs < 2500, `Layout duration for ${res.targetNodes} nodes must be < 2500ms (got ${res.layoutDurationMs}ms)`);
      assert.ok(res.lodFilterTimes.OVERVIEW.timeMs < 150, `LOD Overview filter time for ${res.targetNodes} nodes must be < 150ms`);
      assert.ok(res.lodFilterTimes.FILE.timeMs < 250, `LOD File filter time for ${res.targetNodes} nodes must be < 250ms`);
    }

    const res1k = benchmarkResults[0];
    const res5k = benchmarkResults[1];
    const res10k = benchmarkResults[2];

    console.log(`     [Benchmark 1,000 Nodes] Layout: ${res1k.layoutDurationMs}ms | LOD Filter: ${res1k.lodFilterTimes.OVERVIEW.timeMs}ms | Edges: ${res1k.totalEdges}`);
    console.log(`     [Benchmark 5,000 Nodes] Layout: ${res5k.layoutDurationMs}ms | LOD Filter: ${res5k.lodFilterTimes.OVERVIEW.timeMs}ms | Edges: ${res5k.totalEdges}`);
    console.log(`     [Benchmark 10,000 Nodes] Layout: ${res10k.layoutDurationMs}ms | LOD Filter: ${res10k.lodFilterTimes.OVERVIEW.timeMs}ms | Edges: ${res10k.totalEdges}`);
  });

  return { passed, failed };
}

export default runThreeJsLodTests;
