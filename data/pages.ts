// DEPRECATED: see src/mocks/pages.ts + src/mocks/pageTranslations.ts. Components must call mockRepository.getPageWithTranslation(slug, locale) instead of importing this. To be removed once the admin CRUD lands.

export interface ContentBlock {
  heading: string;
  body: string;
}

export interface PageData {
  slug: string;
  category: "about" | "certification" | "inspection" | "services";
  title: string;
  subtitle?: string;
  heroImage?: string;
  content: ContentBlock[];
}

export const pages: PageData[] = [
  // ─── About ───────────────────────────────────────────────────────────────
  {
    slug: "about-cerins",
    category: "about",
    title: "About CERINS",
    subtitle: "Who We Are",
    heroImage: "/images/hero-about.jpg",
    content: [
      {
        heading: "Company Overview",
        body: "CERINS is a global certification and inspection consulting firm headquartered in Seoul, Korea. We specialize in helping manufacturers and exporters navigate international regulatory requirements with confidence and efficiency.",
      },
      {
        heading: "Our Expertise",
        body: "With more than 15 years of hands-on experience, our team provides end-to-end solutions covering certification, pre-shipment inspection, documentation, and customs brokerage across key global markets including Russia, the CIS region, Europe, and Southeast Asia.",
      },
      {
        heading: "Why Choose CERINS",
        body: "We combine deep technical knowledge with a commitment to client success. Our multilingual team works closely with accredited testing labs and government bodies to deliver results that are accurate, timely, and fully compliant.",
      },
    ],
  },
  {
    slug: "vision",
    category: "about",
    title: "Vision",
    subtitle: "Our Direction",
    heroImage: "/images/hero-vision.jpg",
    content: [
      {
        heading: "Our Vision",
        body: "To be the most trusted bridge between global markets — enabling companies to expand internationally without friction, risk, or compliance uncertainty.",
      },
      {
        heading: "Our Mission",
        body: "We exist to simplify the complexity of international trade compliance. Through expert guidance, transparent processes, and reliable partnerships, we help our clients reach new markets faster and with greater confidence.",
      },
      {
        heading: "Core Values",
        body: "Integrity, Expertise, and Partnership. Every decision we make is grounded in ethical practice, deep domain knowledge, and a genuine commitment to our clients' long-term success.",
      },
    ],
  },
  {
    slug: "business-ethics-and-compliance",
    category: "about",
    title: "Business Ethics and Compliance",
    subtitle: "Our Standards",
    heroImage: "/images/hero-ethics.jpg",
    content: [
      {
        heading: "Commitment to Integrity",
        body: "CERINS holds itself to the highest standards of professional conduct. We operate with full transparency and comply with all applicable local and international regulations in every jurisdiction we serve.",
      },
      {
        heading: "Anti-Corruption Policy",
        body: "We maintain a zero-tolerance policy toward bribery, corruption, and any form of unethical facilitation. All CERINS employees and partners are required to adhere to our Code of Conduct.",
      },
      {
        heading: "Data Protection",
        body: "Client data is treated with strict confidentiality. We implement robust data governance practices to ensure that all sensitive commercial and technical information is protected at every stage of engagement.",
      },
    ],
  },
  {
    slug: "certification-and-accreditations",
    category: "about",
    title: "Certification and Accreditations",
    subtitle: "Our Credentials",
    heroImage: "/images/hero-accreditations.jpg",
    content: [
      {
        heading: "Recognized Accreditations",
        body: "CERINS works exclusively with accredited certification bodies and testing laboratories recognized by the regulatory authorities of target markets. Our partnerships ensure that every certificate we facilitate carries full legal validity.",
      },
      {
        heading: "Partner Bodies",
        body: "Our network includes ISO/IEC 17065 accredited conformity assessment bodies, Rosstandart-approved organizations in Russia, and CE notified bodies in Europe, among others.",
      },
      {
        heading: "Continuous Improvement",
        body: "We invest continuously in staff training, regulatory monitoring, and process auditing to ensure our services remain aligned with the latest international standards.",
      },
    ],
  },
  {
    slug: "location",
    category: "about",
    title: "Location",
    subtitle: "Find Us",
    heroImage: "/images/hero-location.jpg",
    content: [
      {
        heading: "Head Office — Seoul, Korea",
        body: "123 Teheran-ro, Gangnam-gu, Seoul 06234, Republic of Korea\nTel: +82-2-1234-5678\nEmail: info@cerins.com",
      },
      {
        heading: "Regional Office — Moscow, Russia",
        body: "45 Tverskaya Street, Moscow 125009, Russia\nTel: +7-495-123-4567",
      },
      {
        heading: "Liaison Office — Ho Chi Minh City, Vietnam",
        body: "88 Nguyen Hue Boulevard, District 1, Ho Chi Minh City, Vietnam\nTel: +84-28-1234-5678",
      },
    ],
  },

  // ─── Certification ────────────────────────────────────────────────────────
  {
    slug: "russia",
    category: "certification",
    title: "Russia Certification",
    subtitle: "EAC & GOST-R",
    heroImage: "/images/cert-russia.jpg",
    content: [
      {
        heading: "Overview",
        body: "Russia requires a range of mandatory certifications for imported goods, including EAC (Eurasian Conformity) marking and GOST-R certificates. CERINS provides full support from documentation preparation to certificate issuance.",
      },
      {
        heading: "Service Scope",
        body: "EAC Declaration of Conformity, EAC Certificate of Conformity, GOST-R Certification, Fire Safety Certificate, and Metrological Approval.",
      },
      {
        heading: "Process Timeline",
        body: "Typical processing time ranges from 2 to 8 weeks depending on product category and testing requirements. CERINS coordinates all laboratory testing and government interactions on behalf of the client.",
      },
    ],
  },
  {
    slug: "kazakhstan",
    category: "certification",
    title: "Kazakhstan Certification",
    subtitle: "EAC & National Standards",
    heroImage: "/images/cert-kazakhstan.jpg",
    content: [
      {
        heading: "Overview",
        body: "As a member of the Eurasian Economic Union, Kazakhstan accepts EAC-marked products. However, certain product categories require additional national approvals from Kazakh regulatory authorities.",
      },
      {
        heading: "Service Scope",
        body: "EAC Certification, ST KZ National Standard Certificates, Sanitary-Epidemiological Conclusion, and Veterinary Certificates.",
      },
      {
        heading: "Our Approach",
        body: "CERINS manages all in-country coordination through its local partner network in Almaty and Nur-Sultan, ensuring smooth and timely approvals.",
      },
    ],
  },
  {
    slug: "belarus",
    category: "certification",
    title: "Belarus Certification",
    subtitle: "EAC & BY Standards",
    heroImage: "/images/cert-belarus.jpg",
    content: [
      {
        heading: "Overview",
        body: "Belarus is part of the Eurasian Economic Union (EAEU), meaning EAC certification applies across the board. Belarus also maintains specific national regulatory requirements for certain sectors.",
      },
      {
        heading: "Service Scope",
        body: "EAC Conformity Certificates, Belarus Hygiene Certificates, BY National Standards Certificates, and Import Registration for Controlled Goods.",
      },
      {
        heading: "Key Contacts",
        body: "CERINS maintains active relationships with Belstandart (State Committee for Standardization) and accredited Belarusian testing laboratories to facilitate smooth certification.",
      },
    ],
  },
  {
    slug: "uzbekistan",
    category: "certification",
    title: "Uzbekistan Certification",
    subtitle: "O'zstandart Approval",
    heroImage: "/images/cert-uzbekistan.jpg",
    content: [
      {
        heading: "Overview",
        body: "Uzbekistan has its own national standardization system governed by O'zstandart. Certain products require mandatory conformity assessment before market entry.",
      },
      {
        heading: "Service Scope",
        body: "O'zstandart Certificate of Conformity, Hygiene & Sanitary Registration, Metrological Approval, and Import License Support.",
      },
      {
        heading: "Timeline",
        body: "Processing typically takes 3–6 weeks. CERINS handles translation, sample testing coordination, and submission through its partner agency in Tashkent.",
      },
    ],
  },
  {
    slug: "ukraine",
    category: "certification",
    title: "Ukraine Certification",
    subtitle: "UkrSEPRO & Technical Regulations",
    heroImage: "/images/cert-ukraine.jpg",
    content: [
      {
        heading: "Overview",
        body: "Ukraine operates its own conformity assessment system (UkrSEPRO) and has adopted a set of technical regulations aligned with EU directives. Both national and EU-aligned certification may be required.",
      },
      {
        heading: "Service Scope",
        body: "UkrSEPRO Certificate, Technical Regulation Compliance (TR CU aligned), State Sanitary-Hygienic Expertise, and Product Registration.",
      },
      {
        heading: "CERINS Support",
        body: "Our team tracks the evolving regulatory landscape in Ukraine and ensures clients are prepared for any changes arising from ongoing EU harmonization efforts.",
      },
    ],
  },
  {
    slug: "turkmenistan",
    category: "certification",
    title: "Turkmenistan Certification",
    subtitle: "National Conformity Requirements",
    heroImage: "/images/cert-turkmenistan.jpg",
    content: [
      {
        heading: "Overview",
        body: "Turkmenistan maintains its own regulatory framework separate from the EAEU. Import certification is coordinated through the Turkmenstandartlary agency.",
      },
      {
        heading: "Service Scope",
        body: "Mandatory Certification of Conformity, Hygiene Certificate, and Import Permit Support for controlled categories.",
      },
      {
        heading: "Our Network",
        body: "CERINS works with trusted local agents in Ashgabat to navigate the Turkmen regulatory environment efficiently.",
      },
    ],
  },
  {
    slug: "azerbaijan",
    category: "certification",
    title: "Azerbaijan Certification",
    subtitle: "Azstandart Certification",
    heroImage: "/images/cert-azerbaijan.jpg",
    content: [
      {
        heading: "Overview",
        body: "Azerbaijan's national standardization body, Azstandart, oversees mandatory product certification. The country is gradually harmonizing its standards with international norms.",
      },
      {
        heading: "Service Scope",
        body: "AZ Certificate of Conformity, Sanitary-Hygienic Assessment, Metrological Type Approval, and Product Registration.",
      },
      {
        heading: "Process",
        body: "CERINS coordinates laboratory testing — often in Russia or Europe — and manages all documentation submission to Azstandart through its Baku representative.",
      },
    ],
  },
  {
    slug: "vietnam",
    category: "certification",
    title: "Vietnam Certification",
    subtitle: "CR, CR-BR & Sector-Specific Approvals",
    heroImage: "/images/cert-vietnam.jpg",
    content: [
      {
        heading: "Overview",
        body: "Vietnam requires conformity registration (CR) or conformity announcement (CB) for many imported products under the Ministry of Science and Technology (MOST) and sector-specific ministries.",
      },
      {
        heading: "Service Scope",
        body: "Conformity Registration (CR), Conformity Announcement (CB), Ministry of Industry and Trade approvals, and Import License Support.",
      },
      {
        heading: "CERINS Advantage",
        body: "Our Ho Chi Minh City liaison office provides on-the-ground support, ensuring accurate and timely submission to Vietnamese authorities.",
      },
    ],
  },
  {
    slug: "europe",
    category: "certification",
    title: "Europe Certification",
    subtitle: "CE Marking & EU Directives",
    heroImage: "/images/cert-europe.jpg",
    content: [
      {
        heading: "Overview",
        body: "The CE marking is mandatory for products sold in the European Economic Area (EEA). It demonstrates compliance with relevant EU directives and regulations covering safety, health, and environmental protection.",
      },
      {
        heading: "Service Scope",
        body: "CE Marking Consultancy, Technical File Preparation, Declaration of Conformity, Notified Body Coordination, REACH & RoHS Compliance, and UKCA Marking (UK).",
      },
      {
        heading: "Our Process",
        body: "CERINS guides clients through directive identification, risk assessment, testing at accredited EU laboratories, and technical documentation to achieve CE marking efficiently.",
      },
    ],
  },

  // ─── Inspection ───────────────────────────────────────────────────────────
  {
    slug: "pre-shipment-inspection",
    category: "inspection",
    title: "Pre-Shipment Inspection",
    subtitle: "Quality Assurance Before Dispatch",
    heroImage: "/images/insp-psi.jpg",
    content: [
      {
        heading: "Overview",
        body: "Pre-Shipment Inspection (PSI) verifies that goods conform to agreed specifications, quantity, and quality standards before they leave the exporter's premises or port of loading.",
      },
      {
        heading: "What We Inspect",
        body: "Quantity verification, visual quality check, packaging and labeling review, functionality testing, and documentation review against purchase order or letter of credit terms.",
      },
      {
        heading: "Reporting",
        body: "CERINS issues a detailed inspection report within 24–48 hours of inspection completion, including photographic evidence and a clear pass/fail summary.",
      },
    ],
  },
  {
    slug: "india-voc",
    category: "inspection",
    title: "India VOC",
    subtitle: "Voluntary Overseas Certification",
    heroImage: "/images/insp-india.jpg",
    content: [
      {
        heading: "Overview",
        body: "India's Voluntary Overseas Certification scheme, administered by the Bureau of Indian Standards (BIS), allows certain goods to be certified for conformity before import into India.",
      },
      {
        heading: "Applicable Products",
        body: "Electronics, electrical equipment, toys, footwear, and other consumer products listed under BIS mandatory registration schemes.",
      },
      {
        heading: "CERINS Role",
        body: "We coordinate factory audits, sample testing at BIS-recognized laboratories, and complete documentation submission to secure the ISI mark or BIS registration certificate.",
      },
    ],
  },
  {
    slug: "ndt",
    category: "inspection",
    title: "NDT",
    subtitle: "Non-Destructive Testing",
    heroImage: "/images/insp-ndt.jpg",
    content: [
      {
        heading: "Overview",
        body: "Non-Destructive Testing (NDT) allows the inspection of materials, components, and assemblies for defects or anomalies without causing damage to the item being tested.",
      },
      {
        heading: "Methods Offered",
        body: "Ultrasonic Testing (UT), Radiographic Testing (RT), Magnetic Particle Testing (MT), Liquid Penetrant Testing (PT), Visual Testing (VT), and Eddy Current Testing (ET).",
      },
      {
        heading: "Applications",
        body: "Oil & gas pipelines, pressure vessels, structural steel, welds, castings, and aerospace components. CERINS deploys certified Level II and Level III NDT technicians.",
      },
    ],
  },
  {
    slug: "general-inspection",
    category: "inspection",
    title: "General Inspection",
    subtitle: "Comprehensive Quality Control",
    heroImage: "/images/insp-general.jpg",
    content: [
      {
        heading: "Overview",
        body: "CERINS provides flexible general inspection services tailored to client requirements across a wide range of product categories and industrial sectors.",
      },
      {
        heading: "Service Types",
        body: "During Production Inspection (DUPRO), Final Random Inspection (FRI), Container Loading Supervision (CLS), and Factory Audit.",
      },
      {
        heading: "Coverage",
        body: "We operate across major manufacturing hubs in Korea, China, Vietnam, India, and Turkey, with access to a global network of qualified inspectors.",
      },
    ],
  },
  {
    slug: "other-services",
    category: "inspection",
    title: "Other Services",
    subtitle: "Specialized Trade Support",
    heroImage: "/images/insp-other.jpg",
    content: [
      {
        heading: "Cargo Survey",
        body: "Marine and inland cargo surveys including draft surveys, quantity determination, damage assessment, and outturn reports at ports of loading and discharge.",
      },
      {
        heading: "Expediting",
        body: "On-site expediting services to monitor production progress, resolve bottlenecks, and ensure on-time delivery of critical equipment and materials.",
      },
      {
        heading: "Consulting",
        body: "Regulatory consulting on international trade compliance, tariff classification, country-of-origin determination, and trade agreement utilization.",
      },
    ],
  },

  // ─── Services ─────────────────────────────────────────────────────────────
  {
    slug: "documentation",
    category: "services",
    title: "Documentation",
    subtitle: "Trade Document Preparation & Verification",
    heroImage: "/images/svc-documentation.jpg",
    content: [
      {
        heading: "Overview",
        body: "Accurate and compliant trade documentation is critical to smooth cross-border transactions. CERINS prepares, reviews, and verifies all required commercial, shipping, and regulatory documents.",
      },
      {
        heading: "Documents We Handle",
        body: "Certificate of Origin, Commercial Invoice Review, Packing List, Bill of Lading Review, Phytosanitary Certificate, Health Certificate, and Legalization / Apostille.",
      },
      {
        heading: "Added Value",
        body: "Our document specialists catch errors before shipment, reducing the risk of customs delays, fines, and cargo holds at the port of destination.",
      },
    ],
  },
  {
    slug: "project-management-custom-brokerage",
    category: "services",
    title: "Project Management & Custom Brokerage",
    subtitle: "End-to-End Trade Execution",
    heroImage: "/images/svc-pm.jpg",
    content: [
      {
        heading: "Project Management",
        body: "For complex multi-shipment or multi-country projects, CERINS provides dedicated project management to coordinate timelines, vendors, logistics providers, and regulatory bodies.",
      },
      {
        heading: "Customs Brokerage",
        body: "Our licensed customs brokers manage import and export clearance in Korea and key partner markets, ensuring accurate HS code classification, duty calculation, and timely release.",
      },
      {
        heading: "Integrated Solutions",
        body: "By combining project management with customs brokerage, CERINS offers a single point of accountability for even the most complex international trade operations.",
      },
    ],
  },
];

export function getPageBySlug(slug: string, category: PageData["category"]): PageData | undefined {
  return pages.find((p) => p.slug === slug && p.category === category);
}

export function getPageBySlugOnly(slug: string): PageData | undefined {
  return pages.find((p) => p.slug === slug);
}
