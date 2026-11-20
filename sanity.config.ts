"use client";

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schemaTypes, singletonTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";

export default defineConfig({
  basePath: "/studio",
  title: "Portfolio",
  projectId: projectId || "missing-project-id",
  dataset,
  schema: {
    types: schemaTypes,
    // Singletons can't be created from "New document" or duplicated, and
    // messages only ever come from the website's contact form.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType) && schemaType !== "enquiry"),
  },
  document: {
    actions: (actions, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? actions.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action))
        : actions,
  },
  // Vision (the GROQ query console) is a developer tool: local development only.
  plugins: [structureTool({ structure }), ...(process.env.NODE_ENV === "development" ? [visionTool({ defaultApiVersion: apiVersion })] : [])],
});
