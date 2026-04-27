import type { SubscriptionEmailData } from '../email.service.js';

export function buildSubscriptionConfirmationHtml(data: SubscriptionEmailData): string {
  const startStr = data.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const renewStr = data.nextRenewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const amountStr = `${data.amount} ${data.currency.toUpperCase()}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1e1e22;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.10));">
            <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);line-height:48px;text-align:center;margin-bottom:16px;">
              <span style="color:white;font-size:20px;font-weight:bold;">✓</span>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Welcome to ${data.planName}!</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#9394a0;">Your subscription is now active, ${data.userName}.</p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:12px;color:#6b6c7a;text-transform:uppercase;letter-spacing:0.5px;">Plan</span><br/>
                  <span style="font-size:15px;color:#ffffff;font-weight:600;">${data.planName}</span>
                </td>
                <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">
                  <span style="font-size:12px;color:#6b6c7a;text-transform:uppercase;letter-spacing:0.5px;">Amount</span><br/>
                  <span style="font-size:15px;color:#ffffff;font-weight:600;">${amountStr}/${data.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <span style="font-size:12px;color:#6b6c7a;text-transform:uppercase;letter-spacing:0.5px;">Start Date</span><br/>
                  <span style="font-size:15px;color:#ffffff;font-weight:600;">${startStr}</span>
                </td>
                <td style="padding:16px 20px;text-align:right;">
                  <span style="font-size:12px;color:#6b6c7a;text-transform:uppercase;letter-spacing:0.5px;">Next Renewal</span><br/>
                  <span style="font-size:15px;color:#ffffff;font-weight:600;">${renewStr}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${data.receiptUrl ? `
        <!-- Receipt Link -->
        <tr>
          <td style="padding:0 32px 24px;text-align:center;">
            <a href="${data.receiptUrl}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">View Receipt / Invoice</a>
          </td>
        </tr>
        ` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b6c7a;line-height:1.6;">
              Need help? Reply to this email or contact us at<br/>
              <a href="mailto:support@focusflow.app" style="color:#6366f1;text-decoration:none;">support@focusflow.app</a>
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#4a4b57;">
              © ${new Date().getFullYear()} FocusFlow — Team Productivity Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
