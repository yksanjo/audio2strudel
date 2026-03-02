import assert from "node:assert/strict";
import { assess, summarize } from "../src/main.js";

const result = assess("critical outage detected");
assert.ok(result.project);
assert.ok(result.score >= 0 && result.score <= 1);
assert.ok(["critical", "high", "medium", "low"].includes(result.status));
assert.ok(Array.isArray(result.reasons));
assert.ok(summarize("warning latency").includes("status="));
