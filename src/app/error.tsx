"use client";
import RouteFailure from "@/components/errors/RouteFailure";
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const reference =
    error instanceof Error && "digest" in error
      ? String(error.digest)
      : undefined;
  return <RouteFailure reset={retry} reference={reference} />;
}
