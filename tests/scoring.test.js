import assert from "node:assert/strict";
import { classifyScore, computeScore } from "../src/scoring.js";

const computed = computeScore("critical breach");
assert.ok(computed.score > 0.5);
assert.ok(computed.reasons.length > 0);
assert.equal(classifyScore(0.9), "critical");
assert.equal(classifyScore(0.65), "high");
assert.equal(classifyScore(0.4), "medium");
assert.equal(classifyScore(0.1), "low");
