import { createFileRoute } from "@tanstack/react-router";
import { DocumentReader } from "@/features/documents/document-reader";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  component: function DocumentReaderRoute() {
    const { id } = Route.useParams();
    return <DocumentReader id={id} />;
  },
});
