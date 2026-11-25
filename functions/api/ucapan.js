// Cloudflare Pages Function: /api/ucapan
// Menyimpan dan memuatkan Buku Ucapan & Doa secara automatik ke Cloudflare D1 (binding: DB)

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: false, error: 'Pangkalan data belum disambungkan.' }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, wish, created_at FROM ucapan ORDER BY id DESC LIMIT 200'
    ).all();

    return new Response(JSON.stringify({ ok: true, wishes: results || [] }), {
      status: 200,
      headers: JSON_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Gagal memuatkan ucapan.' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: false, error: 'Pangkalan data belum disambungkan.' }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }

    const raw = await request.text();
    let payload = {};
    try {
      payload = JSON.parse(raw || '{}');
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: 'Format data tidak sah.' }), {
        status: 400,
        headers: JSON_HEADERS
      });
    }

    // Honeypot anti-spam: jika medan tersembunyi 'website' diisi oleh bot, abaikan secara senyap
    if (String(payload.website || '').trim().length > 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
    }

    const name = String(payload.name || '').trim().slice(0, 80);
    const wish = String(payload.wish || '').trim().slice(0, 500);

    if (!name || !wish) {
      return new Response(JSON.stringify({ ok: false, error: 'Sila lengkapkan nama penuh dan ucapan anda.' }), {
        status: 400,
        headers: JSON_HEADERS
      });
    }

    await env.DB.prepare('INSERT INTO ucapan (name, wish) VALUES (?, ?)')
      .bind(name, wish)
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: JSON_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Gagal menyimpan ucapan.' }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
}
