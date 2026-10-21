/**
 * Default Seed Data for POS Billing System
 * Includes categories, products, initial customers, users, and store settings in Indian Rupees (₹).
 */

const SEED_DATA = {
  settings: {
    storeName: "METRO HYPERMARKET",
    storeTagline: "Fresh Quality & Smart Savings",
    storeAddress: "104 University Avenue, Campus Center",
    storePhone: "+91 98765 43210",
    taxId: "GSTIN-33AABCM1234F1Z9",
    currency: "₹",
    defaultTaxRate: 5.0, // 5% GST
    receiptFooter: "Thank you for shopping with us! Please retain this bill for returns within 7 days.",
    lowStockThreshold: 10,
    theme: "light"
  },

  users: [
    { id: "usr-1", name: "Alex Morgan", role: "admin", pin: "1234", avatar: "AM" },
    { id: "usr-2", name: "Sarah Connor", role: "cashier", pin: "0000", avatar: "SC" }
  ],

  categories: [
    { id: "all", name: "All Items", icon: "🛍️" },
    { id: "beverages", name: "Beverages", icon: "🥤" },
    { id: "bakery", name: "Bakery & Fresh", icon: "🥐" },
    { id: "snacks", name: "Snacks & Munchies", icon: "🍿" },
    { id: "dairy", name: "Dairy & Frozen", icon: "🧀" },
    { id: "produce", name: "Fresh Produce", icon: "🍎" },
    { id: "electronics", name: "Electronics & Tech", icon: "🎧" },
    { id: "household", name: "Household Care", icon: "🧼" }
  ],

  products: [
    {
      id: "prod-101",
      name: "Cold Brew Artisan Coffee",
      sku: "BEV-001",
      barcode: "8901001001",
      category: "beverages",
      price: 180,
      costPrice: 95,
      taxRate: 5.0,
      stock: 45,
      icon: "☕",
      description: "Organic steeped cold brew 350ml"
    },
    {
      id: "prod-102",
      name: "Sparkling Mineral Water",
      sku: "BEV-002",
      barcode: "8901001002",
      category: "beverages",
      price: 60,
      costPrice: 30,
      taxRate: 5.0,
      stock: 80,
      icon: "💧",
      description: "Naturally carbonated mineral water 500ml"
    },
    {
      id: "prod-103",
      name: "Matcha Green Tea Latte",
      sku: "BEV-003",
      barcode: "8901001003",
      category: "beverages",
      price: 220,
      costPrice: 110,
      taxRate: 5.0,
      stock: 30,
      icon: "🍵",
      description: "Ceremonial grade matcha with oat milk"
    },
    {
      id: "prod-104",
      name: "Fresh Sourdough Bread",
      sku: "BAK-001",
      barcode: "8901002001",
      category: "bakery",
      price: 140,
      costPrice: 70,
      taxRate: 0,
      stock: 18,
      icon: "🍞",
      description: "Stone ground naturally fermented sourdough"
    },
    {
      id: "prod-105",
      name: "Butter Croissant (2-Pack)",
      sku: "BAK-002",
      barcode: "8901002002",
      category: "bakery",
      price: 120,
      costPrice: 55,
      taxRate: 5.0,
      stock: 12,
      icon: "🥐",
      description: "Flaky French-style all-butter croissants"
    },
    {
      id: "prod-106",
      name: "Blueberry Muffin Box",
      sku: "BAK-003",
      barcode: "8901002003",
      category: "bakery",
      price: 160,
      costPrice: 75,
      taxRate: 5.0,
      stock: 6, // Low stock demo
      icon: "🧁",
      description: "Loaded with wild blueberries"
    },
    {
      id: "prod-107",
      name: "Truffle & Sea Salt Chips",
      sku: "SNK-001",
      barcode: "8901003001",
      category: "snacks",
      price: 95,
      costPrice: 45,
      taxRate: 5.0,
      stock: 50,
      icon: "🥔",
      description: "Hand-cooked kettle chips with black truffle"
    },
    {
      id: "prod-108",
      name: "Dark Chocolate Almonds",
      sku: "SNK-002",
      barcode: "8901003002",
      category: "snacks",
      price: 240,
      costPrice: 120,
      taxRate: 5.0,
      stock: 25,
      icon: "🍫",
      description: "70% single origin cocoa roasted almonds 200g"
    },
    {
      id: "prod-109",
      name: "White Cheddar Popcorn",
      sku: "SNK-003",
      barcode: "8901003003",
      category: "snacks",
      price: 85,
      costPrice: 35,
      taxRate: 5.0,
      stock: 40,
      icon: "🍿",
      description: "Air-popped gourmet cheddar corn"
    },
    {
      id: "prod-110",
      name: "Greek Whole Milk Yogurt",
      sku: "DRY-001",
      barcode: "8901004001",
      category: "dairy",
      price: 110,
      costPrice: 50,
      taxRate: 0,
      stock: 22,
      icon: "🥛",
      description: "Unsweetened authentic Greek yogurt 500g"
    },
    {
      id: "prod-111",
      name: "Aged Cheddar Block (200g)",
      sku: "DRY-002",
      barcode: "8901004002",
      category: "dairy",
      price: 195,
      costPrice: 90,
      taxRate: 5.0,
      stock: 15,
      icon: "🧀",
      description: "Sharp white cheddar aged 12 months"
    },
    {
      id: "prod-112",
      name: "Almond Milk Unsweetened",
      sku: "DRY-003",
      barcode: "8901004003",
      category: "dairy",
      price: 175,
      costPrice: 85,
      taxRate: 0,
      stock: 35,
      icon: "🧃",
      description: "Plant-based calcium fortified milk 1L"
    },
    {
      id: "prod-113",
      name: "Organic Hass Avocados (Pack of 2)",
      sku: "PRD-001",
      barcode: "8901005001",
      category: "produce",
      price: 160,
      costPrice: 80,
      taxRate: 0,
      stock: 40,
      icon: "🥑",
      description: "Ripe ready-to-eat organic avocados"
    },
    {
      id: "prod-114",
      name: "Fresh Royal Gala Apples (1kg)",
      sku: "PRD-002",
      barcode: "8901005002",
      category: "produce",
      price: 180,
      costPrice: 90,
      taxRate: 0,
      stock: 60,
      icon: "🍎",
      description: "Crisp and sweet fresh orchard apples"
    },
    {
      id: "prod-115",
      name: "Organic Baby Spinach (250g)",
      sku: "PRD-003",
      barcode: "8901005003",
      category: "produce",
      price: 60,
      costPrice: 25,
      taxRate: 0,
      stock: 14,
      icon: "🥬",
      description: "Pre-washed triple-cleaned greens"
    },
    {
      id: "prod-116",
      name: "Fast USB-C Braided Cable 2M",
      sku: "ELC-001",
      barcode: "8901006001",
      category: "electronics",
      price: 399,
      costPrice: 150,
      taxRate: 18.0,
      stock: 25,
      icon: "🔌",
      description: "65W Fast Charging durable braided cable"
    },
    {
      id: "prod-117",
      name: "Wireless Earbuds Lite",
      sku: "ELC-002",
      barcode: "8901006002",
      category: "electronics",
      price: 1299,
      costPrice: 550,
      taxRate: 18.0,
      stock: 8, // Low stock demo
      icon: "🎧",
      description: "Bluetooth 5.3 with 24hr battery life"
    },
    {
      id: "prod-118",
      name: "Multi-Surface Citrus Cleaner",
      sku: "HOU-001",
      barcode: "8901007001",
      category: "household",
      price: 149,
      costPrice: 65,
      taxRate: 12.0,
      stock: 30,
      icon: "🧴",
      description: "Eco-friendly antibacterial spray 750ml"
    },
    {
      id: "prod-119",
      name: "Ultra Soft Paper Towels (4pk)",
      sku: "HOU-002",
      barcode: "8901007002",
      category: "household",
      price: 249,
      costPrice: 110,
      taxRate: 12.0,
      stock: 0, // Out of stock demo
      icon: "🧻",
      description: "2-ply absorbent recycled paper towels"
    },
    {
      id: "prod-120",
      name: "Aromatherapy Soy Candle",
      sku: "HOU-003",
      barcode: "8901007003",
      category: "household",
      price: 350,
      costPrice: 140,
      taxRate: 12.0,
      stock: 16,
      icon: "🕯️",
      description: "Lavender & Eucalyptus pure soy wax candle"
    }
  ],

  customers: [
    {
      id: "cust-0",
      name: "Walk-in Customer",
      phone: "N/A",
      email: "walkin@store.local",
      points: 0,
      totalSpent: 0
    },
    {
      id: "cust-1",
      name: "Rahul Sharma",
      phone: "+91 98234 56789",
      email: "rahul.s@gmail.com",
      points: 145,
      totalSpent: 4200
    },
    {
      id: "cust-2",
      name: "Pooja Patel",
      phone: "+91 98345 67890",
      email: "pooja.p@outlook.com",
      points: 320,
      totalSpent: 8900
    },
    {
      id: "cust-3",
      name: "Anand Verma",
      phone: "+91 98456 78901",
      email: "anand.v@yahoo.com",
      points: 80,
      totalSpent: 2100
    }
  ],

  orders: [
    {
      id: "ORD-1001",
      invoiceNumber: "INV-2026-0001",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      cashier: "Alex Morgan",
      customer: { id: "cust-1", name: "Rahul Sharma" },
      items: [
        { id: "prod-101", name: "Cold Brew Artisan Coffee", price: 180, qty: 2, taxRate: 5.0, total: 360 },
        { id: "prod-105", name: "Butter Croissant (2-Pack)", price: 120, qty: 1, taxRate: 5.0, total: 120 }
      ],
      subtotal: 480,
      tax: 24,
      discount: 0,
      grandTotal: 504,
      paymentMethod: "cash",
      tenderedAmount: 500,
      changeDue: 0,
      status: "completed"
    }
  ],

  heldOrders: []
};
