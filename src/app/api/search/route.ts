import { searchReleases } from "@/lib/music-brainz";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const results = await searchReleases(query, limit, offset);
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
