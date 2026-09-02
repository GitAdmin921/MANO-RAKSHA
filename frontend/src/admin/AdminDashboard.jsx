import React, { useEffect, useState } from "react";
import { requireSupabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  async function loadStats() {
    try {
      const client = requireSupabase();
      const [{ count: users }, { count: moods }, { count: alerts }] = await Promise.all([
        client.from("profiles").select("*", { count: "exact", head: true }),
        client.from("mood_entries").select("*", { count: "exact", head: true }),
        client.from("alerts").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({ users: users ?? 0, moods: moods ?? 0, openAlerts: alerts ?? 0 });
    } catch (err) {
      setError(err?.message || "Unable to load admin data.");
    }
  }

  useEffect(() => {
    loadStats();
    let channel;
    try {
      const client = requireSupabase();
      channel = client
        .channel("admin-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "mood_entries" }, loadStats)
        .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, loadStats)
        .subscribe();
    } catch {}
    return () => {
      if (channel) requireSupabase().removeChannel(channel);
    };
  }, []);

  return (
    <main className="admin-dashboard">
      <h1>MANORAKSHA Admin</h1>
      <p>Operational analytics from the live database.</p>
      {error && <p role="alert">{error}</p>}
      <section className="admin-stats">
        <article><strong>{stats?.users ?? "—"}</strong><span>Users</span></article>
        <article><strong>{stats?.moods ?? "—"}</strong><span>Mood entries</span></article>
        <article><strong>{stats?.openAlerts ?? "—"}</strong><span>Open alerts</span></article>
      </section>
    </main>
  );
}
