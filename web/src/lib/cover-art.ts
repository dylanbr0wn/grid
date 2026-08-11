export function getCoverArtUrl(
  releaseGroupId: string,
  size: "small" | "large" = "large",
) {
  if (!releaseGroupId) return undefined;
  const sizeParam = size === "small" ? "250" : "500";
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${sizeParam}`;
}
