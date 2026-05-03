export interface WhiteboardInvitationEmailData {
  to: string;
  inviterName: string;
  whiteboardName: string;
  role: 'VIEWER' | 'EDITOR';
  acceptUrl: string;
}

export function buildWhiteboardInvitationHtml(data: WhiteboardInvitationEmailData): string {
  const roleLabel = data.role === 'EDITOR' ? 'edit' : 'view';
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1e1e22;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.10));">
            <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);line-height:48px;text-align:center;margin-bottom:16px;">
              <span style="color:white;font-size:22px;">✦</span>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">You've been invited to a whiteboard</h1>
            <p style="margin:12px 0 0;font-size:14px;color:#9394a0;line-height:1.5;">
              <strong style="color:#ffffff;">${escapeHtml(data.inviterName)}</strong> invited you to ${roleLabel}
              <strong style="color:#ffffff;">${escapeHtml(data.whiteboardName)}</strong> on FocusFlow.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;text-align:center;">
            <a href="${data.acceptUrl}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;font-size:14px;font-weight:600;text-decoration:none;">
              Open whiteboard
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#6b6c78;">
              Or paste this link into your browser:<br/>
              <span style="color:#9394a0;word-break:break-all;">${data.acceptUrl}</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
