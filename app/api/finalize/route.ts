import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const { topic, background, current_events, perspectives, so_what, synthesized } =
    await req.json();

  if (!topic || !synthesized) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slug = nanoid(10);

  const { error } = await supabaseAdmin.from("reports").insert({
    slug,
    topic,
    background,
    current_events,
    perspectives,
    so_what,
    synthesized,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ slug });
}
