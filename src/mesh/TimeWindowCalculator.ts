import { moment } from "x/deno_moment";

export interface TimeWindow {
  from: Date;
  to: Date;
}

export class TimeWindowCalculator {
  calculateTimeWindows(
    startDate: Date,
    endDate: Date,
  ): TimeWindow[] {
    // Build the date time iterations.
    const start = moment.utc(startDate);
    const end = moment.utc(endDate);
    const windows = [];

    while (end >= start) {
      const designatedEnd = moment(start).endOf("month").toDate();
      const designatedStart = moment(start).startOf("month").toDate();

      windows.push({
        from: (start > designatedStart) ? start.toDate() : designatedStart,
        to: (designatedEnd > end) ? end.toDate() : designatedEnd,
      });
      start.startOf("month").add(1, "month");
    }

    return windows;
  }
}
