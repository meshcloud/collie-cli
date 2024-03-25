import { stringify } from "std/yaml";
import { Presenter } from "./presenter.ts";

export class YamlPresenter<T> implements Presenter {
  constructor(
    private readonly view: T,
  ) {}

  present(): void {
    // TODO maybe better to embed this directly as requirement in T but did not know how.
    const yaml = stringify(this.view as Record<string, unknown>);
    console.log(yaml);
  }
}
