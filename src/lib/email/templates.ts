import {
  buildEmailHtml,
  escapeHtml,
  escapeHttpUrl,
  sanitizeEmailSubject,
} from "./index";

export function adminUserWelcomeEmail(firstName: string, setupUrl: string): { subject: string; html: string } {
  return {
    subject: "Set up your Homewise account",
    html: buildEmailHtml(`
      <h2>Welcome, ${escapeHtml(firstName)}!</h2>
      <p>Your administrator has created a Homewise account for you. To get started, please set your password by clicking the button below.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="${escapeHttpUrl(setupUrl)}" class="btn">Set Your Password</a>
      </p>
      <p style="margin-top:24px;font-size:13px;color:#64748b">This link expires in 24 hours. If it has expired, ask your administrator to resend the invitation.</p>
    `, "Set up your Homewise account", false),
  };
}

export function passwordResetEmail(firstName: string, resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your Homewise password",
    html: buildEmailHtml(`
      <h2>Hi ${escapeHtml(firstName)},</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="${escapeHttpUrl(resetUrl)}" class="btn">Reset Password</a>
      </p>
      <p style="margin-top:24px;font-size:13px;color:#64748b">This link expires in 24 hours. If you didn&apos;t request this, you can safely ignore this email.</p>
    `, "Reset your Homewise password", false),
  };
}

export function newBuyerWelcome(): { subject: string; html: string } {
  return {
    subject: "Welcome to Homewise FL, {{first_name}}!",
    html: buildEmailHtml(`
      <h2>Welcome, {{first_name}}!</h2>
      <p>Thank you for starting your home search with Homewise FL. We're here to help you find the perfect home.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Set up <strong>saved searches</strong> to get notified when new listings match your criteria</li>
        <li>Browse our <a href="{{site_url}}/search">property search</a> to explore neighborhoods</li>
        <li>Check out our <a href="{{site_url}}/learn/buying">Buying 101 guide</a></li>
      </ul>
      <p>Your dedicated agent, <strong>{{agent_name}}</strong>, is available to answer any questions.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/search" class="btn">Start Searching</a>
      </p>
    `, "Welcome to your home search journey"),
  };
}

export function activeBuyerCheckIn(): { subject: string; html: string } {
  return {
    subject: "How's your home search going, {{first_name}}?",
    html: buildEmailHtml(`
      <h2>Hi {{first_name}},</h2>
      <p>Just checking in on your home search! Have you seen any properties that caught your eye?</p>
      <p>I noticed you've been looking at homes in <strong>{{area_of_interest}}</strong>. Here are a few things to keep in mind:</p>
      <ul>
        <li>The market in {{area_of_interest}} is currently {{market_conditions}}</li>
        <li>Average days on market: {{avg_dom}} days</li>
      </ul>
      <p>Ready to schedule some showings? Just reply to this email or click below.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/search" class="btn">View New Listings</a>
      </p>
    `),
  };
}

export function sellerLeadFollowUp(): { subject: string; html: string } {
  return {
    subject: "Your home evaluation is ready, {{first_name}}",
    html: buildEmailHtml(`
      <h2>Hi {{first_name}},</h2>
      <p>Thank you for requesting a home evaluation for <strong>{{property_address}}</strong>.</p>
      <p>Based on recent comparable sales in your area, I've prepared some insights about your home's current market value.</p>
      <p>I'd love to discuss this with you in more detail. Would you be available for a quick call this week?</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/contact" class="btn">Schedule a Call</a>
      </p>
    `, "Your home evaluation results"),
  };
}

export function pastClientAnniversary(): {
  subject: string;
  body: string;
  html: string;
} {
  const body = `
      <h2>Happy Anniversary, {{first_name}}! 🎉</h2>
      <p>It's been another year since you closed on your home. We hope you're enjoying every moment of it!</p>
      <p>Did you know your home's value may have changed? I'd be happy to provide a complimentary market analysis.</p>
      <p>Also, if you know anyone looking to buy or sell, I'd love to help them with the same care I provided you.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/home-evaluation" class="btn">Get a Free Home Evaluation</a>
      </p>
    `;
  return {
    subject: "Happy home anniversary, {{first_name}}!",
    body,
    html: buildEmailHtml(body),
  };
}

export function openHouseFollowUp(): { subject: string; html: string } {
  return {
    subject: "Thanks for visiting {{property_address}}!",
    html: buildEmailHtml(`
      <h2>Hi {{first_name}},</h2>
      <p>Thank you for attending the open house at <strong>{{property_address}}</strong>. I hope you enjoyed your visit!</p>
      <p>Here are a few similar properties you might also like:</p>
      <p>{{similar_listings}}</p>
      <p>Let me know if you'd like to schedule a private showing of any of these homes.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/search" class="btn">Browse More Homes</a>
      </p>
    `),
  };
}

export function birthdayGreeting(): {
  subject: string;
  body: string;
  html: string;
} {
  const body = `
      <h2>Happy Birthday, {{first_name}}!</h2>
      <p>Wishing you a wonderful day filled with joy and celebration!</p>
      <p>As always, I'm here if you need anything related to real estate — whether it's checking your home's value, exploring new neighborhoods, or just saying hello.</p>
      <p>Cheers,<br><strong>{{agent_name}}</strong></p>
    `;
  return {
    subject: "Happy Birthday, {{first_name}}! 🎂",
    body,
    html: buildEmailHtml(body),
  };
}

export function listingAlertEmail(): { subject: string; html: string } {
  return {
    subject: "{{count}} new listings match your search",
    html: buildEmailHtml(`
      <h2>New Listings for You!</h2>
      <p>Hi {{first_name}}, we found <strong>{{count}} new listings</strong> matching your saved search.</p>
      {{listings_html}}
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/search" class="btn">View All Results</a>
      </p>
    `, "{{count}} new homes match your criteria"),
  };
}

export function priceChangeAlertEmail(): { subject: string; html: string } {
  return {
    subject: "Price change on a listing you're watching",
    html: buildEmailHtml(`
      <h2>Price Update</h2>
      <p>Hi {{first_name}}, a listing you're interested in has a price change:</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0"><strong>{{property_address}}</strong></p>
        <p style="margin:4px 0">Previous: <span style="text-decoration:line-through">{{old_price}}</span></p>
        <p style="margin:4px 0">New: <strong style="color:#16a34a">{{new_price}}</strong></p>
      </div>
      <p style="text-align:center;margin-top:24px">
        <a href="{{listing_url}}" class="btn">View Listing</a>
      </p>
    `),
  };
}

interface AgentApplicationSummary {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
  mlsAgentId?: string | null;
  message?: string | null;
}

export function agentApplicationReceivedEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: "We received your HomeWise Agent application",
    html: buildEmailHtml(`
      <h2>Thanks, ${escapeHtml(firstName)}!</h2>
      <p>We&apos;ve received your application to become a HomeWise Agent. Our corporate office reviews every application personally.</p>
      <p>If you&apos;re approved, we&apos;ll email you a secure registration link to set up your agent account. Membership is always free for HomeWise Agents.</p>
      <p style="margin-top:24px;font-size:13px;color:#64748b">No action is needed right now — we&apos;ll be in touch soon.</p>
    `, "Your HomeWise Agent application was received", false),
  };
}

export function agentApplicationAdminNotificationEmail(
  app: AgentApplicationSummary,
  reviewUrl: string,
): { subject: string; html: string } {
  const row = (label: string, value?: string | null) =>
    value ? `<p style="margin:4px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` : "";
  return {
    subject: sanitizeEmailSubject(`New agent application — ${app.firstName} ${app.lastName}`),
    html: buildEmailHtml(`
      <h2>New Agent Application</h2>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0">
        ${row("Name", `${app.firstName} ${app.lastName}`)}
        ${row("Email", app.email)}
        ${row("Phone", app.phone)}
        ${row("License #", app.licenseNumber)}
        ${row("MLS Agent ID", app.mlsAgentId)}
        ${row("Message", app.message)}
      </div>
      <p style="text-align:center;margin-top:24px">
        <a href="${escapeHttpUrl(reviewUrl)}" class="btn">Review Application</a>
      </p>
    `, "A prospective agent has applied", false),
  };
}

export function agentApplicationApprovedEmail(firstName: string, inviteUrl: string): { subject: string; html: string } {
  return {
    subject: "You're approved — welcome to HomeWise",
    html: buildEmailHtml(`
      <h2>Congratulations, ${escapeHtml(firstName)}!</h2>
      <p>Your application has been approved by the HomeWise corporate office. You&apos;re ready to set up your agent account.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="${escapeHttpUrl(inviteUrl)}" class="btn">Set Up Your Agent Account</a>
      </p>
      <p style="margin-top:24px;font-size:13px;color:#64748b">This invitation link expires in 7 days. If it expires, reply to this email and we&apos;ll send a new one.</p>
    `, "Your HomeWise Agent application was approved", false),
  };
}

export function agentApplicationRejectedEmail(firstName: string, notes?: string | null): { subject: string; html: string } {
  return {
    subject: "Update on your HomeWise Agent application",
    html: buildEmailHtml(`
      <h2>Hi ${escapeHtml(firstName)},</h2>
      <p>Thank you for your interest in joining HomeWise. After review, we&apos;re not able to move forward with your application at this time.</p>
      ${notes ? `<div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:0">${escapeHtml(notes)}</p></div>` : ""}
      <p>We appreciate the time you took to apply and wish you the best.</p>
    `, "An update on your HomeWise Agent application", false),
  };
}
