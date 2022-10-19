import { KitBundle } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {
  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, string> {
    return new Map<string, string>([
      ["bootstrap", "https://github.com/"],
      ["base", "https://github.com/"]
    ]);
  }
}