/**
 * A null object that allows us to skip reporting for foundation/platform progress when those are not needed
 */

export class NullProgressReporter {
  done(): void {}
}
