import { TimeWindowCalculator } from "./time-window-calculator.ts";
import { moment } from "../deps.ts";
import { assertEquals } from "../dev-deps.ts";

const sut = new TimeWindowCalculator();

Deno.test("calculateTimewindows returns a correct time windows for monthly", () => {
  const start = moment.utc("2021-01-01").startOf("day").toDate();
  const end = moment.utc("2021-01-31").endOf("day").toDate();

  const result = sut.calculateTimeWindows(start, end);

  assertEquals(result, [{
    from: moment("2021-01-01T00:00:00.000Z").toDate(),
    to: moment("2021-01-31T23:59:59.999Z").toDate(),
  }]);
});

Deno.test("calculateTimewindows returns a correct time windows for non complete month", () => {
  const start = moment.utc("2021-01-01").startOf("day").toDate();
  const end = moment.utc("2021-01-20").endOf("day").toDate();

  const result = sut.calculateTimeWindows(start, end);

  assertEquals(result, [{
    from: moment("2021-01-01T00:00:00.000Z").toDate(),
    to: moment("2021-01-20T23:59:59.999Z").toDate(),
  }]);
});

Deno.test("calculateTimewindows returns a correct time windows for stepping over non complete months", () => {
  const start = moment.utc("2021-01-20").startOf("day").toDate();
  const end = moment.utc("2021-03-20").endOf("day").toDate();

  const result = sut.calculateTimeWindows(start, end);

  assertEquals(result, [{
    from: moment("2021-01-20T00:00:00.000Z").toDate(),
    to: moment("2021-01-31T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-02-01T00:00:00.000Z").toDate(),
    to: moment("2021-02-28T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-03-01T00:00:00.000Z").toDate(),
    to: moment("2021-03-20T23:59:59.999Z").toDate(),
  }]);
});

Deno.test("calculateTimewindows returns 5 correct time windows for monthly", () => {
  const start = moment.utc("2021-01-01").startOf("day").toDate();
  const end = moment.utc("2021-05-31").endOf("day").toDate();

  const result = sut.calculateTimeWindows(start, end);

  assertEquals(result, [{
    from: moment("2021-01-01T00:00:00.000Z").toDate(),
    to: moment("2021-01-31T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-02-01T00:00:00.000Z").toDate(),
    to: moment("2021-02-28T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-03-01T00:00:00.000Z").toDate(),
    to: moment("2021-03-31T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-04-01T00:00:00.000Z").toDate(),
    to: moment("2021-04-30T23:59:59.999Z").toDate(),
  }, {
    from: moment("2021-05-01T00:00:00.000Z").toDate(),
    to: moment("2021-05-31T23:59:59.999Z").toDate(),
  }]);
});
