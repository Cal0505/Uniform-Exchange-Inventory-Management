import { seedTestingOrders } from '../src/demoOrders';

seedTestingOrders().catch((error) => {
  console.error('Failed to seed testing orders:', error);
  process.exit(1);
});
