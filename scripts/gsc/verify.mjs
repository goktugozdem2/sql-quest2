// Step 1 of the GSC pipeline: can the service account see the property?
// Calls webmasters.sites.list and prints whether sc-domain:sqlquest.app is
// in the list and at what permission level. Exit 0 only when it is.
//
//   GSC_SA_KEY="$(cat key.json)" node scripts/gsc/verify.mjs
//
// A 403 here is the API not being enabled on the project, or the account
// not being added to the property — not the key (a bad key fails earlier,
// at the token exchange).

import { getAccessToken, googleFetch, GSC_PROPERTY } from './auth.mjs';

const { token, clientEmail } = await getAccessToken();
console.log(`token: ok (${clientEmail})`);
const data = await googleFetch('https://www.googleapis.com/webmasters/v3/sites', { token });
const sites = data.siteEntry || [];
console.log(`sites visible to the service account: ${sites.length}`);
for (const s of sites) console.log(`  ${s.siteUrl}  ${s.permissionLevel}`);
const ours = sites.find(s => s.siteUrl === GSC_PROPERTY);
if (!ours) {
  console.error(`MISSING: ${GSC_PROPERTY} is not in the list — add ${clientEmail} to the property in Search Console.`);
  process.exit(1);
}
console.log(`OK: ${GSC_PROPERTY} permissionLevel=${ours.permissionLevel}`);
