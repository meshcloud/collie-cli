
Deno.test("unregistering a signal handler that was never registered has no bad side-effects", () => {
  Deno.removeSignalListener("SIGTERM", () => {});
});
