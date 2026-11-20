import { CaseIcon } from "@sanity/icons/Case";
import { CogIcon } from "@sanity/icons/Cog";
import { EarthGlobeIcon } from "@sanity/icons/EarthGlobe";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { HomeIcon } from "@sanity/icons/Home";
import { PlayIcon } from "@sanity/icons/Play";
import { ProjectsIcon } from "@sanity/icons/Projects";
import { SearchIcon } from "@sanity/icons/Search";
import { StackIcon } from "@sanity/icons/Stack";
import { UserIcon } from "@sanity/icons/User";
import { defineArrayMember, defineField, defineType } from "sanity";

/*
 * Field NAMES are what the site reads and must not change (existing content
 * is stored under them). Titles, groups, order and descriptions are free to
 * change — they're only how the Studio presents things.
 * Every description says where on the site the field shows up.
 */

const DISCIPLINES = [
  { title: "Motion", value: "motion" },
  { title: "3D", value: "3d" },
  { title: "Graphic", value: "graphic" },
];

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Home & contact",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "home", title: "Home page", icon: HomeIcon, default: true },
    { name: "you", title: "Name & role", icon: UserIcon },
    { name: "contact", title: "Contact & booking", icon: EnvelopeIcon },
    { name: "showreel", title: "Showreel", icon: PlayIcon },
    { name: "seo", title: "Google & sharing", icon: SearchIcon },
  ],
  fieldsets: [
    { name: "clock", title: "Live clock (top bar)", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    // ── Home page ────────────────────────────────────────────
    defineField({
      name: "heroLines",
      title: "Big name lines",
      type: "array",
      group: "home",
      of: [{ type: "string" }],
      description: "The three huge lines on the first screen. E.g. Sakib / Al-Amin / Designer.",
      validation: (r) => r.length(3).error("Use exactly three lines."),
    }),
    defineField({
      name: "heroPortrait",
      title: "Portrait",
      type: "media",
      group: "home",
      description: "Small portrait, top-right of the first screen.",
    }),
    defineField({
      name: "heroFacts",
      title: "Short facts",
      type: "array",
      group: "home",
      of: [{ type: "string" }],
      description: "2–4 short lines, bottom-left of the first screen. E.g. “Senior 3D Designer”, “Currently at …”.",
      validation: (r) => r.max(4),
    }),
    defineField({
      name: "statement",
      title: "Statement",
      type: "text",
      rows: 2,
      group: "home",
      description: "One sentence in the panel under the work strip, after the scroll.",
    }),
    defineField({
      name: "clients",
      title: "Brand logos",
      type: "array",
      group: "home",
      description: "Scroll past next to the statement. Logo + name.",
      of: [
        defineArrayMember({
          type: "object",
          name: "clientMark",
          icon: CaseIcon,
          fields: [
            defineField({ name: "name", type: "string", validation: (r) => r.required() }),
            defineField({ name: "logo", type: "image", description: "Works best as a simple, single-colour mark." }),
          ],
          preview: { select: { title: "name", media: "logo" } },
        }),
      ],
    }),

    // ── Name & role ──────────────────────────────────────────
    defineField({
      name: "name",
      title: "Full name",
      type: "string",
      group: "you",
      description: "Top-left of the top bar, page titles and Google results.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      group: "you",
      initialValue: "Motion · 3D · Graphic designer",
      description: "Next to your name in the top bar.",
    }),
    defineField({
      name: "monogram",
      title: "Initials",
      type: "string",
      group: "you",
      description: "2–3 letters in the black square, bottom-left.",
      validation: (r) => r.max(3),
    }),

    // ── Contact & booking ───────────────────────────────────
    defineField({ name: "email", title: "Email", type: "string", group: "contact", description: "Menu and Enquire page." }),
    defineField({
      name: "nextAvailability",
      title: "Open for freelance from",
      type: "date",
      group: "contact",
      description: "Shown in the top bar and on the first screen. Leave empty to hide.",
    }),
    defineField({
      name: "bookingUrl",
      title: "Book a call link",
      type: "url",
      group: "contact",
      description: "Your Cal.com or Calendly page. Powers every “Book a call” button.",
    }),
    defineField({
      name: "bookingAvatar",
      title: "Book a call photo",
      type: "image",
      group: "contact",
      description: "Tiny photo inside the Book a call button, top-right.",
    }),
    defineField({
      name: "engagementFrom",
      title: "Freelance projects from",
      type: "string",
      group: "contact",
      description: "Starting price on the Services page, e.g. $25,000. Leave empty to hide.",
    }),
    defineField({
      name: "socials",
      title: "Social links",
      type: "array",
      group: "contact",
      description: "Listed in the menu.",
      of: [
        defineArrayMember({
          type: "object",
          name: "social",
          icon: EarthGlobeIcon,
          fields: [
            defineField({ name: "label", type: "string", description: "e.g. Instagram" }),
            defineField({ name: "url", type: "url" }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        }),
      ],
    }),
    defineField({ name: "city", title: "City", type: "string", group: "contact", fieldset: "clock", description: "Shown on the About page." }),
    defineField({
      name: "timezone",
      title: "Time zone",
      type: "string",
      group: "contact",
      fieldset: "clock",
      initialValue: "Asia/Dhaka",
      description: "For the live clock, e.g. Asia/Dhaka or Europe/London.",
    }),

    // ── Showreel ─────────────────────────────────────────────
    defineField({
      name: "showreel",
      title: "Showreel film",
      type: "media",
      group: "showreel",
      description: "Plays full screen from the “Play film” button, top-right.",
    }),
    defineField({
      name: "showreelLabel",
      title: "Button text",
      type: "string",
      group: "showreel",
      initialValue: "Showreel 2026",
    }),

    // ── Google & sharing ─────────────────────────────────────
    defineField({
      name: "seoDescription",
      title: "Description",
      type: "text",
      rows: 3,
      group: "seo",
      description: "The line under your name in Google, and in link previews. ~150 characters.",
      validation: (r) => r.max(170).warning("Google cuts off after about 160 characters."),
    }),
  ],
  preview: { prepare: () => ({ title: "Home & contact" }) },
});

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ProjectsIcon,
  groups: [
    { name: "card", title: "1 · Card", default: true },
    { name: "page", title: "2 · Case study page" },
  ],
  fieldsets: [
    { name: "credits", title: "Credits", options: { columns: 2 } },
    { name: "listing", title: "Where it's listed", options: { columns: 2 } },
  ],
  orderings: [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  fields: [
    // ── 1 · Card: what shows on the home strip and the Work grid ──
    defineField({ name: "title", type: "string", group: "card", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Page address",
      type: "slug",
      group: "card",
      options: { source: "title" },
      description: "Click Generate. Becomes /work/your-project.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "cover",
      title: "Cover",
      type: "media",
      group: "card",
      description: "The thumbnail. A short silent loop (or a still) — keep videos under ~4 MB.",
    }),
    defineField({
      name: "disciplines",
      type: "array",
      group: "card",
      of: [{ type: "string" }],
      options: { list: DISCIPLINES, layout: "grid" },
      description: "Used by the Work page filters.",
      validation: (r) => r.min(1),
    }),
    defineField({ name: "format", type: "string", group: "card", description: "e.g. 3D Film, Identity, Title sequence." }),
    defineField({ name: "code", title: "Card code", type: "string", group: "card", fieldset: "listing", description: "e.g. WK_001" }),
    defineField({ name: "order", title: "Order", type: "number", group: "card", fieldset: "listing", description: "Lower shows first." }),
    defineField({
      name: "featured",
      title: "Show on home page",
      type: "boolean",
      group: "card",
      fieldset: "listing",
      initialValue: true,
    }),
    defineField({ name: "client", type: "string", group: "card", fieldset: "credits" }),
    defineField({ name: "year", type: "string", group: "card", fieldset: "credits" }),
    defineField({ name: "tools", type: "array", group: "card", fieldset: "credits", of: [{ type: "string" }], options: { layout: "tags" } }),

    // ── 2 · Case study page ─────────────────────────────────
    defineField({ name: "headline", type: "string", group: "page", description: "Big title on black bars over the film." }),
    defineField({ name: "hero", title: "Top film", type: "media", group: "page", description: "Full-width film at the top. Falls back to the cover." }),
    defineField({ name: "summary", title: "Intro", type: "text", rows: 3, group: "page", description: "One or two sentences under the film." }),
    defineField({ name: "roles", title: "Your role", type: "array", group: "page", fieldset: "credits", of: [{ type: "string" }], options: { layout: "tags" } }),
    defineField({ name: "agency", type: "string", group: "page", fieldset: "credits" }),
    defineField({ name: "recognition", title: "Award", type: "string", group: "page", fieldset: "credits" }),
    defineField({ name: "specs", title: "More details", type: "array", group: "page", of: [{ type: "spec" }], description: "Extra rows for the details list, e.g. Runtime / 01:12." }),
    defineField({
      name: "modules",
      title: "Sections",
      type: "array",
      group: "page",
      description: "Stack the case study, top to bottom. Add, drag to reorder.",
      of: [
        { type: "filmModule" },
        { type: "breakdownModule" },
        { type: "modelModule" },
        { type: "styleframesModule" },
        { type: "textModule" },
      ],
    }),
  ],
  preview: {
    select: { title: "title", code: "code", format: "format", media: "cover.image" },
    prepare: ({ title, code, format, media }) => ({ title, subtitle: [code, format].filter(Boolean).join(" · "), media }),
  },
});

export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  icon: StackIcon,
  description: "One step of the diagram on the Services page.",
  fields: [
    defineField({ name: "title", type: "string", description: "e.g. Brand, Motion, 3D, Launch.", validation: (r) => r.required() }),
    defineField({ name: "order", type: "number", description: "1 is drawn at the top, the highest at the bottom, the rest in between." }),
    defineField({ name: "deliverables", title: "What's included", type: "array", of: [{ type: "string" }] }),
  ],
  orderings: [{ title: "Order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", order: "order" },
    prepare: ({ title, order }) => ({ title, subtitle: order != null ? `Step ${order}` : undefined }),
  },
});

export const about = defineType({
  name: "about",
  title: "About page",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({ name: "headline", type: "string", description: "Big line on black bars at the top." }),
    defineField({ name: "portrait", type: "media" }),
    defineField({ name: "bio", type: "text", rows: 6 }),
    defineField({
      name: "experience",
      type: "array",
      description: "Where you've worked, newest first.",
      of: [
        defineArrayMember({
          type: "object",
          name: "position",
          icon: CaseIcon,
          fields: [
            defineField({ name: "company", type: "string", validation: (r) => r.required() }),
            defineField({ name: "role", type: "string" }),
            defineField({ name: "years", type: "string", description: "e.g. 2022 — Now" }),
          ],
          preview: { select: { title: "company", subtitle: "role" } },
        }),
      ],
    }),
    defineField({ name: "clients", title: "Brands worked on", type: "array", of: [{ type: "string" }], options: { layout: "tags" } }),
    defineField({
      name: "awards",
      title: "Recognition",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "award",
          fields: [defineField({ name: "title", type: "string" }), defineField({ name: "year", type: "string" })],
          preview: { select: { title: "title", subtitle: "year" } },
        }),
      ],
    }),
    defineField({ name: "tools", type: "array", of: [{ type: "string" }], options: { layout: "tags" } }),
  ],
  preview: { prepare: () => ({ title: "About page" }) },
});

export const ENQUIRY_STATUSES = [
  { title: "New", value: "new" },
  { title: "Read", value: "read" },
  { title: "Archived", value: "archived" },
];

export const enquiry = defineType({
  name: "enquiry",
  title: "Message",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: "status", type: "string", options: { list: ENQUIRY_STATUSES, layout: "radio", direction: "horizontal" }, initialValue: "new" }),
    defineField({ name: "name", type: "string", readOnly: true }),
    defineField({ name: "email", type: "string", readOnly: true }),
    defineField({ name: "company", type: "string", readOnly: true }),
    defineField({ name: "discipline", title: "Project type", type: "string", readOnly: true }),
    defineField({ name: "budget", type: "string", readOnly: true }),
    defineField({ name: "message", type: "text", readOnly: true }),
    defineField({ name: "receivedAt", title: "Received", type: "datetime", readOnly: true }),
  ],
  orderings: [{ title: "Newest", name: "newest", by: [{ field: "receivedAt", direction: "desc" }] }],
  preview: {
    select: { title: "name", subtitle: "message", status: "status" },
    prepare: ({ title, subtitle, status }) => ({ title: `${status === "read" || status === "archived" ? "" : "● "}${title}`, subtitle }),
  },
});
