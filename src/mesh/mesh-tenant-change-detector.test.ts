import { MeshTag } from "./mesh-tenant.model.ts";
import { assertEquals } from "../dev-deps.ts";
import { MeshTenantChangeDetector } from "./mesh-tenant-change-detector.ts";

Deno.test("MeshTenantChangeDetector can see which tags have changed compared to the original", () => {
  const updatedTags: MeshTag[] = [
    {
      tagName: "environment",
      tagValues: ["prod"],
    },
    {
      tagName: "cost_center",
      tagValues: ["1234"],
    },
  ];
  const originalTags: MeshTag[] = [
    {
      tagName: "environment",
      tagValues: ["prod"],
    },
  ];

  const sut = new MeshTenantChangeDetector();
  const changedTags = sut.getChangedTags(updatedTags, originalTags);
  assertEquals(changedTags, [
    {
      tagName: "cost_center",
      tagValues: ["1234"],
    },
  ]);
});
