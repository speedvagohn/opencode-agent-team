#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDbForCwd, closeAll } from "./db.ts";
import * as mgr from "./manager.ts";

process.on("SIGINT", () => { closeAll(); process.exit(0); });
process.on("SIGTERM", () => { closeAll(); process.exit(0); });

const server = new McpServer({
  name: "memory-mcp-sqlite",
  version: "0.2.0",
});

const cwdSchema = z.string().describe(
  "Working directory of session. Copy from <env>Working directory</env>. " +
  "MCP walks up from cwd to find .memory/ directory."
);
const sliceIdSchema = z.string().describe(
  "Required. Slice ID within DB. " +
  "For task work: ticket ID like DE-3549 or MAIL-1234. " +
  "For cross-task knowledge: 'default'."
);
const entitySchema = z.object({
  name: z.string(),
  entityType: z.string(),
  observations: z.array(z.string()),
});
const relationSchema = z.object({
  from: z.string(),
  to: z.string(),
  relationType: z.string(),
});

server.tool("list_slices",
  "List all slices in the memory database with entity counts. Call this first to discover what data exists.",
  { cwd: cwdSchema },
  { readOnlyHint: true },
  async ({ cwd }) => {
    const db = getDbForCwd(cwd);
    const slices = mgr.listSlices(db);
    return { content: [{ type: "text", text: JSON.stringify(slices) }] };
  }
);

server.tool("create_entities",
  "Create new entities in the knowledge graph",
  { cwd: cwdSchema, slice_id: sliceIdSchema, entities: z.array(entitySchema) },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  async ({ cwd, slice_id, entities }) => {
    const db = getDbForCwd(cwd);
    const created = mgr.createEntities(db, slice_id, entities);
    return { content: [{ type: "text", text: JSON.stringify(created) }] };
  }
);

server.tool("create_relations",
  "Create relations between entities",
  { cwd: cwdSchema, slice_id: sliceIdSchema, relations: z.array(relationSchema) },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  async ({ cwd, slice_id, relations }) => {
    const db = getDbForCwd(cwd);
    const created = mgr.createRelations(db, slice_id, relations);
    return { content: [{ type: "text", text: JSON.stringify(created) }] };
  }
);

server.tool("add_observations",
  "Add observations to existing entities in a slice",
  {
    cwd: cwdSchema,
    slice_id: sliceIdSchema,
    observations: z.array(z.object({
      entityName: z.string(),
      contents: z.array(z.string()),
    })),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  async ({ cwd, slice_id, observations }) => {
    const db = getDbForCwd(cwd);
    const result = mgr.addObservations(db, slice_id, observations);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool("delete_entities",
  "Delete entities by name within a slice (cascades observations and relations)",
  { cwd: cwdSchema, slice_id: sliceIdSchema, entityNames: z.array(z.string()) },
  { readOnlyHint: false, destructiveHint: true },
  async ({ cwd, slice_id, entityNames }) => {
    const db = getDbForCwd(cwd);
    const deleted = mgr.deleteEntities(db, slice_id, entityNames);
    return { content: [{ type: "text", text: JSON.stringify(deleted) }] };
  }
);

server.tool("delete_observations",
  "Delete specific observations from entities within a slice",
  {
    cwd: cwdSchema,
    slice_id: sliceIdSchema,
    deletions: z.array(z.object({
      entityName: z.string(),
      observations: z.array(z.string()),
    })),
  },
  { readOnlyHint: false, destructiveHint: true },
  async ({ cwd, slice_id, deletions }) => {
    const db = getDbForCwd(cwd);
    mgr.deleteObservations(db, slice_id, deletions);
    return { content: [{ type: "text", text: "Observations deleted" }] };
  }
);

server.tool("delete_relations",
  "Delete relations between entities within a slice",
  { cwd: cwdSchema, slice_id: sliceIdSchema, relations: z.array(relationSchema) },
  { readOnlyHint: false, destructiveHint: true },
  async ({ cwd, slice_id, relations }) => {
    const db = getDbForCwd(cwd);
    mgr.deleteRelations(db, slice_id, relations);
    return { content: [{ type: "text", text: "Relations deleted" }] };
  }
);

server.tool("read_graph",
  "Read the entire knowledge graph for a slice",
  { cwd: cwdSchema, slice_id: sliceIdSchema },
  { readOnlyHint: true },
  async ({ cwd, slice_id }) => {
    const db = getDbForCwd(cwd);
    const graph = mgr.readGraph(db, slice_id);
    return { content: [{ type: "text", text: JSON.stringify(graph) }] };
  }
);

server.tool("search_nodes",
  "Search entities by name, type, or observation content (Cyrillic-aware)",
  { cwd: cwdSchema, slice_id: sliceIdSchema, query: z.string() },
  { readOnlyHint: true },
  async ({ cwd, slice_id, query }) => {
    const db = getDbForCwd(cwd);
    const graph = mgr.searchNodes(db, slice_id, query);
    return { content: [{ type: "text", text: JSON.stringify(graph) }] };
  }
);

server.tool("semantic_search",
  "Semantic search across observations using embeddings (bge-m3). Cross-language: RU query finds EN content. Returns top-K matching entities with similarity scores. Requires LLM Proxy on localhost:3333.",
  { cwd: cwdSchema, slice_id: sliceIdSchema, query: z.string(), top_k: z.number().optional() },
  { readOnlyHint: true, openWorldHint: true },
  async ({ cwd, slice_id, query, top_k }) => {
    const db = getDbForCwd(cwd);
    const result = await mgr.semanticSearch(db, slice_id, query, top_k || 5);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool("open_nodes",
  "Open specific entities by name, returning their observations and relations. Truncates observations per entity keeping the most recent N (default 50); omittedObservations reports the total dropped. Pass 0 for unlimited.",
  {
    cwd: cwdSchema,
    slice_id: sliceIdSchema,
    names: z.array(z.string()),
    max_observations_per_entity: z.number().int().min(0).optional().describe(
      "Max observations per entity; keeps the MOST RECENT N (by id). Default 50. 0 = unlimited."
    ),
  },
  { readOnlyHint: true },
  async ({ cwd, slice_id, names, max_observations_per_entity }) => {
    const db = getDbForCwd(cwd);
    const graph = mgr.openNodes(db, slice_id, names, max_observations_per_entity ?? 50);
    return { content: [{ type: "text", text: JSON.stringify(graph) }] };
  }
);

server.tool("summarize_slice",
  "Generate a compressed, LLM-synthesized summary of slice content relevant to a specific query. Returns ~500 tokens summary via local LLM proxy. Latency: warm ~5-30s; cold model or proxy down → graceful degrade to raw observations.\n\nUSE WHEN query is synthetic or narrative — overview, root-cause analysis, 'what was done', connecting multiple facts into a coherent explanation.\n\nDO NOT USE for: exact credentials, file paths, version numbers, single specific facts — use semantic_search + open_nodes instead (cheaper, 0.4s, no hallucination risk).\n\nMIXED QUERY (fact + synthesis): run semantic_search first; if results insufficient, escalate to summarize_slice.\n\nRequired: cwd, slice_id, query. Optional: mode ('cheap'|'deep'), top_k. On degradedReason=timeout do NOT retry immediately — the proxy keeps serving the abandoned request for up to ~5 min and retries queue behind it; wait 2-3 minutes.",
  {
    cwd: cwdSchema,
    slice_id: sliceIdSchema,
    query: z.string(),
    mode: z.enum(["cheap", "deep"]).optional(),
    top_k: z.number().optional(),
  },
  { readOnlyHint: true, openWorldHint: true },
  async ({ cwd, slice_id, query, mode, top_k }) => {
    const db = getDbForCwd(cwd);
    try {
      const result = await mgr.summarizeSlice(db, slice_id, query, { mode, topK: top_k });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: JSON.stringify({ error: msg, recoverable: false }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
