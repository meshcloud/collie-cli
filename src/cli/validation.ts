const prefixedId = /.+\/.+/;

export function validateIsPrefixedId(id: string) {
  return prefixedId.test(id);
}
