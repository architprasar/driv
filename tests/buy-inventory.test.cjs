const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = fs.readFileSync(require.resolve("../src/components/buy/inventory.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const exportsObject = {};
new Function("exports", compiled.outputText)(exportsObject);
const { inventoryQuery } = exportsObject;

test("normalizes homepage filters and display city without changing API contracts", () => {
  const query = inventoryQuery({ body_type: "SUV", fuel_type: "Petrol", transmission: "Automatic", city: "Bengaluru" });
  assert.equal(query.get("body_type"), "suv");
  assert.equal(query.get("fuel_type"), "petrol");
  assert.equal(query.get("transmission"), "automatic");
  assert.equal(query.get("city"), "Bangalore");
});
test("explicit all-city reset overrides the selected-city cookie", () => {
  assert.equal(inventoryQuery({ city: "all" }, "Mumbai").has("city"), false);
  assert.equal(inventoryQuery({}, "Mumbai").get("city"), "Mumbai");
  assert.equal(inventoryQuery({}, "All Cities").has("city"), false);
});
test("only known nonempty query fields are forwarded and repeated values are deterministic", () => {
  const query = inventoryQuery({ search: ["Creta", "Nexon"], max_price: "2000000", unknown: "bad", model: "" });
  assert.deepEqual(Object.fromEntries(query), { search: "Creta", max_price: "2000000" });
});
test("preserves sorting and pagination parameters", () => {
  const query = inventoryQuery({ sort: "price_asc", page: "2", brand: "hyundai", min_price: "500000" });
  assert.equal(query.get("sort"), "price_asc");
  assert.equal(query.get("page"), "2");
  assert.equal(query.get("brand"), "hyundai");
});
