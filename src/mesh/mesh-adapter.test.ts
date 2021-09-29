import { MeshTag, MeshTenant } from "./mesh-tenant.model.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { assertEquals } from "../dev-deps.ts";

Deno.test("mesh-adapter can see which tags have changed compared to the original", () => {
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

  const sut = new TestMeshAdapter();
  const changedTags = sut.listChangedTags(updatedTags, originalTags);
  assertEquals(changedTags, [
    {
      tagName: "cost_center",
      tagValues: ["1234"],
    },
  ]);
});

export class TestMeshAdapter extends MeshAdapter {
  listChangedTags(updatedTags: MeshTag[], originalTags: MeshTag[]) {
    return this.getChangedTags(updatedTags, originalTags);
  }

  attachTenantCosts(
    _tenants: MeshTenant[],
    _startDate: Date,
    _endDate: Date,
  ): Promise<void> {
    return Promise.resolve();
  }

  attachTenantRoleAssignments(_tenants: MeshTenant[]): Promise<void> {
    return Promise.resolve();
  }

  getMeshTenants(): Promise<MeshTenant[]> {
    return Promise.resolve([]);
  }

  updateMeshTenant(
    _updatedTenant: MeshTenant,
    _originalTenant: MeshTenant,
  ): Promise<void> {
    return Promise.resolve();
  }
}
