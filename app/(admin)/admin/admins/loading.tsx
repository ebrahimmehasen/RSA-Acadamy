import { PageSkeleton } from "@/components/skeletons/PageSkeleton";

export default function Loading() {
  return <PageSkeleton variant="list" withForm tableCols={3} />;
}
