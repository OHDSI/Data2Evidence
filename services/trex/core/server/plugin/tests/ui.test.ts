//deno test --no-check --allow-env ./core/server/plugin/ui.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { updatePluginJson, mergeChildren, mergePluginItem } from "../ui.ts";
import { env, global } from "../../env.ts";
import * as data1 from "./test-data-1.ts";
import * as data2 from "./test-data-2.ts";
import * as data3 from "./test-data-3.ts";

// Mock env for testing
const originalEnv = { ...env };
const originalGlobal = { ...global };

// Mock env configuration
Object.defineProperty(env, "CADDY__ALP__PUBLIC_FQDN", { value: "example.com" });

Deno.test({
  name: "updatePluginJson - should add new key-value pairs when key does not exist in plugins",
  fn: () => {
    const plugins = { existingKey: [{ route: "/route1" }] };
    const uiPlugins = { newKey: [{ route: "/route2" }] };

    const result = JSON.parse(updatePluginJson(plugins, uiPlugins));

    assertEquals(result, {
      existingKey: [{ route: "/route1" }],
      newKey: [{ route: "/route2" }],
    });
  },
});

Deno.test({
  name: "updatePluginJson - should concatenate arrays when key exists in plugins",
  fn: () => {
    const plugins = { key1: [{ route: "/route1" }] };
    const uiPlugins = { key1: [{ route: "/route2" }] };

    const result = JSON.parse(updatePluginJson(plugins, uiPlugins));

    assertEquals(result, {
      key1: [{ route: "/route1" }, { route: "/route2" }],
    });
  },
});

Deno.test({
  name: "updatePluginJson - should remove duplicates by route when concatenating arrays",
  fn: () => {
    const plugins = { key1: [{ route: "/route1", name: "first" }] };
    const uiPlugins = { key1: [{ route: "/route1", name: "second" }] };

    const result = JSON.parse(updatePluginJson(plugins, uiPlugins));

    assertEquals(result, {
      key1: [{ route: "/route1", name: "second" }],
    });
  },
});

Deno.test({
  name: "updatePluginJson - should handle multiple keys and preserve existing keys",
  fn: () => {
    const plugins = {
      key1: [{ route: "/route1" }],
      key2: [{ route: "/route2" }],
    };
    const uiPlugins = {
      key1: [{ route: "/route3" }],
      key3: [{ route: "/route4" }],
    };

    const result = JSON.parse(updatePluginJson(plugins, uiPlugins));

    assertEquals(result, {
      key1: [{ route: "/route1" }, { route: "/route3" }],
      key2: [{ route: "/route2" }],
      key3: [{ route: "/route4" }],
    });
  },
});

Deno.test({
  name: "updatePluginJson - should replace empty json correctly",
  fn: () => {
    const { plugins, uiPlugins, expected } = data1;

    const result = updatePluginJson(data1.plugins, uiPlugins);

    assertEquals(result, JSON.stringify(expected));
  },
});

Deno.test({
  name: "updatePluginJson - should update json correctly when plugin is on first level",
  fn: () => {
    const plugins = JSON.parse(JSON.stringify(data1.plugins));
    const uiPlugins = JSON.parse(JSON.stringify(data2.uiPlugins));
    const result = updatePluginJson(plugins, uiPlugins);

    assertEquals(result, JSON.stringify(data2.expected));
    // console.log(result);
    // console.log("=====================");
    // console.log(JSON.stringify(data2.expected));
  },
});

Deno.test({
  name: "updatePluginJson - should update json correctly when plugin is on second level",
  fn: () => {
    const plugins = JSON.parse(JSON.stringify(data1.plugins));
    const uiPlugins = JSON.parse(JSON.stringify(data3.uiPlugins));
    const result = updatePluginJson(plugins, uiPlugins);

    assertEquals(result, JSON.stringify(data3.expected));
    // console.log(result);
    // console.log("=====================");
    // console.log(JSON.stringify(data2.expected));
  },
});

// Tests for mergeChildren function
Deno.test({
  name: "mergeChildren - should create children array if it doesn't exist",
  fn: () => {
    const existingItem = { route: "/parent" };
    const incomingItem = {
      route: "/parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };

    mergeChildren(existingItem, incomingItem);

    assertEquals(existingItem.children, [
      { route: "/child1", name: "Child 1" },
    ]);
  },
});

Deno.test({
  name: "mergeChildren - should add new children to existing array",
  fn: () => {
    const existingItem = {
      route: "/parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };
    const incomingItem = {
      route: "/parent",
      children: [{ route: "/child2", name: "Child 2" }],
    };

    mergeChildren(existingItem, incomingItem);

    assertEquals(existingItem.children, [
      { route: "/child1", name: "Child 1" },
      { route: "/child2", name: "Child 2" },
    ]);
  },
});

Deno.test({
  name: "mergeChildren - should update existing children with matching routes",
  fn: () => {
    const existingItem = {
      route: "/parent",
      children: [
        { route: "/child1", name: "Child 1", order: 1 },
        { route: "/child2", name: "Child 2", order: 2 },
      ],
    };
    const incomingItem = {
      route: "/parent",
      children: [
        {
          route: "/child1",
          name: "Updated Child 1",
          description: "New description",
        },
      ],
    };

    mergeChildren(existingItem, incomingItem);

    assertEquals(existingItem.children, [
      {
        route: "/child1",
        name: "Updated Child 1",
        order: 1,
        description: "New description",
      },
      { route: "/child2", name: "Child 2", order: 2 },
    ]);
  },
});

Deno.test({
  name: "mergeChildren - should skip children without routes",
  fn: () => {
    const existingItem = {
      route: "/parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };
    const incomingItem = {
      route: "/parent",
      children: [
        { name: "No Route Child" },
        { route: "/child2", name: "Child 2" },
      ],
    };

    mergeChildren(existingItem, incomingItem);

    assertEquals(existingItem.children, [
      { route: "/child1", name: "Child 1" },
      { route: "/child2", name: "Child 2" },
    ]);
  },
});

Deno.test({
  name: "mergeChildren - should do nothing if incomingItem has no children",
  fn: () => {
    const existingItem = {
      route: "/parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };
    const incomingItem = { route: "/parent" };

    mergeChildren(existingItem, incomingItem);

    assertEquals(existingItem.children, [
      { route: "/child1", name: "Child 1" },
    ]);
  },
});

// Tests for mergePluginItem function
Deno.test({
  name: "mergePluginItem - should merge properties from incoming item to existing item",
  fn: () => {
    const existingItem = {
      route: "/parent",
      name: "Original Name",
      order: 1,
    };
    const incomingItem = {
      route: "/parent",
      name: "Updated Name",
      description: "New description",
    };

    mergePluginItem(existingItem, incomingItem);

    assertEquals(existingItem, {
      route: "/parent",
      name: "Updated Name",
      order: 1,
      description: "New description",
    });
  },
});

Deno.test({
  name: "mergePluginItem - should handle and merge children",
  fn: () => {
    const existingItem = {
      route: "/parent",
      name: "Parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };
    const incomingItem = {
      route: "/parent",
      name: "Updated Parent",
      children: [{ route: "/child2", name: "Child 2" }],
    };

    mergePluginItem(existingItem, incomingItem);

    assertEquals(existingItem, {
      route: "/parent",
      name: "Updated Parent",
      children: [
        { route: "/child1", name: "Child 1" },
        { route: "/child2", name: "Child 2" },
      ],
    });
  },
});

Deno.test({
  name: "mergePluginItem - should update existing children properties",
  fn: () => {
    const existingItem = {
      route: "/parent",
      name: "Parent",
      children: [
        { route: "/child1", name: "Child 1", order: 1 },
        { route: "/child2", name: "Child 2", order: 2 },
      ],
    };
    const incomingItem = {
      route: "/parent",
      name: "Updated Parent",
      children: [
        {
          route: "/child1",
          name: "Updated Child 1",
          description: "Description",
        },
      ],
    };

    mergePluginItem(existingItem, incomingItem);

    assertEquals(existingItem, {
      route: "/parent",
      name: "Updated Parent",
      children: [
        {
          route: "/child1",
          name: "Updated Child 1",
          order: 1,
          description: "Description",
        },
        { route: "/child2", name: "Child 2", order: 2 },
      ],
    });
  },
});

Deno.test({
  name: "mergePluginItem - should handle incoming item without children",
  fn: () => {
    const existingItem = {
      route: "/parent",
      name: "Original Parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };
    const incomingItem = {
      route: "/parent",
      name: "Updated Parent",
    };

    mergePluginItem(existingItem, incomingItem);

    assertEquals(existingItem, {
      route: "/parent",
      name: "Updated Parent",
      children: [{ route: "/child1", name: "Child 1" }],
    });
  },
});

Deno.test({
  name: "mergePluginItem - should handle existing item without children",
  fn: () => {
    const existingItem = {
      route: "/parent",
      name: "Original Parent",
    };
    const incomingItem = {
      route: "/parent",
      name: "Updated Parent",
      children: [{ route: "/child1", name: "Child 1" }],
    };

    mergePluginItem(existingItem, incomingItem);

    assertEquals(existingItem, {
      route: "/parent",
      name: "Updated Parent",
      children: [{ route: "/child1", name: "Child 1" }],
    });
  },
});
