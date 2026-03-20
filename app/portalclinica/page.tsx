import type { Metadata } from "next";
import { ClinicaPreadmisionDemoAssistant } from "@/components/portalcliente/clinica-preadmision-demo-assistant";

export const metadata: Metadata = {
  title: "Megafyle Health"
};

export default async function PortalClinicaPage() {
  return <ClinicaPreadmisionDemoAssistant />;
}
