import { searchReleases } from "@/lib/music-brainz";
import { type } from "arktype";
import { NextRequest } from "next/server";

const parseLimit = type("string.numeric.parse").to("1 < number.integer < 100");
const parseOffset = type("string.numeric.parse").to("number.integer >= 0");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const query = searchParams.get("query") || "";
    const limit = parseLimit(searchParams.get("limit") || "25");
    if (limit instanceof type.errors) {
      throw new Error(`Invalid limit parameter: ${limit.summary}`);
    }

    const offset = parseOffset(searchParams.get("offset") || "0");
    if (offset instanceof type.errors) {
      throw new Error(`Invalid offset parameter: ${offset.summary}`);
    }

    const results = await searchReleases(query, limit, offset);
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search API:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
