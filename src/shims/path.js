export function join(...parts) {
  return parts.filter((part) => typeof part === "string").join("/");
}

export function basename(p) {
  return String(p).split("/").pop();
}

export function resolve(...parts) {
  return join(...parts);
}

export default { join, basename, resolve };
