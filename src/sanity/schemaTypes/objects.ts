import { CubeIcon } from "@sanity/icons/Cube";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { ImagesIcon } from "@sanity/icons/Images";
import { PlayIcon } from "@sanity/icons/Play";
import { StackIcon } from "@sanity/icons/Stack";
import { defineArrayMember, defineField, defineType } from "sanity";

export const media = defineType({
  name: "media",
  title: "Media",
  type: "object",
  description: "Add an image, a video, or both — a video plays, and the image is shown while it loads.",
  options: { collapsible: false },
  fields: [
    defineField({
      name: "image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string", title: "Describe the image", description: "For screen readers and Google." })],
    }),
    defineField({ name: "videoFile", title: "Video (upload)", type: "file", options: { accept: "video/*" } }),
    defineField({
      name: "videoUrl",
      title: "Video (link)",
      type: "url",
      description: "Instead of uploading: a direct .mp4 or .m3u8 link (e.g. from Mux or Vimeo Pro).",
    }),
    // Placeholder colour used by the starter content; not something editors need.
    defineField({ name: "swatch", type: "string", hidden: true }),
  ],
});

export const spec = defineType({
  name: "spec",
  title: "Detail",
  type: "object",
  fields: [
    defineField({ name: "label", type: "string", description: "e.g. Runtime", validation: (r) => r.required() }),
    defineField({ name: "value", type: "string", description: "e.g. 01:12", validation: (r) => r.required() }),
  ],
  preview: { select: { title: "label", subtitle: "value" } },
});

export const filmModule = defineType({
  name: "filmModule",
  title: "Film",
  type: "object",
  icon: PlayIcon,
  description: "A full-width video or image.",
  fields: [
    defineField({ name: "media", type: "media", validation: (r) => r.required() }),
    defineField({ name: "caption", type: "string" }),
  ],
  preview: { select: { title: "caption", media: "media.image" }, prepare: ({ title, media }) => ({ title: title || "Film", subtitle: "Film", media }) },
});

export const breakdownModule = defineType({
  name: "breakdownModule",
  title: "3D breakdown",
  type: "object",
  icon: StackIcon,
  description: "One frame with buttons to switch between render stages: wireframe → clay → lighting → final.",
  fields: [
    defineField({ name: "title", type: "string", initialValue: "Breakdown" }),
    defineField({
      name: "passes",
      title: "Stages",
      type: "array",
      description: "In order, first to last. At least two.",
      of: [
        defineArrayMember({
          type: "object",
          name: "pass",
          fields: [
            defineField({ name: "label", type: "string", description: "Button text, e.g. Wireframe", validation: (r) => r.required() }),
            defineField({ name: "meta", title: "Note", type: "string", description: "Small corner label, e.g. 1.2M polys · Houdini" }),
            defineField({ name: "media", type: "media" }),
          ],
          preview: { select: { title: "label", subtitle: "meta", media: "media.image" } },
        }),
      ],
      validation: (r) => r.min(2),
    }),
  ],
  preview: { select: { title: "title" }, prepare: ({ title }) => ({ title: title || "Breakdown", subtitle: "3D breakdown" }) },
});

export const modelModule = defineType({
  name: "modelModule",
  title: "3D model",
  type: "object",
  icon: CubeIcon,
  description: "A real-time model visitors can spin. Upload a .glb.",
  fields: [
    defineField({ name: "title", type: "string", initialValue: "Turntable" }),
    defineField({ name: "model", title: "Model file (.glb)", type: "file", options: { accept: ".glb,.gltf" } }),
    defineField({ name: "caption", type: "string" }),
  ],
  preview: { select: { title: "title" }, prepare: ({ title }) => ({ title: title || "Turntable", subtitle: "3D model" }) },
});

export const styleframesModule = defineType({
  name: "styleframesModule",
  title: "Image gallery",
  type: "object",
  icon: ImagesIcon,
  description: "Styleframes, stills or key art in a grid.",
  fields: [
    defineField({ name: "title", type: "string", initialValue: "Styleframes" }),
    defineField({
      name: "frames",
      title: "Images",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "frame",
          fields: [
            defineField({ name: "media", type: "media" }),
            defineField({ name: "code", title: "Label", type: "string", description: "Small caption, e.g. SF_01" }),
          ],
          preview: { select: { title: "code", media: "media.image" } },
        }),
      ],
    }),
  ],
  preview: { select: { title: "title" }, prepare: ({ title }) => ({ title: title || "Styleframes", subtitle: "Image gallery" }) },
});

export const textModule = defineType({
  name: "textModule",
  title: "Text",
  type: "object",
  icon: DocumentTextIcon,
  description: "A heading and a paragraph.",
  fields: [
    defineField({ name: "heading", type: "string" }),
    defineField({ name: "body", title: "Text", type: "text", rows: 5, validation: (r) => r.required() }),
  ],
  preview: { select: { title: "heading", subtitle: "body" }, prepare: ({ title, subtitle }) => ({ title: title || "Text", subtitle }) },
});
