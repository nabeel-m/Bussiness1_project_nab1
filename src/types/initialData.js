export const DEFAULT_COMPANY_INFO = {
  name: "SMART TECH",
  tagline: "INTERIOR & EXTERIOR SOLUTIONS",
  address: "Nurani Junction, Palakkad, Kerala",
  phones: "+91 9995984554, +91 8921889770",
  sloganQuote: `"We Craft Your Dream Space into a Colourful Reality."`,
  sloganSub: "Smart Tech - Always with You.",
  tradeMarkText: "SMART TECH ™ INTERIOR & EXTERIOR SOLUTION..."
};

export const INITIAL_USERS = [
  {
    id: "usr-admin",
    username: "admin",
    password: "admin123",
    name: "System Admin / Owner",
    role: "ADMIN",
    avatar: "👑"
  },
  {
    id: "usr-staff",
    username: "staff",
    password: "staff123",
    name: "Billing Staff Operator",
    role: "STAFF",
    avatar: "💼"
  },
  {
    id: "usr-client",
    username: "client",
    password: "client123",
    name: "Client Read-Only Viewer",
    role: "VIEWER",
    avatar: "👁️"
  }
];

export const INITIAL_CLIENTS = [
  {
    id: "client-1",
    name: "Kallekad Block Site Project",
    phone: "+91 9847012345",
    address: "Kallekad, Palakkad",
    siteLocation: "Kallekad Block Site",
    openingBalance: 1258382,
    createdAt: "2026-06-01"
  },
  {
    id: "client-2",
    name: "Nurani Residency Villa",
    phone: "+91 9447198765",
    address: "Nurani Junction, Palakkad",
    siteLocation: "Nurani Site 02",
    openingBalance: 450000,
    createdAt: "2026-06-15"
  },
  {
    id: "client-3",
    name: "Chandranagar Commercial Complex",
    phone: "+91 9745123456",
    address: "Chandranagar, Palakkad",
    siteLocation: "Chandranagar Mall",
    openingBalance: 850000,
    createdAt: "2026-07-01"
  }
];

export const INITIAL_QUOTATION = {
  id: "quot-sample-01",
  clientId: "client-1",
  refNo: "SMRT/2024-25",
  date: "2026-07-14",
  clientName: "Kallekad Block Site",
  clientAddress: "Kallekad, Palakkad, Kerala",
  items: [
    {
      id: "item-1",
      slIcon: "bullet",
      particulars: "Kallekad block site second bill balance amount : 129,950/-",
      amount: 129950.00
    },
    {
      id: "item-2",
      slIcon: "empty",
      particulars: "Borrowed money : 100,000",
      amount: 100000.00
    },
    {
      id: "item-3",
      slIcon: "empty",
      particulars: "Kallekad block site 3rd & 4 th bill balance amount : 966,823/-",
      amount: 966823.00
    },
    {
      id: "item-4",
      slIcon: "empty",
      particulars: "Total amount : 1196,773/-\n_________________",
      amount: 1196773.00
    },
    {
      id: "item-5",
      slIcon: "empty",
      particulars: "Grand total 1258,382 - 1196,773 = 61,609/-\n_________________",
      amount: 61609.00
    },
    {
      id: "item-6",
      slIcon: "empty",
      particulars: "Kallekad block site advance amount : 61,609/-",
      amount: 61609.00
    },
    {
      id: "item-7",
      slIcon: "square",
      particulars: "",
      amount: null
    }
  ]
};

export const INITIAL_TRANSACTIONS = [
  {
    id: "tx-1",
    clientId: "client-1",
    date: "2026-07-10",
    description: "Second Bill Amount",
    type: "BILL",
    amount: 129950
  },
  {
    id: "tx-2",
    clientId: "client-1",
    date: "2026-07-12",
    description: "Borrowed money advance credit",
    type: "PAYMENT",
    amount: 100000
  },
  {
    id: "tx-3",
    clientId: "client-1",
    date: "2026-07-14",
    description: "3rd & 4th bill balance amount",
    type: "BILL",
    amount: 966823
  },
  {
    id: "tx-4",
    clientId: "client-1",
    date: "2026-07-14",
    description: "Advance Paid Deduction",
    type: "PAYMENT",
    amount: 61609
  }
];
