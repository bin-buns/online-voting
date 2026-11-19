# EmailJS and automatic election emails

The project uses one EmailJS template for login codes, temporary student credentials, admin notices, and election emails.

## EmailJS template

Set the template fields to:

| Field | Value |
| --- | --- |
| To Email | `{{to_email}}` |
| Subject | `{{subject}}` |
| From Name | `Smart Voting System` |

Use this HTML in the EmailJS Code editor:

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0d6b34;margin:0 0 16px;">{{app_name}}</h2>
  <div style="color:#1a2e1f;line-height:1.6;">{{{content_html}}}</div>
  <p style="color:#64748b;font-size:12px;margin-top:28px;">
    You received this email because you have an account on the {{app_name}}.
  </p>
</div>
```

The triple braces around `content_html` are intentional: the server escapes user text before building the HTML.

## Environment

Set these server-side in `.env.local` and your hosting provider:

```
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_PUBLIC_KEY=...
EMAILJS_PRIVATE_KEY=...
EMAILJS_TEMPLATE_ID=template_xxxxxxx
CRON_SECRET=use-a-long-random-secret
```

The same `EMAILJS_TEMPLATE_ID` is used for OTP and notification emails. Enable EmailJS's non-browser API setting. Keep the private key and `CRON_SECRET` secret.

When an administrator creates or resets a student account, the app emails the generated temporary password through this same template. Each credential email uses one EmailJS send request. The admin screen also reports whether delivery succeeded and keeps the generated password visible once as a fallback if sending fails.

## Election emails

After an admin creates or saves an active election schedule, the app sends a schedule announcement to student accounts (voters and candidates). A scheduled job sends:

- A reminder 24 hours before voting starts.
- A “voting is open” message at the start time.
- A “voting has ended” message at the end time.
- The official vote totals when `results_visible_at` is reached.

To enable timed messages, run `supabase/election-reminders.sql` once in Supabase → SQL Editor, set `CRON_SECRET`, then call the endpoint every 15 minutes from a scheduler:

```
https://YOUR-SITE/api/cron/election-reminders?key=YOUR_CRON_SECRET
```

The schedule announcement is sent directly after saving; the cron handles the timed notices. If its call is delayed, timed emails are sent on the next run. Changing the title or schedule re-arms notices for the updated election.

A private test request sends one chosen event only to the address in `test`:

```
https://YOUR-SITE/api/cron/election-reminders?key=YOUR_CRON_SECRET&test=you@example.com&type=results
```

Use `type=scheduled`, `day_before`, `start`, `end`, or `results`. A dry run can count student recipients without sending:

```
https://YOUR-SITE/api/cron/election-reminders?key=YOUR_CRON_SECRET&dry=1
```

## Quota

EmailJS's current Free plan includes 200 requests per month. Each recipient of each message uses one request. Five election emails to 50 students would use 250 requests, before OTPs and other notifications. Your connected mail provider may also impose its own sending limits. [EmailJS pricing](https://www.emailjs.com/pricing/)
