// ─── app/api/auth/strava/route.js ───────────────────────────
// Paso 1: redirigir al usuario a la pantalla de autorización de Strava

import { NextResponse } from "next/server";

export function GET() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all",
    approval_prompt: "auto",
  });
  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params}`
  );
}


// ─── app/api/auth/strava/callback/route.js ──────────────────
// Paso 2: Strava redirige acá con el ?code=... → intercambiamos por tokens

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/strava";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=strava_denied`
    );
  }

  try {
    const data = await exchangeCode(code);
    const cookieStore = await cookies();

    // Guardamos todo en una cookie httpOnly — seguro para uso personal
    cookieStore.set("strava_session", JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,       // Unix timestamp en segundos
      athlete_id: data.athlete.id,
      athlete_name: data.athlete.firstname,
      athlete_photo: data.athlete.profile_medium,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60, // 60 días
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`
    );
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=oauth_failed`
    );
  }
}


// ─── app/api/auth/logout/route.js ───────────────────────────
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("strava_session");
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/`
  );
}


// ─── app/api/strava/activities/route.js ─────────────────────
// Devuelve las últimas actividades del atleta, con refresh automático

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stravaGet, doRefreshToken, cleanActivity } from "@/lib/strava";

async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("strava_session")?.value;
  if (!raw) return null;
  return JSON.parse(raw);
}

async function saveSession(cookieStore, session) {
  cookieStore.set("strava_session", JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
    sameSite: "lax",
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const n = Math.min(Number(searchParams.get("n") ?? "20"), 50);

  const cookieStore = await cookies();
  let session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Refrescar el token si expiró o expira en los próximos 5 min
  if (Date.now() / 1000 > session.expires_at - 300) {
    try {
      const fresh = await doRefreshToken(session.refresh_token);
      session = {
        ...session,
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: fresh.expires_at,
      };
      await saveSession(cookieStore, session);
    } catch (err) {
      return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
    }
  }

  try {
    const raw = await stravaGet(
      `/athlete/activities?per_page=${n}`,
      session.access_token
    );
    return NextResponse.json(raw.map(cleanActivity));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// ─── app/api/strava/athlete/route.js ────────────────────────
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stravaGet } from "@/lib/strava";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("strava_session")?.value;
  if (!raw) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = JSON.parse(raw);
  try {
    const athlete = await stravaGet("/athlete", session.access_token);
    return NextResponse.json({
      id: athlete.id,
      name: `${athlete.firstname} ${athlete.lastname}`,
      photo: athlete.profile_medium,
      city: athlete.city,
      country: athlete.country,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
