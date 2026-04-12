import { db } from "@/lib/db";

type QuotationWriteupSeed = {
  key: string;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
};

const DEFAULT_QUOTATION_WRITEUPS: QuotationWriteupSeed[] = [
  {
    key: "executive-summary",
    title: "Executive Summary",
    sortOrder: 1,
    isActive: true,
    content: `We are pleased to present our proposal for the installation of a solar power plant at your facility. This project is designed to help your organization reduce electricity costs, lower carbon emissions, and move towards long-term energy sustainability.

Our comprehensive solution covers all aspects of the project, from design and procurement to installation, commissioning, and post-installation support. By partnering with us, you gain access to industry-leading technology, quality workmanship, and professional project management.

The solar power system will be installed as per applicable regulations and safety standards, and is structured to operate efficiently over its entire lifecycle. Our team ensures seamless coordination with local authorities and utility providers to facilitate net metering and necessary approvals.

This proposal outlines the commercial terms, implementation plan, warranty coverage, and after-sales support details. It reflects our commitment to delivering reliable, cost-effective, and environmentally responsible energy solutions tailored to your business needs.

We look forward to working with you and contributing to your sustainability goals.`,
  },
  {
    key: "description-of-services",
    title: "Description of Services",
    sortOrder: 2,
    isActive: true,
    content: `We propose to provide the following services for the installation of a solar plant:

Engineering
- Detailed site survey and feasibility analysis.
- Design of the solar power plant, including electrical and structural engineering.

Procurement
- Procurement of all necessary components and materials, including solar PV modules, inverters, mounting structures, cables, connectors, junction boxes, switchgear, and protection systems.
- All components shall comply with applicable quality standards such as BIS and IEC.

Construction and Installation
- Civil and structural works, including foundations and mounting systems.
- Mechanical installation of modules and mounting structures.
- Electrical installation, including cabling, inverter integration, earthing, and lightning protection.
- Synchronization with the grid as per DISCOM and CEIG guidelines.

Testing and Commissioning
- Pre-commissioning checks and testing of all systems.
- System energization and performance testing.
- Grid synchronization and approvals from relevant authorities.
- Preparation and submission of commissioning reports.

Training and Support
- Training sessions for customer staff on operation and maintenance of the solar plant.
- Ongoing technical support and maintenance services, as applicable.

Documentation and Approvals
- Assistance in obtaining statutory approvals such as CEIG, DISCOM, and net metering.
- Preparation of as-built drawings and final project reports.
- Warranty certificates, performance guarantees, and handover documents.`,
  },
  {
    key: "technical-considerations",
    title: "Technical Considerations - Hi-Tech Solar Solution",
    sortOrder: 3,
    isActive: true,
    content: `At Hi-Tech Solar Solution, we bring tailored engineering insight and practical foresight into every solar installation. For this proposal, we have crafted the following project assumptions and guidelines to ensure seamless delivery, performance, and compliance.

System Design Overview
- The proposed solar PV system is aligned with prevailing state net metering policies. The final rating may be fine-tuned during the detailed design phase. Any change in site conditions or reduction in total capacity beyond 5% may result in a project cost revision.
- Power generated will be evacuated at 415V through the LT panel of the same building, ensuring localized integration and minimal loss.
- Module tilts are assumed at 10 degrees, or as per the natural slope of the mounting surface, optimizing seasonal sun tracking.

Installation and Materials Approach
- All components will adhere to Hi-Tech Solar Solution's approved brand list. In rare cases of non-availability, equivalent alternatives of matching quality may be considered, subject to mutual agreement.
- The installation area must remain completely shadow-free throughout the day. Customers are requested to ensure any nearby obstructions, such as trees or structures, are cleared before execution and remain so during the lifespan of the project.
- No interference, such as chemical discharge, obstruction of light, or overheating of the site, should occur that could hinder solar performance.

Infrastructure and Site Readiness
- Hi-Tech Solar Solution will supply appropriate switchgear and protection devices. The customer is expected to provide feeder panels or enclosures required to house these elements at the LT side.
- Any alteration in technical specifications or layout requested after the bid phase or during site assessment will be evaluated for commercial impact and may affect the total cost.
- The design includes AC cabling up to the inverter ACDB. Cable lengths beyond BOQ meters from ACDB to the LT panel will incur additional charges based on the extra meterage.
- For efficient execution, the customer must ensure clear and safe access to the installation location. This includes providing ladders, scaffolding, and any required paths for movement of materials and personnel.

Execution Terms
- This is a turnkey project. All unused or surplus materials post-commissioning shall be returned to Hi-Tech Solar Solution.
- Regulatory approvals like CEIG and net metering, in accordance with current state regulations, fall within our scope. If additional permissions are needed, they will be handled based on agreed terms.
- While Hi-Tech Solar Solution will pursue approvals diligently, we are not responsible for delays caused by government bodies or utilities. Such delays do not constitute grounds for penalties or payment withholding.
- The customer is expected to support the approval process by providing required documents such as existing CEIG-approved drawings and utility NOCs.
- Any statutory fees, hardware upgrades, or extra charges mandated by DISCOM or authorities will be borne by the customer.

Commissioning and Performance Definitions
- Commissioning refers to the date the system begins delivering power at the defined delivery point.
- In some cases, where mechanical installation is completed but final commissioning is delayed due to customer-side infrastructure, it will be considered deemed commissioning.
- The delivery point for energy transfer is defined as the ACDB of the solar plant, connected to the customer's LT electrical panel.

What's Not Included
- Permanent rooftop access such as lifts or fixed ladders.
- Operation and maintenance services unless explicitly included.
- Network devices or IT infrastructure.
- Free provision of electricity or water during installation.
- Water supply at 6-bar pressure for module cleaning on rooftops.
- Spare panels or enclosures at the LT side for power evacuation.
- Assurance of rooftop strength. The customer must verify that GI sheets support 20-25 kg/m2 and RCC slabs support 60-65 kg/m2.`,
  },
  {
    key: "terms-and-conditions",
    title: "Terms and Conditions",
    sortOrder: 4,
    isActive: true,
    content: `1. Quotation Validity: The quotation provided is valid for a period of 15 days from the date of issuance. Prices are subject to change after this period.

2. Warranty: Hi-Tech Solar Solution warrants the installation workmanship for a period of 5 years from the date of commissioning. Solar panels, inverter, MCB, fuse, cartridges, and other equipment are subject to manufacturer warranties, details of which will be provided upon installation.

3. Maintenance and Service: Hi-Tech Solar Solution offers optional maintenance and service plans beyond the warranty period. Details of these plans can be provided upon request.

4. Site Access: The client shall provide unimpeded access to the installation site during agreed-upon times for the duration of the project.

5. Permits and Approvals: It is the responsibility of the client to obtain any necessary permits, approvals, or licenses required for the installation of the solar plant.

6. Interruption in Work: The customer must not interrupt the works, and shall abstain from any act or omission that may delay the works or make them more difficult or expensive for HTSS. The customer shall not unreasonably delay engineering approvals and shall make reasonable efforts to provide them within 7 days of submission of drawings.

7. Liability: Hi-Tech Solar Solution shall not be liable for any damages or losses resulting from acts of nature, accidents, or misuse of the solar plant after installation.

8. Changes and Modifications: Any changes or modifications to the project scope must be agreed upon in writing by both parties and may result in adjustments to the project timeline and cost.

9. Cable Length: Described cable length in BOQ is included in the standard plant rate. Cable length beyond the described BOQ will be charged extra as per actual.

10. Plant Capacity Variation: Plant capacity may vary due to solar panel size availability. Final billing amount will vary accordingly.

11. Defective Components: We will repair or, if found necessary, replace a defective component of the solar system for failure due to manufacturing defects. The repaired or replaced part or solar system does not carry a new warranty.

12. Exclusions: The warranty does not cover damage caused by acts of nature, accidents, misuse, or unauthorized modifications to the solar plant. Damage resulting from improper installation, maintenance, or servicing by parties other than Hi-Tech Solar Solution is not covered under this warranty.

13. Inclusion of Excluded Items: Any additional items due to change in scope or due to change in building or initial layout shall be charged extra and will be to the customer's account.

14. Security and Safety: On delivery of supplies to the customer's site in good condition, the customer shall be responsible for safety and security of the materials till handover to HTSS designated personnel for installation. The customer shall resolve disturbances at its premises and neighboring areas that impact project progress at its own risk and cost, and provide safety and security for HTSS personnel working at site. Any delay in execution or damage of materials due to disturbances at site shall be attributable to and compensated by the customer.

15. Force Majeure Clause: Force majeure refers to any event or circumstance beyond the reasonable control of HTSS, including natural calamities, health-related crises, labor disturbances, war, terrorism, embargoes, civil or military interference, and government actions. If a force majeure event prevents HTSS from fulfilling its obligations under this proposal, HTSS shall not be responsible for such non-performance provided the event directly causes the delay or failure. This does not absolve the customer of payment obligations. In the event of suspension due to force majeure, HTSS shall be entitled to recover payments for completed work, expenses for delivered materials, reasonable costs incurred in anticipation of project completion, demobilization costs, and additional costs arising from suspended third-party supplier contracts.

16. Termination by Customer for Contractor Default: The customer reserves the right to terminate the contract immediately by written notice if the contractor abandons or repudiates the contract, becomes bankrupt or insolvent, has a receiving order issued against it, compounds with creditors, or if a resolution or court order is made for winding up. In such termination, the contractor shall be entitled to payment for the completed portion of the contract, the value of unused or partially used plant and equipment present on-site, and reasonable costs incurred in protecting the facilities and restoring the site to a clean and safe condition, subject to deductions for any amount owed by the contractor to the employer before the termination date.

17. Termination by Contractor Due to Customer Default: The contractor may terminate the contract immediately by written notice if the customer fails to pay due amounts, fails to approve an invoice, becomes bankrupt or insolvent, has a receiving order issued against it, compounds with creditors, is wound up, or fails to support contractor obligations including site access, government permits, and dispatch clearance.

18. Contractor's Entitlement Upon Termination: If termination occurs due to customer default, the customer is liable to compensate the contractor for all related losses and damages, including payment for the executed portion of the facilities, demobilization costs, subcontractor settlements, site management costs, and expenses arising from obligations and claims undertaken in good faith with third parties related to the contract.

19. Warranty Claim Handling: Upon verification of a valid warranty claim, Hi-Tech Solar Solution will repair or replace the defective components within a reasonable time frame. If repair or replacement is not feasible, Hi-Tech Solar Solution reserves the right to provide an alternative solution.`,
  },
];

export const getDefaultQuotationWriteups = () => DEFAULT_QUOTATION_WRITEUPS.map((entry) => ({ ...entry }));

export const ensureQuotationWriteups = async () => {
  await Promise.all(
    DEFAULT_QUOTATION_WRITEUPS.map((entry) =>
      db.quotationWriteup.upsert({
        where: { key: entry.key },
        update: {},
        create: entry,
      })
    )
  );

  return db.quotationWriteup.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
};

export const getQuotationWriteups = async (options?: { activeOnly?: boolean }) => {
  const writeups = await ensureQuotationWriteups();
  if (options?.activeOnly) {
    return writeups.filter((entry) => entry.isActive);
  }

  return writeups;
};