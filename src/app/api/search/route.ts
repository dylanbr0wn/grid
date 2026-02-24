import { searchReleases } from "@/lib/music-brainz";
import { type } from "arktype";

const limitParam = type("number").atLeast(1).atMost(100);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const limit = limitParam.assert(searchParams.get("limit") || "25");
  const offset = limitParam.assert(searchParams.get("offset") || "0");

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
