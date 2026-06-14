import { v4 as uuidv4 } from 'uuid';
import { run, all } from './database';

const CITIES = ['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur','Chandigarh'];
const CATEGORIES = ['Polos','Denim','Shirts','Jackets','Footwear','Accessories','Dresses','Knitwear'];
const AGE_GROUPS = ['18-24','25-34','35-44','45-54','55+'];

const NAMES = [
  'Arjun Mehta','Priya Sharma','Rohan Kapoor','Ananya Singh','Vikram Nair',
  'Shreya Patel','Aditya Joshi','Kavya Reddy','Nikhil Gupta','Pooja Iyer',
  'Siddharth Malhotra','Riya Bhatt','Karan Oberoi','Meera Krishnan','Rahul Verma',
  'Ishaan Chaudhary','Neha Bajaj','Aryan Saxena','Divya Nambiar','Varun Khanna',
  'Simran Walia','Dhruv Taneja','Sakshi Agarwal','Manav Sethi','Tanya Choudhary',
  'Aarav Pillai','Zara Khan','Kabir Bose','Anisha Rao','Yash Singhania',
  'Kriti Sood','Arnav Dutta','Pari Khanna','Rehan Sinha','Naina Bhatia',
  'Shaan Mathur','Aditi Menon','Veer Chauhan','Roshni Sharma','Dev Luthra',
  'Aisha Mitra','Samar Kapoor','Tara Nair','Mihir Shah','Jiya Bajwa',
  'Rudra Patel','Sia Khosla','Ayaan Mukherji','Myra Tiwari','Vivaan Grover'
];

const rnd = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rndN = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0]; };
const tier = (s: number) => s >= 50000 ? 'Platinum' : s >= 25000 ? 'Gold' : s >= 10000 ? 'Silver' : 'Bronze';

const PROFILES = [
  ...Array(4).fill({ spend: [50000,100000], orders: [12,20], lastPurchase: [90,180] }),
  ...Array(4).fill({ spend: [50000,120000], orders: [12,25], lastPurchase: [5,30]  }),
  ...Array(12).fill({ spend: [25000,49999], orders: [6,12],  lastPurchase: [15,150] }),
  ...Array(15).fill({ spend: [10000,24999], orders: [3,6],   lastPurchase: [30,200] }),
  ...Array(15).fill({ spend: [1500,9999],   orders: [1,3],   lastPurchase: [7,365]  }),
];

export default async function runSeed(): Promise<void> {
  // Clear existing — no transaction wrapper, run statements directly
  run('DELETE FROM communications');
  run('DELETE FROM campaigns');
  run('DELETE FROM segments');
  run('DELETE FROM orders');
  run('DELETE FROM customers');

  // Insert each customer and their orders directly
  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i];
    const profile = PROFILES[i] || PROFILES[PROFILES.length - 1];
    const totalSpent   = rndN(profile.spend[0], profile.spend[1]);
    const orderCount   = rndN(profile.orders[0], profile.orders[1]);
    const lastDaysAgo  = rndN(profile.lastPurchase[0], profile.lastPurchase[1]);
    const firstDaysAgo = lastDaysAgo + rndN(60, 730);
    const parts = name.split(' ');
    const customerId = uuidv4();

    run(`INSERT INTO customers (id,name,email,phone,city,tier,total_spent,order_count,last_purchase_date,first_purchase_date,preferred_category,age_group)
         VALUES (:id,:name,:email,:phone,:city,:tier,:spent,:orders,:last,:first,:cat,:age)`, {
      ':id': customerId, ':name': name,
      ':email': `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}@example.com`,
      ':phone': `+91${rndN(7000000000, 9999999999)}`,
      ':city': rnd(CITIES), ':tier': tier(totalSpent),
      ':spent': totalSpent, ':orders': orderCount,
      ':last': daysAgo(lastDaysAgo), ':first': daysAgo(firstDaysAgo),
      ':cat': rnd(CATEGORIES), ':age': rnd(AGE_GROUPS),
    });

    const avgOrder = totalSpent / orderCount;
    for (let o = 0; o < orderCount; o++) {
      const orderDays = o === 0 ? lastDaysAgo : lastDaysAgo + rndN(20, 100) * (o + 1);
      const amt = Math.round(avgOrder * (0.7 + Math.random() * 0.6));
      run(`INSERT INTO orders (id,customer_id,amount,items,category,channel,status,order_date)
           VALUES (:id,:cid,:amt,:items,:cat,:ch,:st,:dt)`, {
        ':id': uuidv4(), ':cid': customerId, ':amt': amt,
        ':items': JSON.stringify([{ name: `Tommy Hilfiger ${rnd(CATEGORIES)}`, price: amt, qty: 1 }]),
        ':cat': rnd(CATEGORIES), ':ch': Math.random() > 0.4 ? 'online' : 'in-store',
        ':st': 'completed', ':dt': daysAgo(Math.min(orderDays, 730)),
      });
    }
  }

  const customers = all<{ count: number }>('SELECT COUNT(*) as count FROM customers');
  const orders    = all<{ count: number }>('SELECT COUNT(*) as count FROM orders');
  console.log(`✅ Seeded ${customers[0]?.count} customers, ${orders[0]?.count} orders`);
}
