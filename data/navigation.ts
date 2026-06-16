// DEPRECATED: see src/mocks/menus.ts + src/mocks/menuTranslations.ts. Components must call mockRepository.getMenus(locale) instead of importing this. To be removed once the admin CRUD lands.

export interface NavChild {
  label: string;
  path: string;
}

export interface NavItem {
  label: string;
  path: string;
  children?: NavChild[];
}

export const navigation: NavItem[] = [
  {
    label: "About",
    path: "/about",
    children: [
      { label: "About CERINS", path: "/about/about-cerins" },
      { label: "Vision", path: "/about/vision" },
      { label: "Business Ethics and Compliance", path: "/about/business-ethics-and-compliance" },
      { label: "Certification and Accreditations", path: "/about/certification-and-accreditations" },
      { label: "Location", path: "/about/location" },
    ],
  },
  {
    label: "Certification",
    path: "/certification",
    children: [
      { label: "Russia", path: "/certification/russia" },
      { label: "Kazakhstan", path: "/certification/kazakhstan" },
      { label: "Belarus", path: "/certification/belarus" },
      { label: "Uzbekistan", path: "/certification/uzbekistan" },
      { label: "Ukraine", path: "/certification/ukraine" },
      { label: "Turkmenistan", path: "/certification/turkmenistan" },
      { label: "Azerbaijan", path: "/certification/azerbaijan" },
      { label: "Vietnam", path: "/certification/vietnam" },
      { label: "Europe", path: "/certification/europe" },
    ],
  },
  {
    label: "Inspection",
    path: "/inspection",
    children: [
      { label: "Pre-Shipment Inspection", path: "/inspection/pre-shipment-inspection" },
      { label: "India VOC", path: "/inspection/india-voc" },
      { label: "NDT", path: "/inspection/ndt" },
      { label: "General Inspection", path: "/inspection/general-inspection" },
      { label: "Other Services", path: "/inspection/other-services" },
    ],
  },
  {
    label: "Contact",
    path: "/contact",
  },
  {
    label: "News",
    path: "/news",
  },
];
