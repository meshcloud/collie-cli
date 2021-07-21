import { assert, delay } from "../dev-deps.ts";
import { MeshPlatform } from "./mesh-tenant.model.ts";
import { QueryStatistics } from "./query-statistics.ts";

Deno.test("recording adds up", async () => {
  const sut = new QueryStatistics();

  await sut.recordQuery(MeshPlatform.AWS, async () => {
    await delay(1);
  });

  await sut.recordQuery(MeshPlatform.AWS, async () => {
    await delay(1);
  });

  assert((sut.duration.AWS || 0) >= 2); // not a perfect test, could have false negatives on slow machines
});
