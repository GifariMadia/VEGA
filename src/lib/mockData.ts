import { CoaItem, BudgetRecord, GlTransaction, UploadBatch, AuditNote, UserProfile } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    username: 'admin_hendra',
    fullName: 'Hendra Setiawan',
    email: 'admin@it-ops.vega.corp',
    role: 'Administrator',
    status: 'Active',
    department: 'MIS Department',
    lastLogin: '2026-09-08 09:15 WIB',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-2',
    username: 'viewer_budi',
    fullName: 'Budi Hartono',
    email: 'viewer@it-ops.vega.corp',
    role: 'Viewer',
    status: 'Active',
    department: 'MIS Department',
    lastLogin: '2026-09-05 11:20 WIB',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-3',
    username: 'admin_sarah',
    fullName: 'Sarah Pratiwi',
    email: 'sarah.pratiwi@it-ops.vega.corp',
    role: 'Administrator',
    status: 'Active',
    department: 'MIS Department',
    lastLogin: '2026-09-07 16:40 WIB',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_COA: CoaItem[] = [
  // Hardware
  {
    code: 'IT-60101',
    accountName: 'Server Farm & Compute Blades',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'Data Center hyperconverged server infrastructure and blade upgrades'
  },
  {
    code: 'IT-60102',
    accountName: 'SAN/NAS High-IOPS Storage Arrays',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'Enterprise tier-0 storage and backup replication storage'
  },
  {
    code: 'IT-60103',
    accountName: 'End-User Laptops & Mobile Workstations',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'Jira Asset',
    status: 'Active',
    description: 'Developer laptops, corporate mobile devices and monitor refreshes'
  },
  {
    code: 'IT-60104',
    accountName: 'Barcode Scanners & Edge Terminals',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'ServiceNow',
    status: 'Active',
    description: 'Warehouse handheld scanners and branch office thin clients'
  },

  // Software
  {
    code: 'IT-60201',
    accountName: 'Public Cloud Infrastructure (AWS / GCP)',
    category: 'Software',
    department: 'MIS Department',
    registerSystem: 'Oracle Financials',
    status: 'Active',
    description: 'Multi-cloud compute, Kubernetes nodes, and managed database services'
  },
  {
    code: 'IT-60202',
    accountName: 'Core Enterprise ERP & Database Licenses',
    category: 'Software',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'SAP S/4HANA enterprise user licenses and Oracle DB processor cores'
  },
  {
    code: 'IT-60203',
    accountName: 'Cybersecurity EDR & SOC Tooling',
    category: 'Software',
    department: 'MIS Department',
    registerSystem: 'ServiceNow',
    status: 'Active',
    description: 'Endpoint detection, SIEM log ingestion, and Cloud Security Posture'
  },
  {
    code: 'IT-60204',
    accountName: 'SaaS Collaboration & Office 365',
    category: 'Software',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'Microsoft 365 E5 suites, Slack Enterprise grid, and Jira Cloud'
  },

  // Network
  {
    code: 'IT-60301',
    accountName: 'SD-WAN & Regional MPLS Telecommunications',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'Core backbone internet links, primary fiber optic, and branch SD-WAN'
  },
  {
    code: 'IT-60302',
    accountName: 'Core Data Center Switches & Firewalls',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'Oracle Financials',
    status: 'Active',
    description: 'Spine-leaf 100GbE switches and perimeter Next-Gen firewalls'
  },
  {
    code: 'IT-60303',
    accountName: 'Campus Wi-Fi 6 APs & Controllers',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'Jira Asset',
    status: 'Active',
    description: 'HQ and branch campus wireless access points and radius gateways'
  },
  {
    code: 'IT-60304',
    accountName: 'Colocation Rack Lease & Cross-Connects',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'Equinix & Telkom Tier IV data center colocation and direct peering'
  },

  // Consulting
  {
    code: 'IT-60401',
    accountName: 'Cloud Architecture & DevOps Advisory',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'Oracle Financials',
    status: 'Active',
    description: 'Third-party cloud optimization and CI/CD architecture engagement'
  },
  {
    code: 'IT-60402',
    accountName: 'Annual Penetration Testing & ISO Audit',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'External red-teaming, PCI-DSS compliance, and ISO 27001 audit'
  },
  {
    code: 'IT-60403',
    accountName: 'Data Engineering & AI Analytics Advisory',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'ServiceNow',
    status: 'Active',
    description: 'Lakehouse implementation and predictive data pipeline consulting'
  },
  {
    code: 'IT-60404',
    accountName: 'IT Strategy & Digital Governance PMO',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'Enterprise architecture blueprinting and portfolio prioritization'
  },

  // Maintenance
  {
    code: 'IT-60501',
    accountName: 'OEM Server & Storage 24x7 Mission-Critical SLA',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'HPE Pointnext & Dell ProSupport Plus 4-hour on-site replacement'
  },
  {
    code: 'IT-60502',
    accountName: 'Data Center UPS & Precision Cooling Servicing',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'Oracle Financials',
    status: 'Active',
    description: 'Quarterly UPS battery testing, generator runtime, and HVAC service'
  },
  {
    code: 'IT-60503',
    accountName: 'Database Administrator Managed Services SLA',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'ServiceNow',
    status: 'Active',
    description: '24/7 outsourced L3 DBA support for PostgreSQL and SAP HANA'
  },
  {
    code: 'IT-60504',
    accountName: 'Disaster Recovery Hot-Site Standby SLA',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP ERP',
    status: 'Active',
    description: 'Secondary cold/warm site failover readiness maintenance'
  },

  // Training
  {
    code: 'IT-60601',
    accountName: 'AWS & Kubernetes Cloud Engineering Certifications',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'AWS Solutions Architect Professional and CKA examination programs'
  },
  {
    code: 'IT-60602',
    accountName: 'CISSP & CISM Information Security Masterclass',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'Security leadership certification and threat analysis simulations'
  },
  {
    code: 'IT-60603',
    accountName: 'Agile Scrum & Safe Product Owner Certifications',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'Scrum.org PSPO and Safe Agilist training for digital product leads'
  },
  {
    code: 'IT-60604',
    accountName: 'Enterprise Secure Coding & DevSecOps Academy',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'Workday',
    status: 'Active',
    description: 'OWASP Top 10 hands-on code vulnerability remediation training'
  },

  // Real SAP Core Accounts observed from Corporate Ledger (Actual & Fix Cost Budget Data)
  {
    code: '750001000',
    accountPattern: '750001000-A7744-*',
    accountName: 'Basic Salary & Allow Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Indirect base salaries and standard allowances'
  },
  {
    code: '750101000',
    accountPattern: '750101000-A7744-*',
    accountName: 'Overtime Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Indirect shift and holiday overtime compensation'
  },
  {
    code: '750201000',
    accountPattern: '750201000-A7744-*',
    accountName: 'Bonus Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Indirect annual corporate performance bonus'
  },
  {
    code: '750301000',
    accountPattern: '750301000-A7744-*',
    accountName: 'THR Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Tunjangan Hari Raya (Religious Festive Allowance) Indirect'
  },
  {
    code: '750401000',
    accountPattern: '750401000-A7744-*',
    accountName: 'Medical Expense Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Health insurance and indirect outpatient/inpatient coverage'
  },
  {
    code: '750501000',
    accountPattern: '750501000-A7744-*',
    accountName: 'Severance Allowance Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Statutory severance and retirement pension provision'
  },
  {
    code: '750601000',
    accountPattern: '750601000-A7744-*',
    accountName: 'Labor Insurance Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'BPJS Ketenagakerjaan and employee labor accident insurance'
  },
  {
    code: '761001000',
    accountPattern: '761001000-A7744-*',
    accountName: 'Depr. Exp. - Software & License Indirect',
    category: 'Software',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Software depreciation, enterprise licensing, and shared IT cost allocations'
  },
  {
    code: '761201000',
    accountPattern: '761201000-A7744-*',
    accountName: 'T&E Expense Indirect',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Travel and entertainment expenses indirect'
  },
  {
    code: '761501000',
    accountPattern: '761501000-A7744-*',
    accountName: 'Maintenance & Repair Expense Indirect',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Preventive and scheduled maintenance for IT equipment and facilities'
  },
  {
    code: '752201001',
    accountPattern: '752201001-A7744-*',
    accountName: 'Communication Line Expense Indirect',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Corporate WAN, leased lines, branch VPNs, and primary telecom links'
  },
  {
    code: '750701001',
    accountPattern: '750701001-A7744-*',
    accountName: 'Subcontract Expense(IT)-G Indirect',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT consulting, managed operational services, and software engineering contracts'
  },
  {
    code: '750503001',
    accountPattern: '750503001-A7744-*',
    accountName: 'Rental Expense(Office Equipment) Indirect',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT laptop leasing, workstation rentals, and multi-function print servers'
  },
  {
    code: '751299001',
    accountPattern: '751299001-A7744-*',
    accountName: 'Rental Expense(Office Equipment) Indirect',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Peripheral office equipment rentals and edge computing units'
  },
  {
    code: '750699001',
    accountPattern: '750699001-A7744-*',
    accountName: 'Repair and Maintenance(Other) Indirect',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Hardware repair, IT facility maintenance, and spare components'
  },
  {
    code: '751401001',
    accountPattern: '751401001-A7744-*',
    accountName: 'Travel Expense(Domestic and International) Indir',
    category: 'Training',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Field engineer travel, datacenter audit dispatch, and technical conventions'
  },
  {
    code: '751501001',
    accountPattern: '751501001-A7744-*',
    accountName: 'Handling Charge and Professional Fee Indirect',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT legal compliance advisory, audit fees, and professional retainer'
  },
  {
    code: '771501000',
    accountPattern: '771501000-A7744-*',
    accountName: 'Handling Charge and Professional Fee SGA',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'SGA professional digital services, eSign certificates, and filing charges'
  },
  {
    code: '772403000',
    accountPattern: '772403000-A7744-*',
    accountName: 'Office Supply SGA',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT office consumables, RFID badges, and digital document stamps'
  },
  {
    code: '752001004',
    accountPattern: '752001004-A7744-*',
    accountName: 'Light and Heat Expense Indirect (Electricity)',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Datacenter high-voltage electrical power and HVAC cooling electricity'
  },
  {
    code: '752001005',
    accountPattern: '752001005-A7744-*',
    accountName: 'Utility Cost Indirect (Other)',
    category: 'Maintenance',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Facility utility charges and backup diesel generators'
  },
  {
    code: '740201000',
    accountPattern: '740201000-A7744-*',
    accountName: 'Salary(Full-time) Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Full-time engineering and operations staff compensation'
  },
  {
    code: '740202000',
    accountPattern: '740202000-A7744-*',
    accountName: 'Bonus(Full-time) Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Annual performance bonus compensation'
  },
  {
    code: '740202001',
    accountPattern: '740202001-A7744-*',
    accountName: 'THR Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Mandatory religious holiday allowance allocation'
  },
  {
    code: '740203000',
    accountPattern: '740203000-A7744-*',
    accountName: 'Overtime Hours(Full-time) Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'After-hours release and urgent incident resolution overtime'
  },
  {
    code: '740204000',
    accountPattern: '740204000-A7744-*',
    accountName: "Benefits-Employer's portion(Production-indirect)",
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Employer health and social security contributions (BPJS)'
  },
  {
    code: '740205000',
    accountPattern: '740205000-A7744-*',
    accountName: 'Wages (Temporary Worker) Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Temporary worker and data migration intern wages'
  },
  {
    code: '740206000',
    accountPattern: '740206000-A7744-*',
    accountName: 'Cost of Retirement Benefit Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Post-employment benefit liabilities'
  },
  {
    code: '750101001',
    accountPattern: '750101001-A7744-*',
    accountName: 'Depreciation of Building and Structure Indirect',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Fixed asset building amortization'
  },
  {
    code: '750104003',
    accountPattern: '750104003-A7744-*',
    accountName: 'Depreciation of Machinery Direct',
    category: 'Direct',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'SB0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Server and plant computing machinery direct depreciation'
  },
  {
    code: '750104004',
    accountPattern: '750104004-A7744-*',
    accountName: 'Depreciation of Machinery Indirect',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Facility machinery indirect depreciation'
  },
  {
    code: '751199001',
    accountPattern: '751199001-A7744-*',
    accountName: 'Subcontract Expense(Other)-G Indirect',
    category: 'Consulting',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Non-IT subcontract operational expenses'
  },
  {
    code: '771303000',
    accountPattern: '771303000-A7744-*',
    accountName: 'Freight Cost(Air) SGA',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'SHP000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Urgent air courier delivery charges'
  },
  {
    code: '772404000',
    accountPattern: '772404000-A7744-*',
    accountName: 'Welfare Expense SGA',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'COMM00',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Employee welfare and overtime support'
  },
  {
    code: '772405000',
    accountPattern: '772405000-A7744-*',
    accountName: 'Tax and Dues SGA',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'SHP000',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Corporate taxes, withholding, and regulatory municipal dues'
  },
  {
    code: '730307000',
    accountPattern: '730307000-A7744-*',
    accountName: 'Freight Cost Outward-Export',
    category: 'Needs Confirmation',
    department: 'Needs Confirmation - section C',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'COMM00',
    inScope: false,
    scopeStatus: 'Out of scope (per Template-Review.md finding #2)',
    description: 'Freight cost outward export logistics'
  },
  {
    code: '730322000',
    accountPattern: '730322000-A7744-*',
    accountName: 'Freight Cost Outward-Domestic',
    category: 'Needs Confirmation',
    department: 'Needs Confirmation - section C',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'COMM00',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Freight cost domestic distribution transport'
  },
  {
    code: '810302000',
    accountPattern: '810302000-A7744-*',
    accountName: 'Gain/Loss from Foreign Exchange(Reval)',
    category: 'Finance & FX',
    department: 'Needs Confirmation - section C',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'COMM00',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Foreign exchange revaluation adjustment'
  },
  {
    code: '980302000',
    accountPattern: '980302000-A7744-*',
    accountName: 'Gain/Loss from FX-Operating AP/AR',
    category: 'Finance & FX',
    department: 'Needs Confirmation - section C',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'COMM00',
    inScope: false,
    scopeStatus: 'Out of scope',
    description: 'Foreign exchange operating realized AP/AR adjustments'
  },
  // OMRON MIS Fix Cost SGA Accounts
  {
    code: '760101000',
    accountPattern: '760101000-A7744-*',
    accountName: 'LABOR SGA Salary[Full-time]',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Full-time labor salary for SGA / MIS staff'
  },
  {
    code: '760102000',
    accountPattern: '760102000-A7744-*',
    accountName: 'LABOR SGA Bonus[Full-time]',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Full-time labor bonus for SGA / MIS staff'
  },
  {
    code: '760102001',
    accountPattern: '760102001-A7744-*',
    accountName: 'LABOR SGA THR[Full-time]',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Tunjangan Hari Raya (THR) for SGA / MIS staff'
  },
  {
    code: '760103000',
    accountPattern: '760103000-A7744-*',
    accountName: 'LABOR SGA Overtime Hours[Full-time]',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Overtime compensation for SGA / MIS staff'
  },
  {
    code: '760104000',
    accountPattern: '760104000-A7744-*',
    accountName: "LABOR SGA Benefits-Employer's portion",
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Employer health and BPJS portion for SGA staff'
  },
  {
    code: '760105000',
    accountPattern: '760105000-A7744-*',
    accountName: 'LABOR SGA Wages (Temporary Worker)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Temporary and outsourced wages for SGA'
  },
  {
    code: '760106000',
    accountPattern: '760106000-A7744-*',
    accountName: 'LABOR SGA Cost of Retirement Benefit',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Retirement benefits provision for SGA staff'
  },
  {
    code: '770401000',
    accountPattern: '770401000-A7744-*',
    accountName: 'EXP SGA Lease Payment(Building and Structure)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Lease payment for buildings and structures'
  },
  {
    code: '770402000',
    accountPattern: '770402000-A7744-*',
    accountName: 'EXP SGA Lease Payment(Machinery)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Lease payment for machinery'
  },
  {
    code: '770403000',
    accountPattern: '770403000-A7744-*',
    accountName: 'EXP SGA Lease Payment(Tool and Equipment)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Lease payment for tools and equipment'
  },
  {
    code: '770404000',
    accountPattern: '770404000-A7744-*',
    accountName: 'EXP SGA Lease Payment(Vehicle)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Lease payment for vehicles'
  },
  {
    code: '772201000',
    accountPattern: '772201000-A7744-*',
    accountName: 'EXP SGA Communication Line Expense',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Telecommunication and internet lines expense'
  },
  {
    code: '772202000',
    accountPattern: '772202000-A7744-*',
    accountName: 'EXP SGA Communication Expense(IT)',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT networking, bandwidth, and corporate connectivity'
  },
  {
    code: '772299000',
    accountPattern: '772299000-A7744-*',
    accountName: 'EXP SGA Other Communication Expense',
    category: 'Network',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Other communication costs'
  },
  {
    code: '772399000',
    accountPattern: '772399000-A7744-*',
    accountName: 'EXP SGA Other Insurance Expense',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'General corporate and operational insurance'
  },
  {
    code: '772401000',
    accountPattern: '772401000-A7744-*',
    accountName: 'EXP SGA IT Fixture Expense',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'IT server racks, fixtures, and mounting equipment'
  },
  {
    code: '772402000',
    accountPattern: '772402000-A7744-*',
    accountName: 'EXP SGA Tool and Equipment',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Technical IT tools and testing instruments'
  },
  {
    code: '772499000',
    accountPattern: '772499000-A7744-*',
    accountName: 'EXP SGA Other Fixed Costs-Expenses',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Other fixed expenses and operational overhead'
  },
  {
    code: '770101000',
    accountPattern: '770101000-A7744-*',
    accountName: 'TOTAL SGA DEPRECIATION',
    category: 'Hardware',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Depreciation expenses for SGA assets'
  },
  {
    code: '752502001',
    accountPattern: '752502001-A7744-*',
    accountName: 'EXP INDIRECT Internal cost allocation(Expense)',
    category: 'Indirect',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'ME0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Internal cost allocation expense indirect'
  },
  {
    code: '772502000',
    accountPattern: '772502000-A7744-*',
    accountName: 'EXP SGA Internal cost allocation(Expense)',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Internal cost allocation expense SGA'
  },
  {
    code: '772412000',
    accountPattern: '772412000-A7744-*',
    accountName: 'EXP SGA Moving Expense',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Moving and relocation expenses for office/IT facilities'
  },
  {
    code: '772414000',
    accountPattern: '772414000-A7744-*',
    accountName: 'EXP SGA Product Warranty Cost',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Warranty and support costs for IT products/services'
  },
  {
    code: '772601000',
    accountPattern: '772601000-A7744-*',
    accountName: 'EXP SGA Cost Sharing',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Shared IT operational costs across departments'
  },
  {
    code: '772701000',
    accountPattern: '772701000-A7744-*',
    accountName: 'EXP SGA Freight Cost Outward-Export',
    category: 'SGA',
    department: 'MIS Department',
    registerSystem: 'SAP Core GL',
    status: 'Active',
    sectionCode: 'AF0000',
    inScope: true,
    scopeStatus: 'Active (In-Scope)',
    description: 'Shipping and logistics for IT equipment exports'
  }
];

// Helper to generate realistic monthly budget across 12 months
function createMonthlyPlan(monthlyBase: number): { monthly: Record<string, number>; annual: number } {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const res: Record<string, number> = {};
  let total = 0;
  months.forEach((m, i) => {
    // slight variance for seasonality (e.g. Q4 or year-end spikes)
    const factor = (i === 8 || i === 11) ? 1.15 : (i === 3 || i === 7) ? 0.95 : 1.0;
    const val = Math.round(monthlyBase * factor);
    res[m] = val;
    total += val;
  });
  return { monthly: res, annual: total };
}

// Generate FY2026/2027 and FY2025/2026 initial budgets (Values in USD)
const FY2026_BUDGET_BASES: Array<{ code: string; monthlyBase: number }> = [
  // Hardware
  { code: 'IT-60101', monthlyBase: 350_000 },
  { code: 'IT-60102', monthlyBase: 200_000 },
  { code: 'IT-60103', monthlyBase: 150_000 },
  { code: 'IT-60104', monthlyBase: 60_000 },
  // Software
  { code: 'IT-60201', monthlyBase: 550_000 },
  { code: 'IT-60202', monthlyBase: 420_000 },
  { code: 'IT-60203', monthlyBase: 220_000 },
  { code: 'IT-60204', monthlyBase: 180_000 },
  // Network
  { code: 'IT-60301', monthlyBase: 280_000 },
  { code: 'IT-60302', monthlyBase: 160_000 },
  { code: 'IT-60303', monthlyBase: 90_000 },
  { code: 'IT-60304', monthlyBase: 110_000 },
  // Consulting
  { code: 'IT-60401', monthlyBase: 240_000 },
  { code: 'IT-60402', monthlyBase: 130_000 },
  { code: 'IT-60403', monthlyBase: 170_000 },
  { code: 'IT-60404', monthlyBase: 95_000 },
  // Maintenance
  { code: 'IT-60501', monthlyBase: 210_000 },
  { code: 'IT-60502', monthlyBase: 85_000 },
  { code: 'IT-60503', monthlyBase: 145_000 },
  { code: 'IT-60504', monthlyBase: 75_000 },
  // Training
  { code: 'IT-60601', monthlyBase: 65_000 },
  { code: 'IT-60602', monthlyBase: 50_000 },
  { code: 'IT-60603', monthlyBase: 40_000 },
  { code: 'IT-60604', monthlyBase: 45_000 }
];

export const INITIAL_BUDGETS: BudgetRecord[] = [];

// Populate FY2026/2027 budgets (Total: $43,320,000 USD)
FY2026_BUDGET_BASES.forEach((item) => {
  const plan = createMonthlyPlan(item.monthlyBase);
  INITIAL_BUDGETS.push({
    id: `bgt-2026-${item.code}`,
    fiscalYear: 'FY2026/2027',
    coaCode: item.code,
    monthlyBudget: plan.monthly,
    annualTotal: plan.annual,
    updatedAt: '2026-03-25 14:00:00',
    updatedBy: 'admin_hendra'
  });
});

// Populate FY2025/2026 (Prior Year) budgets (~8% lower baseline, total ~$40M USD)
FY2026_BUDGET_BASES.forEach((item) => {
  const priorMonthlyBase = Math.round(item.monthlyBase * 0.92);
  const plan = createMonthlyPlan(priorMonthlyBase);
  INITIAL_BUDGETS.push({
    id: `bgt-2025-${item.code}`,
    fiscalYear: 'FY2025/2026',
    coaCode: item.code,
    monthlyBudget: plan.monthly,
    annualTotal: plan.annual,
    updatedAt: '2025-03-24 11:00:00',
    updatedBy: 'admin_hendra'
  });
});

// Generate GL transactions for April through August 2026 (Months 1 through 5)
// Realistic variances:
// - IT-60201 (Cloud) is notably Over Budget (spike in LLM inference / cloud workloads)
// - IT-60402 (Pen testing) is Over Budget (extra emergency audit scope)
// - IT-60101 (Servers) has low absorption (procurement delay from hardware vendor)
// - IT-60603 (Training) has low absorption (held back until Q3)
export const INITIAL_GL_TRANSACTIONS: GlTransaction[] = [];

const closedMonths: Array<{ month: 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug'; datePrefix: string; batchId: string }> = [
  { month: 'Apr', datePrefix: '2026-04', batchId: 'batch-gl-2026-04' },
  { month: 'May', datePrefix: '2026-05', batchId: 'batch-gl-2026-05' },
  { month: 'Jun', datePrefix: '2026-06', batchId: 'batch-gl-2026-06' },
  { month: 'Jul', datePrefix: '2026-07', batchId: 'batch-gl-2026-07' },
  { month: 'Aug', datePrefix: '2026-08', batchId: 'batch-gl-2026-08-v2' },
];

// Seed FY2026/2027 GL actuals based on budgets with realistic variances
INITIAL_BUDGETS.filter(b => b.fiscalYear === 'FY2026/2027').forEach((b) => {
  const code = b.coaCode;
  
  closedMonths.forEach((mInfo, idx) => {
    const planned = b.monthlyBudget[mInfo.month] || 100_000;
    let actualFactor = 0.98; // baseline ~98%

    if (code === 'IT-60201') {
      // Cloud infrastructure: +28% OVER BUDGET (worsening vs last year)
      actualFactor = 1.25 + (idx * 0.03);
    } else if (code === 'IT-60402') {
      // Pen test: +35% OVER BUDGET in Jul & Aug (new overrun)
      actualFactor = idx >= 3 ? 1.45 : 1.10;
    } else if (code === 'IT-60101') {
      // Servers: UNDER BUDGET / Low absorption (chip shortage vendor delays)
      actualFactor = 0.42;
    } else if (code === 'IT-60603') {
      // Scrum training: UNDER BUDGET / 22% absorption
      actualFactor = 0.22;
    } else if (code === 'IT-60102') {
      // Storage: 55% absorption
      actualFactor = 0.55;
    } else if (code === 'IT-60103') {
      // Laptops: High absorption 108%
      actualFactor = 1.08;
    } else if (code === 'IT-60301') {
      // Telco: ON TRACK ~96%
      actualFactor = 0.96;
    } else if (code === 'IT-60204') {
      // M365: ON TRACK ~98%
      actualFactor = 0.98;
    } else {
      // natural variation between 85% and 108%
      const variations = [0.92, 1.04, 0.96, 1.02, 0.95];
      actualFactor = variations[idx % variations.length];
    }

    const actualAmount = Math.round(planned * actualFactor);

    INITIAL_GL_TRANSACTIONS.push({
      id: `gl-${code}-${mInfo.month}`,
      fiscalYear: 'FY2026/2027',
      periodMonth: mInfo.month,
      coaCode: code,
      actualAmount,
      glDocumentNo: `DOC-${idx + 101}-${code.slice(3)}`,
      postingDate: `${mInfo.datePrefix}-28`,
      vendorName: getVendorForCoa(code),
      description: `Monthly GL booked actuals for ${code} (${mInfo.month} 2026)`,
      uploadBatchId: mInfo.batchId
    });
  });
});

// Seed FY2025/2026 (Prior Year) GL actuals for comparison
const priorClosedMonths: Array<{ month: 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug'; datePrefix: string }> = [
  { month: 'Apr', datePrefix: '2025-04' },
  { month: 'May', datePrefix: '2025-05' },
  { month: 'Jun', datePrefix: '2025-06' },
  { month: 'Jul', datePrefix: '2025-07' },
  { month: 'Aug', datePrefix: '2025-08' },
];

INITIAL_BUDGETS.filter(b => b.fiscalYear === 'FY2025/2026').forEach((b) => {
  const code = b.coaCode;
  
  priorClosedMonths.forEach((mInfo, idx) => {
    const planned = b.monthlyBudget[mInfo.month] || 90_000;
    let actualFactor = 0.95; // prior year baseline

    if (code === 'IT-60201') {
      // Cloud was only slightly over budget last year (+9%)
      actualFactor = 1.09;
    } else if (code === 'IT-60402') {
      // Pen test was on budget last year (98%)
      actualFactor = 0.98;
    } else if (code === 'IT-60101') {
      // Servers had healthy absorption last year (96%)
      actualFactor = 0.96;
    } else if (code === 'IT-60603') {
      // Training was at 75% last year
      actualFactor = 0.75;
    } else if (code === 'IT-60102') {
      // Storage had 92% absorption last year
      actualFactor = 0.92;
    } else if (code === 'IT-60103') {
      // Laptops: 90%
      actualFactor = 0.90;
    } else {
      const variations = [0.94, 0.97, 0.99, 0.95, 0.96];
      actualFactor = variations[idx % variations.length];
    }

    const actualAmount = Math.round(planned * actualFactor);

    INITIAL_GL_TRANSACTIONS.push({
      id: `gl-prior-${code}-${mInfo.month}`,
      fiscalYear: 'FY2025/2026',
      periodMonth: mInfo.month,
      coaCode: code,
      actualAmount,
      glDocumentNo: `DOC-2025-${idx + 101}-${code.slice(3)}`,
      postingDate: `${mInfo.datePrefix}-28`,
      vendorName: getVendorForCoa(code),
      description: `Prior Year Monthly GL booked actuals for ${code} (${mInfo.month} 2025)`,
      uploadBatchId: 'batch-gl-2025-audited'
    });
  });
});

function getVendorForCoa(code: string): string {
  switch (code) {
    case 'IT-60101': return 'PT Dell Technologies Indonesia';
    case 'IT-60102': return 'PT Hewlett Packard Enterprise';
    case 'IT-60103': return 'PT Lenovo Enterprise Partner';
    case 'IT-60201': return 'Amazon Web Services / Google Cloud Direct';
    case 'IT-60202': return 'SAP Indonesia Software Corp';
    case 'IT-60203': return 'CrowdStrike / Palo Alto Networks';
    case 'IT-60204': return 'Microsoft Cloud Solutions Partner';
    case 'IT-60301': return 'PT Telkom Indonesia (Persero) Tbk';
    case 'IT-60302': return 'Cisco Systems Indonesia';
    case 'IT-60401': return 'Accenture Technology Consulting';
    case 'IT-60402': return 'PwC Cyber Risk Advisory';
    default: return 'PT Mitra Integrasi Informatika';
  }
}

// Upload batches including a REPLACED batch for August
export const INITIAL_UPLOADS: UploadBatch[] = [
  {
    id: 'batch-bgt-2026-00',
    uploadType: 'Budget',
    fiscalYear: 'FY2026/2027',
    fileName: 'VEGA_IT_Budget_FY2026_Approved_Master.xlsx',
    fileSize: '482 KB',
    uploadedAt: '2026-03-25 14:00 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 43_320_000,
    budgetStatus: 'Over Budget',
    isOverBudget: true,
    overBudgetAmount: 320_000,
    overBudgetPercentage: 0.74,
    targetBudgetAmount: 43_000_000,
    varianceAmount: 320_000,
    overBudgetAccountsCount: 6,
    topOverBudgetCoa: {
      code: 'IT-60201',
      accountName: 'Cloud Infrastructure & Hosting',
      overAmount: 180_000,
      variancePct: 7.2
    },
    detailsSummary: 'Pagu anggaran tahunan FY2026/2027 disetujui $43,320,000 USD (Over Budget +$320,000 / +0.74% di atas pagu usulan awal $43.0M) dengan 6 akun dialokasikan di atas pagu baseline.'
  },
  {
    id: 'batch-gl-2026-04',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'Apr',
    fileName: 'SAP_GL_Actuals_Period_04_2026.xlsx',
    fileSize: '320 KB',
    uploadedAt: '2026-05-03 10:14 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_140_500,
    budgetStatus: 'Under Budget',
    isOverBudget: false,
    overBudgetAmount: 0,
    overBudgetPercentage: -6.25,
    targetBudgetAmount: 3_350_000,
    varianceAmount: -209_500,
    overBudgetAccountsCount: 0,
    detailsSummary: 'Realisasi belanja April berada dalam pagu anggaran ($209,500 hemat / -6.25% di bawah pagu bulanan $3.35M).'
  },
  {
    id: 'batch-gl-2026-05',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'May',
    fileName: 'SAP_GL_Actuals_Period_05_2026.xlsx',
    fileSize: '335 KB',
    uploadedAt: '2026-06-04 11:25 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_285_400,
    budgetStatus: 'Under Budget',
    isOverBudget: false,
    overBudgetAmount: 0,
    overBudgetPercentage: -2.80,
    targetBudgetAmount: 3_380_000,
    varianceAmount: -94_600,
    overBudgetAccountsCount: 1,
    detailsSummary: 'Realisasi belanja Mei terkendali dengan efisiensi -$94,600 (-2.80%) di bawah pagu anggaran bulanan $3.38M.'
  },
  {
    id: 'batch-gl-2026-06',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'Jun',
    fileName: 'SAP_GL_Actuals_Period_06_2026_Q1_Close.xlsx',
    fileSize: '360 KB',
    uploadedAt: '2026-07-05 09:30 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_450_800,
    budgetStatus: 'Over Budget',
    isOverBudget: true,
    overBudgetAmount: 30_800,
    overBudgetPercentage: 0.90,
    targetBudgetAmount: 3_420_000,
    varianceAmount: 30_800,
    overBudgetAccountsCount: 4,
    topOverBudgetCoa: {
      code: 'IT-60401',
      accountName: 'External IT Security Audit',
      overAmount: 18_500,
      variancePct: 15.4
    },
    detailsSummary: 'Realisasi belanja Juni tercatat Over Budget sebesar +$30,800 (+0.90%) akibat percepatan audit kepatuhan semester I.'
  },
  {
    id: 'batch-gl-2026-07',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'Jul',
    fileName: 'SAP_GL_Actuals_Period_07_2026.xlsx',
    fileSize: '348 KB',
    uploadedAt: '2026-08-04 15:45 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_612_200,
    budgetStatus: 'Over Budget',
    isOverBudget: true,
    overBudgetAmount: 172_200,
    overBudgetPercentage: 5.01,
    targetBudgetAmount: 3_440_000,
    varianceAmount: 172_200,
    overBudgetAccountsCount: 7,
    topOverBudgetCoa: {
      code: 'IT-60201',
      accountName: 'Cloud Infrastructure & Hosting',
      overAmount: 64_000,
      variancePct: 24.6
    },
    detailsSummary: 'Realisasi belanja Juli Over Budget sebesar +$172,200 (+5.01%) terpicu oleh lonjakan konsumsi cloud computing saat uji coba DR (Disaster Recovery).'
  },
  // SUPERSEDED (Replaced) August batch:
  {
    id: 'batch-gl-2026-08-v1',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'Aug',
    fileName: 'SAP_GL_Actuals_Period_08_2026_PRELIMINARY.xlsx',
    fileSize: '312 KB',
    uploadedAt: '2026-09-02 08:20 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Replaced',
    replacedAt: '2026-09-05 16:30 WIB',
    replacedBy: 'admin_hendra',
    replaceReason: 'GANTI DATA: SAP Financial reconciliation revealed omission of Cloud egress billing credit ($18,400) and duplicate consultant invoice #INV-8831.',
    replacedBatchId: 'batch-gl-2026-08-v2',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_890_000,
    previousTotalAmount: 3_890_000,
    budgetStatus: 'Over Budget',
    isOverBudget: true,
    overBudgetAmount: 440_000,
    overBudgetPercentage: 12.75,
    targetBudgetAmount: 3_450_000,
    varianceAmount: 440_000,
    overBudgetAccountsCount: 9,
    topOverBudgetCoa: {
      code: 'IT-60301',
      accountName: 'Enterprise ERP Support',
      overAmount: 145_000,
      variancePct: 36.2
    },
    detailsSummary: 'Draft awal Agustus mencatat Over Budget parah +$440,000 (+12.75%) sebelum dilakukan penyesuaian double-counting invoice konsultan.'
  },
  // ACTIVE August batch:
  {
    id: 'batch-gl-2026-08-v2',
    uploadType: 'Monthly GL',
    fiscalYear: 'FY2026/2027',
    targetMonth: 'Aug',
    fileName: 'SAP_GL_Actuals_Period_08_2026_FINAL_RECONCILED.xlsx',
    fileSize: '352 KB',
    uploadedAt: '2026-09-05 16:30 WIB',
    uploadedBy: 'admin_hendra',
    status: 'Active',
    rowCount: 24,
    acceptedRows: 24,
    rejectedRows: 0,
    totalAmount: 3_710_900,
    previousTotalAmount: 3_890_000,
    budgetStatus: 'Over Budget',
    isOverBudget: true,
    overBudgetAmount: 260_900,
    overBudgetPercentage: 7.56,
    targetBudgetAmount: 3_450_000,
    varianceAmount: 260_900,
    overBudgetAccountsCount: 5,
    topOverBudgetCoa: {
      code: 'IT-60201',
      accountName: 'Cloud Infrastructure & Hosting',
      overAmount: 88_500,
      variancePct: 34.0
    },
    detailsSummary: 'Batch final Agustus terkonfirmasi Over Budget sebesar +$260,900 (+7.56%) setelah koreksi nota kredit egress cloud.'
  }
];

export const INITIAL_AUDIT_NOTES: AuditNote[] = [
  {
    id: 'an-101',
    timestamp: '2026-09-05 16:35 WIB',
    userName: 'Hendra Setiawan (admin_hendra)',
    userRole: 'Administrator',
    category: 'Replacement',
    relatedBatchId: 'batch-gl-2026-08-v2',
    content: 'Approved GANTI DATA replacement for August 2026 GL actuals. Preliminary batch batch-gl-2026-08-v1 superseded following Finance Controller adjustment on double-counted contractor billing.'
  },
  {
    id: 'an-102',
    timestamp: '2026-08-04 16:00 WIB',
    userName: 'Sarah Pratiwi (admin_sarah)',
    userRole: 'Administrator',
    category: 'Upload',
    relatedBatchId: 'batch-gl-2026-07',
    content: 'Reconciliation of July 2026 actuals completed against Oracle Financials and SAP ERP. AWS bill reflected high surge due to regional disaster recovery rehearsal.'
  },
  {
    id: 'an-103',
    timestamp: '2026-07-06 14:10 WIB',
    userName: 'Hendra Setiawan (admin_hendra)',
    userRole: 'Administrator',
    category: 'Budget Revision',
    content: 'Q1 Close Audit passed with zero discrepancies. Noted low absorption in Hardware accounts (IT-60101, IT-60102) due to international customs delay in enterprise switch deliveries.'
  },
  {
    id: 'an-104',
    timestamp: '2026-06-04 11:40 WIB',
    userName: 'Budi Hartono (viewer_budi)',
    userRole: 'Viewer',
    category: 'System',
    content: 'System validation rule enabled: Chart of Accounts cross-check will reject any GL batch containing unmapped accounts outside IT division governance.'
  },
  {
    id: 'an-105',
    timestamp: '2026-03-25 14:15 WIB',
    userName: 'Hendra Setiawan (admin_hendra)',
    userRole: 'Administrator',
    category: 'Policy',
    relatedBatchId: 'batch-bgt-2026-00',
    content: 'Initial FY2026/2027 IT Operating & Capital Expenditure budget committed. Total approved cap: $43,320,000 USD across 24 standard IT COA codes.'
  }
];
