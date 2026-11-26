import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayout mode="vendor">{children}</WorkspaceLayout>;
}
