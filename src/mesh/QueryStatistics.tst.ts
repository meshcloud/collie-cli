import { assert, delay } from "../dev-deps.ts";
import { MeshPlatform } from "./MeshTenantModel.ts";
import { QueryStatistics } from "./QueryStatistics.ts";

Deno.test("recording adds up", async () => {
  const sut = new QueryStatistics();

  await sut.recordQuery(MeshPlatform.AWS, 0, async () => {
    await delay(2);
  });

  await sut.recordQuery(MeshPlatform.AWS, 0, async () => {
    await delay(2);
  });

  assert((sut.duration.AWS || 0) >= 4); // not a perfect test, could have false negatives on slow machines
});

Deno.test("Writing multiple times with different layer clears values", async () => {
  const sut = new QueryStatistics();

  await sut.recordQuery(MeshPlatform.GCP, 0, async () => {
    await delay(2);
  });

  await sut.recordQuery(MeshPlatform.AWS, 1, async () => {
    await delay(2);
  });

  assert(sut.duration.GCP === undefined);
  assert((sut.duration.AWS || 0) >= 1);
});

Deno.test("Re-entrant calls with different layers only keeps the highest layer call", async () => {
  const sut = new QueryStatistics();

  await sut.recordQuery("cache", 0, async () => {
    await sut.recordQuery(MeshPlatform.AWS, 1, async () => {
      await delay(2);
    });
    await sut.recordQuery(MeshPlatform.GCP, 1, async () => {
      await delay(2);
    });
  });

  assert(sut.duration["cache"] === undefined);
  assert((sut.duration.AWS || 0) >= 1);
  assert((sut.duration.GCP || 0) >= 1);
});
