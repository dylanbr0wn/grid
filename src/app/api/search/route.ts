import {
  searchReleases,
  type SearchReleaseField,
  type SearchReleaseType,
} from "@/lib/music-brainz";
import { type } from "arktype";
import { NextRequest } from "next/server";

const parseLimit = type("string.numeric.parse").to("1 < number.integer < 100");
const parseOffset = type("string.numeric.parse").to("number.integer >= 0");
const parseType = type("'all'|'album'|'ep'|'single'");
const parseField = type("'all'|'title'|'artist'");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const query = searchParams.get("query") || "";
    const limit = parseLimit(searchParams.get("limit") || "25");
    if (limit instanceof type.errors) {
      return new Response(JSON.stringify({ error: limit.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const offset = parseOffset(searchParams.get("offset") || "0");
    if (offset instanceof type.errors) {
      return new Response(JSON.stringify({ error: offset.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const releaseType = parseType(searchParams.get("type") || "all");
    if (releaseType instanceof type.errors) {
      return new Response(JSON.stringify({ error: releaseType.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const field = parseField(searchParams.get("field") || "all");
    if (field instanceof type.errors) {
      return new Response(JSON.stringify({ error: field.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = await searchReleases(query, {
      limit,
      offset,
      type: releaseType as SearchReleaseType,
      field: field as SearchReleaseField,
    });
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
