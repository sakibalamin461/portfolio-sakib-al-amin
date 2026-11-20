import { CogIcon } from "@sanity/icons/Cog";
import { InboxIcon } from "@sanity/icons/Inbox";
import { ProjectsIcon } from "@sanity/icons/Projects";
import { StackIcon } from "@sanity/icons/Stack";
import { UserIcon } from "@sanity/icons/User";
import type { StructureResolver } from "sanity/structure";
import { Inbox } from "./components/Inbox";

/*
 * The Studio sidebar, in the order the site reads top to bottom.
 * Singletons (Home & contact, About page) open straight into their one document.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Portfolio")
    .items([
      S.listItem()
        .title("Home & contact")
        .id("siteSettings")
        .icon(CogIcon)
        .child(S.document().schemaType("siteSettings").documentId("siteSettings").title("Home & contact")),
      S.documentTypeListItem("project").title("Projects").icon(ProjectsIcon),
      S.documentTypeListItem("service").title("Services").icon(StackIcon),
      S.listItem()
        .title("About page")
        .id("about")
        .icon(UserIcon)
        .child(S.document().schemaType("about").documentId("about").title("About page")),
      S.divider(),
      S.listItem().title("Inbox").id("inbox").icon(InboxIcon).child(S.component(Inbox).id("inbox-view").title("Inbox")),
    ]);
