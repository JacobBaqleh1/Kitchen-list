// Sends the share-invitation email. Uses Resend's HTTP API when RESEND_API_KEY
// is configured; otherwise it degrades gracefully by logging the link and
// reporting `sent: false` so the caller can still surface the copyable URL in
// the UI (the share works regardless of whether the email goes out).

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function inviteHtml({ ownerName, shareUrl }) {
  const who = ownerName ? `${escapeHtml(ownerName)}` : 'Someone';
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;color:#111827">
    <h2 style="color:#16a34a;margin-bottom:4px">MyKitchenList</h2>
    <p style="font-size:15px;line-height:1.5">
      <strong>${who}</strong> shared their kitchen list with you. You can view
      what's in their fridge, freezer, and pantry — and chat with them in real time.
    </p>
    <p style="margin:24px 0">
      <a href="${shareUrl}"
         style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">
        View the shared list &rarr;
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;line-height:1.5">
      No account needed to view — just open the link. You'll be invited to create
      your own MyKitchenList while you're there.
    </p>
    <p style="font-size:12px;color:#9ca3af;word-break:break-all">${shareUrl}</p>
  </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export async function sendShareInvite({ to, ownerName, shareUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHARE_EMAIL_FROM || 'MyKitchenList <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[email disabled] Share invite for ${to}: ${shareUrl}`);
    return { sent: false, reason: 'email_not_configured' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: ownerName
          ? `${ownerName} shared their kitchen list with you`
          : 'A kitchen list was shared with you',
        html: inviteHtml({ ownerName, shareUrl }),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Resend send failed:', res.status, detail.slice(0, 300));
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (e) {
    console.error('Resend send error:', e.message);
    return { sent: false, reason: 'send_error' };
  }
}
