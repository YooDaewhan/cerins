// DEPRECATED: card data now lives inline in app/[locale]/page.tsx (will move to a dedicated `home_service_cards` table when admin CRUD lands). To be removed once that ships.

export interface Service {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: string;
}

export const services: Service[] = [
  {
    id: "certification",
    title: "Certification",
    description: "EAC, GOST-R, CE marking, and market-specific certifications across Russia, CIS, Europe, and Asia.",
    path: "/certification/russia",
    icon: "certificate",
  },
  {
    id: "inspection",
    title: "Inspection",
    description: "Pre-shipment inspection, NDT, general QC, and India VOC services by certified inspectors worldwide.",
    path: "/inspection/pre-shipment-inspection",
    icon: "search",
  },
  {
    id: "documentation",
    title: "Documentation",
    description: "Preparation and verification of all required commercial, shipping, and regulatory trade documents.",
    path: "/services/documentation",
    icon: "document",
  },
  {
    id: "project-management",
    title: "Project Management & Custom Brokerage",
    description: "End-to-end trade execution combining project coordination with licensed customs clearance services.",
    path: "/services/project-management-custom-brokerage",
    icon: "briefcase",
  },
];
