const prefixedId = /.+\/.+/g;

export function validateIsPrefixedId(id: string) {
  return prefixedId.test(id);
}
