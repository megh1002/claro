import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const { decision, facts, risks, tradeoffs, devils_advocate, verdict, user_id, stakes, reversibility } =
    await req.json();

  if (!decision || !verdict) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slug = nanoid(10);

  // Map decision-engine fields onto the existing reports columns.
  const { error } = await supabaseAdmin.from("reports").insert({
    slug,
    topic: decision,
    background: facts,
    current_events: risks,
    perspectives: tradeoffs,
    so_what: devils_advocate,
    synthesized: verdict,
    user_id: user_id ?? null,
    stakes: stakes ?? null,
    reversibility: reversibility ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ slug });
}
