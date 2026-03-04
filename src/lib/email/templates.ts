import { buildEmailHtml } from "./index";

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

export function pastClientAnniversary(): { subject: string; html: string } {
  return {
    subject: "Happy home anniversary, {{first_name}}!",
    html: buildEmailHtml(`
      <h2>Happy Anniversary, {{first_name}}! 🎉</h2>
      <p>It's been another year since you closed on your home. We hope you're enjoying every moment of it!</p>
      <p>Did you know your home's value may have changed? I'd be happy to provide a complimentary market analysis.</p>
      <p>Also, if you know anyone looking to buy or sell, I'd love to help them with the same care I provided you.</p>
      <p style="text-align:center;margin-top:24px">
        <a href="{{site_url}}/home-evaluation" class="btn">Get a Free Home Evaluation</a>
      </p>
    `),
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

export function birthdayGreeting(): { subject: string; html: string } {
  return {
    subject: "Happy Birthday, {{first_name}}! 🎂",
    html: buildEmailHtml(`
      <h2>Happy Birthday, {{first_name}}!</h2>
      <p>Wishing you a wonderful day filled with joy and celebration!</p>
      <p>As always, I'm here if you need anything related to real estate — whether it's checking your home's value, exploring new neighborhoods, or just saying hello.</p>
      <p>Cheers,<br><strong>{{agent_name}}</strong></p>
    `),
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
