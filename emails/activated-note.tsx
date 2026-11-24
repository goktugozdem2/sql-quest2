// activated-note — the founder's second ask to the activated non-payers,
// authored as React Email components (2026-11-25).
//
// This file is NEVER shipped to Deno or to the browser. `scripts/build-emails.mjs`
// renders it once, at build time, into a static HTML string and a plain-text
// string with {{slot}} placeholders, and writes them to
// supabase/functions/activated-note/template.generated.ts. The edge function
// fills the slots per recipient (supabase/functions/activated-note/letter.ts),
// so there is no React runtime in the function and none in the app bundle.
//
// What is fixed here (same for every reader): the Pro sentence, the offer
// line, the one CTA, the reply line, the sign-off, the footer. What changes
// per reader lives in letter.ts and arrives through the slots: the name, the
// opener (which carries the solve count), the Skillmap line (the weakest
// skill), the company line, the CTA URL, the unsubscribe URL. The voice rule
// (CLAUDE.md, "Email voice"): never byte-identical bodies — the slots are
// what makes two letters differ.
//
// Design: a letter, not a newsletter. Light DESIGN.md palette (warm paper,
// near-black text), system fonts, no logo, no images. The arcade yellow
// appears once, on the one CTA (DESIGN.md: accent only on primary CTAs).

import * as React from 'react';
import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components';

// The slot names. Each prop defaults to its own {{placeholder}}, which is
// what the build renders; letter.ts fills them. A slot added here must be
// filled there — fillTemplate throws on any {{…}} left over.
export const SLOTS = {
  preview: '{{preview}}',
  name: '{{name}}',
  opener: '{{opener}}',
  skillLine: '{{skillLine}}',
  targetLine: '{{targetLine}}',
  ctaUrl: '{{ctaUrl}}',
  unsubUrl: '{{unsubUrl}}',
} as const;

type Props = { [K in keyof typeof SLOTS]?: string };

// The offer, in one sentence, with NO price in it (2026-10-01). The price a
// reader meets is decided when the modal opens — India sees $9 / $39, the
// rest $29 / $99 — so a number here would be wrong for most of this list.
// What is the same for everyone is the trial (flag `checkoutTrial`).
// tests/activated-note.test.js reads the flag: if the trial is switched off,
// this sentence fails the build until it is rewritten.
export const OFFER_LINE = 'It starts with 7 days free: a card is required, nothing is charged today, and cancelling before day 7 costs nothing.';

const SITE = 'https://sqlquest.app';

const c = {
  paper: '#F6F4EE',
  surface: '#FFFFFF',
  border: '#E0DCD0',
  text: '#15171C',
  muted: '#6B6E78',
  accent: '#FFE34D',
  accentInk: '#0E0F13',
};

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const p = { fontSize: '15px', lineHeight: '1.75', color: c.text, margin: '0 0 16px' };

export default function ActivatedNote(props: Props) {
  const s = { ...SLOTS, ...props };
  return (
    <Html lang="en">
      <Head />
      <Preview>{s.preview}</Preview>
      <Body style={{ backgroundColor: c.paper, fontFamily: font, margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '520px', backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '28px 28px 8px' }}>
          <Text style={p}>{`Hi ${s.name},`}</Text>
          <Text style={p}>{s.opener}</Text>
          <Text style={p}>{`${s.skillLine} ${s.targetLine}`}</Text>
          <Text style={p}>
            {`Pro is the interview run before the interview: the Hard set, the timed mocks, and a tutor that stays with you through the session. ${OFFER_LINE}`}
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={s.ctaUrl}
              style={{ backgroundColor: c.accent, color: c.accentInk, fontWeight: 700, fontSize: '15px', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none' }}
            >
              See what Pro adds →
            </Button>
          </Section>
          <Text style={p}>
            If you are not interviewing, ignore this — everything you have solved stays yours, and so do the lessons and the Coach. And if something stopped you last time, hit reply; it comes straight to me.
          </Text>
          <Text style={p}>
            Göktuğ<br />
            <span style={{ color: c.muted }}>Founder, SQL Quest</span>
          </Text>
        </Container>
        <Container style={{ maxWidth: '520px' }}>
          <Hr style={{ borderColor: c.border, margin: '20px 0 12px' }} />
          <Text style={{ fontSize: '12px', lineHeight: '1.7', color: c.muted, textAlign: 'center', margin: 0 }}>
            SQL Quest — SQL interview practice by company · <Link href={SITE} style={{ color: c.muted }}>sqlquest.app</Link>
            <br />
            <Link href={s.unsubUrl} style={{ color: c.muted }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// React Email's preview convention; never read by the build.
ActivatedNote.PreviewProps = {
  preview: '14 solves in. One question from the person who builds SQL Quest.',
  name: 'maya_k',
  opener: 'You have 14 solves on SQL Quest. That is the point where most people stop, so this one is from me, not from a sequence.',
  skillLine: "Your Skillmap's lowest line right now is Window Functions.",
  targetLine: 'You named Capital One.',
  ctaUrl: `${SITE}/app/?src=activated_note&pro=1&utm_source=email&utm_campaign=activated_note`,
  unsubUrl: '#',
} satisfies Props;
