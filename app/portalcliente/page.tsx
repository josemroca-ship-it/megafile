import type { Metadata } from "next";
import { ComexDemoAssistant } from "@/components/portalcliente/comex-demo-assistant";

export const metadata: Metadata = {
  title: "Megafyle COMEX"
};

export default async function PortalClientePage() {
  return <ComexDemoAssistant />;
}
