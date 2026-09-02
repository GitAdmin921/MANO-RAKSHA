import React, { useState } from "react";
import { requireSupabase } from "../lib/supabase";

export default function AuthPanel({ mode = "login", onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const client = requireSupabase();
      if (mode === "signup") {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name, gender },
          },
        });
        if (signUpError) throw signUpError;
        onAuthenticated?.(data);
      } else {
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onAuthenticated?.(data);
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="auth-panel">
      {mode === "signup" && (
        <>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Gender
            <select value={gender} onChange={(e) => setGender(e.target.value)} required>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Prefer not to say</option>
            </select>
          </label>
        </>
      )}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} type="submit">
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Login"}
      </button>
    </form>
  );
}
