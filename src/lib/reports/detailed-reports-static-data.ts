import type { PerformanceRow } from "./types"

const BRANCH_NAMES = [
  "Mumbai Central",
  "Bandra West",
  "Andheri East",
  "Powai",
  "Thane",
  "Navi Mumbai",
  "Pune Hinjewadi",
  "Pune Kharadi",
  "Bangalore Whitefield",
  "Bangalore Indiranagar",
  "Hyderabad Gachibowli",
  "Hyderabad Hitech City",
  "Chennai OMR",
  "Chennai Anna Nagar",
  "Delhi Gurgaon",
  "Delhi Noida",
  "Ahmedabad SG Highway",
  "Kolkata Salt Lake",
  "Jaipur Malviya Nagar",
  "Kochi Kakkanad",
]

const PROJECT_NAMES = [
  "Skyline Residency",
  "Green Valley Estates",
  "Palm Grove Heights",
  "Lakeview Towers",
  "Sunrise Meadows",
  "Royal Orchid Park",
  "Emerald City Phase 2",
  "Silver Oak Villas",
  "Harmony Enclave",
  "Crown Plaza Residences",
  "Aqua Bay Apartments",
  "Maple Woods",
  "Prestige Gardens",
  "Urban Nest",
  "Golden Gate Homes",
  "Serene Heights",
  "Vista Grande",
  "Riverstone Court",
  "Horizon Park",
  "Elite Square",
]

const ADMIN_NAMES = [
  "Rajesh Kumar",
  "Priya Sharma",
  "Amit Patel",
  "Sneha Reddy",
  "Vikram Singh",
  "Ananya Iyer",
  "Karthik Menon",
  "Deepa Nair",
  "Rohit Gupta",
  "Meera Joshi",
  "Arjun Desai",
  "Kavita Rao",
  "Sanjay Mehta",
  "Lakshmi Pillai",
  "Nikhil Verma",
  "Pooja Agarwal",
  "Suresh Nambiar",
  "Divya Krishnan",
  "Manish Choudhary",
  "Ritu Bansal",
]

const MANAGER_NAMES = [
  "Arun Kulkarni",
  "Neha Kapoor",
  "Rahul Saxena",
  "Swati Malhotra",
  "Gaurav Bhatia",
  "Ishita Chatterjee",
  "Varun Khanna",
  "Aditi Sinha",
  "Harsh Trivedi",
  "Nidhi Oberoi",
  "Kunal Shah",
  "Tanvi Dutta",
  "Abhishek Roy",
  "Shreya Banerjee",
  "Vivek Pandey",
  "Anjali Mishra",
  "Prateek Jain",
  "Riya Ghosh",
  "Siddharth Rao",
  "Mansi Hegde",
]

const USER_NAMES = [
  "Aakash Sharma",
  "Bhavna Patel",
  "Chetan Deshmukh",
  "Diya Menon",
  "Eshan Iyer",
  "Farah Khan",
  "Gopal Naidu",
  "Heena Sheikh",
  "Imran Qureshi",
  "Jyoti Das",
  "Kiran Bose",
  "Lata Pillai",
  "Mohit Agarwal",
  "Nandini Reddy",
  "Omkar Joshi",
  "Pallavi Nair",
  "Qasim Ali",
  "Rekha Sundaram",
  "Sameer Verma",
  "Tanya Kapoor",
]

function buildStaticRows(
  names: string[],
  idPrefix: string,
  seed: number,
): PerformanceRow[] {
  return names.map((name, index) => {
    const leads = 180 - index * 7 + (seed % 5) * 3
    const newLeads = Math.round(leads * 0.42)
    const convertedLeads = Math.round(leads * (0.12 + (index % 6) * 0.02))
    const conversionRate = leads > 0 ? Math.round((convertedLeads / leads) * 1000) / 10 : 0
    const projects = Math.max(1, 8 - Math.floor(index / 3))
    const bookings = Math.max(0, convertedLeads - (index % 4))
    const revenue = bookings * (850000 + (index % 7) * 125000) + (seed % 3) * 50000

    return {
      id: `${idPrefix}-${index + 1}`,
      name,
      branchName: BRANCH_NAMES[index % BRANCH_NAMES.length],
      leads: Math.max(leads, 12),
      newLeads: Math.max(newLeads, 5),
      convertedLeads: Math.max(convertedLeads, 1),
      conversionRate,
      projects,
      bookings,
      revenue,
    }
  })
}

export const STATIC_BRANCH_REPORTS = buildStaticRows(BRANCH_NAMES, "branch", 1)
export const STATIC_PROJECT_REPORTS = buildStaticRows(PROJECT_NAMES, "project", 2)
export const STATIC_ADMIN_REPORTS = buildStaticRows(ADMIN_NAMES, "admin", 3)
export const STATIC_MANAGER_REPORTS = buildStaticRows(MANAGER_NAMES, "manager", 4)
export const STATIC_USER_REPORTS = buildStaticRows(USER_NAMES, "user", 5)
