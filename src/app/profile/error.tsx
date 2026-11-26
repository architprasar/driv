"use client";
import { LoadState } from "@/components/workspace/WorkspaceUI";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <LoadState
      loading={false}
      error="This page could not be loaded. Please try again."
      retry={retry}
    />
  );
}
