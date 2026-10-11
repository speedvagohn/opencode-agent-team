import { test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import * as mgr from "./manager";

const DDL = `
CREATE TABLE IF NOT EXISTS slices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slices(id),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  UNIQUE(slice_id, name)
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  UNIQUE(entity_id, content)
);

CREATE TABLE IF NOT EXISTS relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slices(id),
  from_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  UNIQUE(slice_id, from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_entities_slice ON entities(slice_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_relations_slice ON relations(slice_id);
CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_id);
`;

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(DDL);
});

test("t1: readGraph returns entities and relations without throwing", () => {
  mgr.createEntities(db, "s1", [{ name: "a", entityType: "T", observations: ["a1"] }]);
  mgr.createEntities(db, "s1", [{ name: "b", entityType: "T", observations: ["b1"] }]);
  mgr.createRelations(db, "s1", [{ from: "a", to: "b", relationType: "rel" }]);

  const graph = mgr.readGraph(db, "s1");
  expect(graph.entities.length).toBe(2);
  expect(graph.relations.length).toBe(1);
  expect(graph.relations[0].from).toBe("a");
  expect(graph.relations[0].to).toBe("b");
});

test("t2: openNodes default keeps MOST RECENT 50 (by id), reports omitted", () => {
  const all: string[] = [];
  for (let i = 60; i >= 1; i--) {
    all.push(`m-${String(i).padStart(2, "0")}`);
  }
  mgr.createEntities(db, "s1", [{ name: "log", entityType: "T", observations: all }]);

  const res = mgr.openNodes(db, "s1", ["log"]);
  expect(res.entities.length).toBe(1);
  const obs = res.entities[0].observations;
  expect(obs.length).toBe(50);
  expect(res.omittedObservations).toBe(10);
  expect(obs[0]).toBe("m-50");
  expect(obs[49]).toBe("m-01");
});

test("t3: openNodes maxObs=0 returns all observations", () => {
  const all = Array.from({ length: 60 }, (_, i) => `x-${String(i + 1).padStart(2, "0")}`);
  mgr.createEntities(db, "s1", [{ name: "log", entityType: "T", observations: all }]);

  const res = mgr.openNodes(db, "s1", ["log"], 0);
  expect(res.entities[0].observations.length).toBe(60);
  expect(res.omittedObservations).toBe(0);
});

test("t4: addObservations appends to existing entity", () => {
  mgr.createEntities(db, "s1", [{ name: "e", entityType: "T", observations: ["first"] }]);
  mgr.addObservations(db, "s1", [{ entityName: "e", contents: ["second", "third"] }]);

  const res = mgr.openNodes(db, "s1", ["e"], 0);
  expect(res.entities[0].observations).toEqual(["first", "second", "third"]);
});
