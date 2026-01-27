# Development Guide for Claude Code

> **Purpose:** This document serves as the primary instruction set for Claude Code when building robust applications. Follow these patterns to ensure consistency, maintainability, and minimize bugs.

---

## 🏗️ Design Patterns (The Essential 5)

> **Critical:** These 5 patterns eliminate 95% of bugs and allow Claude Code to work at maximum efficiency. They are complementary and should ALL be used together in the same project.

### Pattern Selection Criteria

- ✅ Claude Code executes perfectly (10/10 reliability)
- ✅ Eliminates entire classes of bugs
- ✅ Minimal token consumption
- ✅ Works seamlessly together

---

### 1. Contract Pattern ⭐⭐⭐⭐⭐

**Purpose:** Define public APIs between features to prevent integration bugs

**Execution Score:** 10/10 | **Anti-Bug Score:** 10/10

````typescript
// src/features/auth/auth.contract.ts

/**
 * Public API for authentication feature
 * Other features depend ONLY on this contract, never on implementation
 *
 * @example
 * ```ts
 * class CheckoutService {
 *   constructor(private auth: AuthContract) {}
 *
 *   async process() {
 *     const user = await this.auth.getCurrentUser()
 *   }
 * }
 * ```
 */
export interface AuthContract {
  /**
   * Authenticate user with credentials
   * @throws {InvalidCredentialsError} When credentials are wrong
   * @throws {UserBlockedError} When user account is blocked
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Get currently authenticated user
   * @throws {UnauthorizedError} When no user is authenticated
   */
  getCurrentUser(): Promise<User>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Sign out current user
   */
  logout(): Promise<void>;
}

export type AuthResult = {
  user: User;
  token: string;
  expiresAt: Date;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};
````

**Bugs Eliminated:**

- ❌ Feature A expects string, Feature B returns number
- ❌ Method renamed breaks all consumers
- ❌ Parameters in wrong order
- ❌ Unexpected return types
- ❌ Circular dependencies between features

**Why Claude Code Excels:**

- TypeScript enforces contracts at compile time
- Claude reads contract (50 lines) instead of implementation (2000 lines)
- Impossible to break contract without TypeScript errors

---

### 2. Service Pattern ⭐⭐⭐⭐⭐

**Purpose:** Encapsulate business logic in testable, reusable services

**Execution Score:** 10/10 | **Anti-Bug Score:** 9/10

```typescript
// src/features/auth/services/auth.service.ts

import { AuthContract, AuthResult, User } from '../auth.contract';
import { UserRepository } from '../repositories/user.repository';
import { EventBus } from '@/shared/events/eventBus';

export class AuthService implements AuthContract {
  constructor(
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    // 1. Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // 2. Find user
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // 3. Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // 4. Check if blocked
    if (user.isBlocked) {
      throw new UserBlockedError('Account is blocked');
    }

    // 5. Generate token
    const token = this.generateToken(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 6. Emit event (other features can react)
    this.eventBus.emit('auth:login', user);

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt,
    };
  }

  async getCurrentUser(): Promise<User> {
    const userId = this.getSessionUserId();
    if (!userId) {
      throw new UnauthorizedError('Not authenticated');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return this.sanitizeUser(user);
  }

  isAuthenticated(): boolean {
    return !!this.getSessionUserId();
  }

  async logout(): Promise<void> {
    const userId = this.getSessionUserId();
    if (userId) {
      this.eventBus.emit('auth:logout', { userId });
    }
    this.clearSession();
  }

  // Private helpers
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // implementation
  }

  private generateToken(user: User): string {
    // implementation
  }

  private sanitizeUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private getSessionUserId(): string | null {
    // implementation
  }

  private clearSession(): void {
    // implementation
  }
}

// Export singleton instance
export const authService = new AuthService(userRepository, eventBus);
```

**Bugs Eliminated:**

- ❌ Business logic scattered across components
- ❌ Code duplication
- ❌ Impossible to test without UI
- ❌ Inconsistent error handling
- ❌ Side effects in unexpected places

**Why Claude Code Excels:**

- Clear, single responsibility
- Easy to understand structure
- Natural place for error handling
- Straightforward to test

---

### 3. Repository Pattern ⭐⭐⭐⭐

**Purpose:** Isolate data access logic from business logic

**Execution Score:** 9/10 | **Anti-Bug Score:** 9/10

```typescript
// src/features/auth/repositories/user.repository.ts

import { db } from '@/lib/database';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserDTO): Promise<User> {
    return db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role || 'user',
        createdAt: new Date(),
      },
    });
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await db.user.delete({
      where: { id },
    });
  }

  async findAll(filters?: UserFilters): Promise<User[]> {
    return db.user.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Export singleton
export const userRepository = new UserRepository();
```

**Bugs Eliminated:**

- ❌ SQL/queries scattered throughout codebase
- ❌ Impossible to test without real database
- ❌ Changing ORM breaks entire application
- ❌ Inconsistent data access patterns
- ❌ N+1 query problems from disorganization

**Why Claude Code Excels:**

- Simple CRUD operations are easy to generate
- Clear separation of concerns
- Easy to mock in tests
- Straightforward to maintain

---

### 4. Event Bus Pattern (Observer) ⭐⭐⭐⭐

**Purpose:** Enable loose coupling between features through event-driven architecture

**Execution Score:** 8/10 | **Anti-Bug Score:** 10/10

```typescript
// src/shared/events/eventBus.ts

type EventHandler<T = any> = (data: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  async emit<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event) || [];

    // Execute all handlers (don't wait for them to prevent blocking)
    handlers.forEach((handler) => {
      try {
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`Error in handler for event "${event}":`, error);
        });
      } catch (error) {
        console.error(`Error in handler for event "${event}":`, error);
      }
    });
  }
}

// Export singleton
export const eventBus = new EventBus();

// Define typed events for better DX
export type AppEvents = {
  'auth:login': User;
  'auth:logout': { userId: string };
  'order:created': Order;
  'order:paid': { orderId: string; amount: number };
  'product:out-of-stock': { productId: string };
  'user:registered': User;
};
```

**Usage Example:**

```typescript
// Feature A: Orders (emits events)
// src/features/orders/services/order.service.ts
export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private eventBus: EventBus
  ) {}

  async create(data: CreateOrderDTO): Promise<Order> {
    const order = await this.orderRepo.create(data);

    // Emit event - other features can react
    this.eventBus.emit('order:created', order);

    return order;
  }
}

// Feature B: Email (reacts to events - doesn't know about OrderService)
// src/features/email/email.listener.ts
eventBus.on('order:created', async (order: Order) => {
  await emailService.sendOrderConfirmation(order);
});

// Feature C: Analytics (also reacts - independent)
// src/features/analytics/analytics.listener.ts
eventBus.on('order:created', async (order: Order) => {
  await analytics.track('purchase', {
    orderId: order.id,
    total: order.total,
    items: order.items.length,
  });
});

// Feature D: Inventory (also reacts - independent)
// src/features/inventory/inventory.listener.ts
eventBus.on('order:created', async (order: Order) => {
  for (const item of order.items) {
    await inventoryService.decreaseStock(item.productId, item.quantity);
  }
});
```

**Bugs Eliminated:**

- ❌ Circular dependencies between features
- ❌ Feature A change breaks Feature B
- ❌ Tight coupling makes refactoring impossible
- ❌ Adding new functionality requires modifying existing code
- ❌ Side effects scattered throughout codebase

**Why Claude Code Excels:**

- Simple pub/sub pattern (familiar from React)
- Clear separation of concerns
- Easy to add new listeners without touching existing code
- Natural async handling

---

### 5. Builder Pattern ⭐⭐⭐⭐⭐

**Purpose:** Create complex test fixtures easily and consistently

**Execution Score:** 10/10 | **Anti-Bug Score:** 8/10

**IMPORTANT:** Only use Builders for TESTS, not production code

```typescript
// test/builders/user.builder.ts

export class UserBuilder {
  private data: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date(),
    isBlocked: false,
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  asBlocked(): this {
    this.data.isBlocked = true;
    return this;
  }

  build(): User {
    return this.data as User;
  }
}

// test/builders/order.builder.ts
export class OrderBuilder {
  private data: Partial<Order> = {
    id: '1',
    userId: '1',
    items: [],
    total: 0,
    status: 'pending',
    createdAt: new Date(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withUser(userId: string): this {
    this.data.userId = userId;
    return this;
  }

  withItem(product: Product, quantity: number): this {
    this.data.items = [
      ...(this.data.items || []),
      { productId: product.id, quantity, price: product.price },
    ];
    this.data.total = (this.data.total || 0) + product.price * quantity;
    return this;
  }

  asPaid(): this {
    this.data.status = 'paid';
    return this;
  }

  asCancelled(): this {
    this.data.status = 'cancelled';
    return this;
  }

  build(): Order {
    return this.data as Order;
  }
}
```

**Usage in Tests:**

```typescript
// test/order.service.test.ts
import { UserBuilder } from './builders/user.builder';
import { OrderBuilder } from './builders/order.builder';
import { ProductBuilder } from './builders/product.builder';

describe('OrderService', () => {
  it('should create order for authenticated user', async () => {
    // Arrange - easy to create test data
    const user = new UserBuilder().withEmail('customer@example.com').build();

    const product = new ProductBuilder().withPrice(100).build();

    const mockAuth: AuthContract = {
      getCurrentUser: vi.fn().mockResolvedValue(user),
    };

    const service = new OrderService(orderRepository, mockAuth);

    // Act
    const order = await service.createFromCart([{ productId: product.id, quantity: 2 }]);

    // Assert
    expect(order.total).toBe(200);
    expect(order.userId).toBe(user.id);
  });

  it('should handle admin orders differently', async () => {
    // Easy to create variations
    const admin = new UserBuilder().asAdmin().build();

    // ... rest of test
  });

  it('should reject blocked users', async () => {
    const blockedUser = new UserBuilder().asBlocked().build();

    // ... rest of test
  });
});
```

**Bugs Eliminated:**

- ❌ Inconsistent test fixtures across test files
- ❌ Copy-pasted test setup code
- ❌ Tests break when data structure changes
- ❌ Hard to create specific test scenarios
- ❌ Fragile tests that break easily

**Why Claude Code Excels:**

- Straightforward pattern to implement
- Fluent API is easy to generate
- Makes tests much more readable
- Reduces test maintenance burden

---

## 🏗️ How All 5 Patterns Work Together

### Complete Feature Architecture

```
┌─────────────────────────────────────────────────┐
│              UI LAYER (React)                   │
│  Components use hooks                           │
│  Hooks call Services                            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         SERVICE LAYER (Business Logic)          │
│  - CheckoutService                              │
│  - AuthService                                  │
│  - ProductService                               │
│  └──> Uses Contracts from other features       │
│  └──> Uses Repositories for data               │
│  └──> Emits events to Event Bus                │
└─────┬───────────────────────────────────────┬───┘
      │                                       │
      │ Uses Repositories                     │ Emits Events
      │                                       │
┌─────▼─────────────────┐         ┌───────────▼──────────┐
│  REPOSITORY LAYER     │         │     EVENT BUS        │
│  - OrderRepository    │         │  Async Communication │
│  - UserRepository     │         │  Between Features    │
│  - ProductRepository  │         └──────────────────────┘
└─────┬─────────────────┘
      │
┌─────▼─────────────────┐
│   DATABASE/API        │
│   Prisma/HTTP/etc     │
└───────────────────────┘

Contracts define public APIs between features
Builders create test fixtures
```

### Real-World Example: Checkout Flow

```typescript
// ========================================
// 1. CONTRACTS (public interfaces)
// ========================================
// src/features/auth/auth.contract.ts
export interface AuthContract {
  getCurrentUser(): Promise<User>;
}

// src/features/payment/payment.contract.ts
export interface PaymentContract {
  charge(amount: number, method: PaymentMethod): Promise<PaymentResult>;
}

// src/features/cart/cart.contract.ts
export interface CartContract {
  getItems(userId: string): Promise<CartItem[]>;
  clear(userId: string): Promise<void>;
}

// ========================================
// 2. REPOSITORIES (data access)
// ========================================
// src/features/orders/repositories/order.repository.ts
export const orderRepository = {
  async create(data: CreateOrderDTO): Promise<Order> {
    return db.order.create({ data });
  },

  async findById(id: string): Promise<Order | null> {
    return db.order.findUnique({ where: { id } });
  },
};

// ========================================
// 3. SERVICE (business logic)
// ========================================
// src/features/checkout/services/checkout.service.ts
export class CheckoutService {
  constructor(
    private auth: AuthContract, // Uses contract
    private cart: CartContract, // Uses contract
    private payment: PaymentContract, // Uses contract
    private orderRepo: OrderRepository, // Uses repository
    private eventBus: EventBus // Uses event bus
  ) {}

  async process(paymentData: PaymentData): Promise<Order> {
    // 1. Get authenticated user
    const user = await this.auth.getCurrentUser();

    // 2. Get cart items
    const items = await this.cart.getItems(user.id);
    if (items.length === 0) {
      throw new EmptyCartError('Cart is empty');
    }

    // 3. Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Process payment
    const paymentResult = await this.payment.charge(total, paymentData.method);

    if (paymentResult.status === 'failed') {
      throw new PaymentError('Payment failed');
    }

    // 5. Create order
    const order = await this.orderRepo.create({
      userId: user.id,
      items,
      total,
      paymentId: paymentResult.transactionId,
      status: 'paid',
    });

    // 6. Clear cart
    await this.cart.clear(user.id);

    // 7. Emit event (other features react)
    this.eventBus.emit('order:created', order);

    return order;
  }
}

// ========================================
// 4. EVENT BUS (loose coupling)
// ========================================
// Other features react to order:created event independently

// src/features/email/email.listener.ts
eventBus.on('order:created', async (order: Order) => {
  await emailService.sendOrderConfirmation(order);
});

// src/features/analytics/analytics.listener.ts
eventBus.on('order:created', async (order: Order) => {
  await analytics.track('purchase', {
    orderId: order.id,
    total: order.total,
  });
});

// src/features/inventory/inventory.listener.ts
eventBus.on('order:created', async (order: Order) => {
  for (const item of order.items) {
    await inventoryService.decreaseStock(item.productId, item.quantity);
  }
});

// ========================================
// 5. BUILDERS (test fixtures)
// ========================================
// test/checkout.service.test.ts
describe('CheckoutService', () => {
  it('should process checkout successfully', async () => {
    // Arrange - using builders
    const user = new UserBuilder().withEmail('customer@test.com').build();

    const cart = new CartBuilder().withItem(product, 2).build();

    const mockAuth: AuthContract = {
      getCurrentUser: vi.fn().mockResolvedValue(user),
    };

    const mockCart: CartContract = {
      getItems: vi.fn().mockResolvedValue(cart.items),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    const mockPayment: PaymentContract = {
      charge: vi.fn().mockResolvedValue({
        transactionId: '123',
        status: 'success',
      }),
    };

    const service = new CheckoutService(
      mockAuth,
      mockCart,
      mockPayment,
      mockOrderRepo,
      mockEventBus
    );

    // Act
    const order = await service.process(paymentData);

    // Assert
    expect(order.total).toBe(200);
    expect(mockPayment.charge).toHaveBeenCalledWith(200, 'credit_card');
    expect(mockEventBus.emit).toHaveBeenCalledWith('order:created', order);
    expect(mockCart.clear).toHaveBeenCalledWith(user.id);
  });
});
```

---

## 🚫 Patterns to AVOID (Bug-Prone with Claude Code)

### ❌ Singleton Pattern

```typescript
// Seems simple but causes problems
class Database {
  private static instance: Database;

  static getInstance(): Database {
    if (!this.instance) {
      this.instance = new Database();
    }
    return this.instance;
  }
}
```

**Problems:**

- Hard to test (shared state between tests)
- Claude tends to create too many singletons
- Concurrency bugs
- Tests interfere with each other

**Better Alternative:** Simple export

```typescript
export const db = new Database();
```

---

### ❌ TypeScript Decorators

```typescript
@Log
@Validate
@Cache
class UserService {
  @RateLimit(100)
  async getUser(id: string) {}
}
```

**Problems:**

- Still experimental in TypeScript
- Claude sometimes confuses syntax
- Hard to debug
- Order of decorators causes bugs

**Better Alternative:** Explicit composition

```typescript
const userService = rateLimit(cache(validate(log(new UserService()))));
```

---

### ❌ Abstract Factory

```typescript
abstract class VehicleFactory {
  abstract createCar(): Car;
  abstract createTruck(): Truck;
}

class USVehicleFactory extends VehicleFactory {
  createCar(): Car {
    return new USSedanCar();
  }
  createTruck(): Truck {
    return new USPickupTruck();
  }
}
```

**Problems:**

- Over-engineering for 99% of cases
- Claude creates unnecessary hierarchies
- Complexity breeds bugs
- Hard to understand and maintain

**Better Alternative:** Simple factory

```typescript
const vehicleFactory = {
  createCar: (region: string) => {
    if (region === 'US') return new USSedanCar();
    return new EUSedanCar();
  },
};
```

---

## 💰 Token Economy Strategies

### Strategy 1: "Show, Don't Tell"

**❌ Token-Expensive Approach:**

```
"Create a CheckoutService using the Service pattern with
Dependency Injection following SOLID principles. It should
use the Repository pattern for data access and implement
the Strategy pattern for payment processing. Make sure to
emit events using the Observer pattern for loose coupling..."
[500+ words, ~1000 tokens]
```

**✅ Token-Efficient Approach:**

```
"Create CheckoutService following the same pattern as AuthService:
[paste AuthService.ts - 100 lines, ~300 tokens]

Use these contracts:
- PaymentContract
- CartContract
- AuthContract"
```

**Savings:** ~70% fewer tokens, better results

---

### Strategy 2: Reference Feature (Copy Good Code)

Create one perfect feature as a template:

```
/src/features/_reference
  /contracts
    reference.contract.ts      ← Perfect contract example
  /repositories
    reference.repository.ts    ← Perfect repository example
  /services
    reference.service.ts       ← Perfect service example
  /hooks
    useReference.ts           ← Perfect hook example
  /components
    ReferenceComponent.tsx    ← Perfect component example
  index.ts                    ← Perfect exports
```

**Usage:**

```
"Create ProductService identical to _reference/services/reference.service.ts
Just change the entity name and business logic"
```

**Benefits:**

- Consistent code structure
- Claude copies working patterns
- Minimal explanation needed
- ~80% token savings per feature

---

### Strategy 3: Schemas as Documentation

**❌ Token-Expensive:**

```
"The user registration should validate:
- Email must be valid format
- Password must be at least 8 characters
- Password must contain uppercase, lowercase, and number
- Name must be between 2 and 100 characters
- Age must be positive integer
- Phone is optional but must be valid format if provided..."
```

**✅ Token-Efficient:**

```typescript
// Just define the schema
export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  name: z.string().min(2).max(100),
  age: z.number().int().positive(),
  phone: z.string().phone().optional(),
});
```

Claude derives:

- Validation logic ✅
- TypeScript types ✅
- Form validation ✅
- Test fixtures ✅
- Error messages ✅

**Savings:** 1 schema replaces 50+ lines of explanation

---

### Strategy 4: Tests as Specifications

**❌ Token-Expensive:**

```
"Create a calculateShipping function that charges R$10 for
packages under 1kg, R$10 plus R$2 per extra kg for 1-5kg
packages, and adds 20% surcharge for distances over 100km.
It should throw an error for negative values..."
```

**✅ Token-Efficient:**

```typescript
"Make these tests pass:

describe('calculateShipping', () => {
  it('charges R$10 for < 1kg', () => {
    expect(calculateShipping(0.5, 50)).toBe(10)
  })

  it('charges R$10 + R$2/kg for 1-5kg', () => {
    expect(calculateShipping(3, 50)).toBe(14)
  })

  it('adds 20% for distance > 100km', () => {
    expect(calculateShipping(1, 150)).toBe(12)
  })

  it('throws error for negative values', () => {
    expect(() => calculateShipping(-1, 50)).toThrow()
  })
})"
```

**Benefits:**

- Tests are more concise than prose
- Unambiguous specification
- If tests pass, it works
- Claude is excellent at TDD

---

## 🛡️ Bug Prevention Stack

### Layer 1: TypeScript Strict Mode (catches 60% of bugs)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

**What it catches:**

- Type mismatches
- Null/undefined issues
- Missing return statements
- Implicit any types

---

### Layer 2: Runtime Validation (catches 25% of bugs)

```typescript
import { z } from 'zod';

// Schema validates data at runtime
const userSchema = z.object({
  email: z.string().email(),
  age: z.number().positive().int(),
});

// Use everywhere data enters system
const user = userSchema.parse(request.body);
```

**What it catches:**

- Invalid API responses
- Malformed user input
- Type coercion issues
- Data corruption

---

### Layer 3: Contract Pattern (catches 10% of bugs)

```typescript
// Contracts enforce interfaces
export interface PaymentContract {
  charge(amount: number): Promise<PaymentResult>;
}

// TypeScript ensures implementation matches
class StripePayment implements PaymentContract {
  async charge(amount: number): Promise<PaymentResult> {
    // Must match interface
  }
}
```

**What it catches:**

- Integration bugs between features
- Method signature mismatches
- Missing implementations
- Breaking changes

---

### Layer 4: Tests (catches 5% of bugs)

```typescript
// Tests catch edge cases and regressions
describe('CartService', () => {
  it('handles empty cart', () => {
    expect(cart.total).toBe(0);
  });

  it('rejects negative quantities', () => {
    expect(() => cart.addItem(product, -1)).toThrow();
  });
});
```

**What it catches:**

- Edge cases
- Regressions
- Business logic errors
- Integration issues

---

## ✅ Pattern Usage Checklist

When creating a new feature:

```markdown
- [ ] Define Contract if feature will be used by others
- [ ] Create Repository for all data access
- [ ] Implement Service for business logic
- [ ] Use Event Bus for cross-feature communication
- [ ] Create Builders for test fixtures
- [ ] Export only public API through index.ts
- [ ] Write tests using mocked contracts
- [ ] Document integration points
```

When integrating with existing feature:

```markdown
- [ ] Import ONLY the Contract, never implementation
- [ ] Use Event Bus if don't need synchronous response
- [ ] Mock contracts in tests
- [ ] Don't create circular dependencies
```

When writing tests:

```markdown
- [ ] Use Builders to create fixtures
- [ ] Mock Repositories (not real database)
- [ ] Mock Event Bus (don't trigger real events)
- [ ] Depend on Contracts, not implementations
- [ ] Test edge cases (null, empty, maximum values)
```

---

## 🎯 Core Principles

### 1. Iterative Development (CRITICAL)

- **NEVER** create entire apps at once
- Build ONE feature at a time, test, then proceed
- Always propose architecture BEFORE writing code
- Get approval on structure before implementation

### 2. Specification-First Approach

Before writing ANY code, provide:

```
📋 Architecture Proposal:
- Folder structure to be created
- Key components/files and their responsibilities
- Data flow diagram
- Libraries/dependencies needed
- Integration points with existing features

⏸️ WAIT for approval before proceeding
```

### 3. Communication Protocol

```typescript
// Always structure responses as:

1. Understanding Check
   "I understand you need [X] that does [Y] and [Z]"

2. Architecture Proposal
   [Show structure as outlined above]

3. Implementation Plan
   "I'll implement in this order:
   - Step 1: Create types/schemas
   - Step 2: Implement services (business logic)
   - Step 3: Create hooks
   - Step 4: Build UI components
   - Step 5: Write tests"

4. Execution (only after approval)
   [Write code]

5. Validation Prompt
   "Please test [specific functionality]. Let me know if adjustments are needed."
```

---

## 📁 Project Architecture

### Recommended Structure

```
/src
  /features              ← Feature-based organization (NOT type-based)
    /auth
      /components       ← UI components specific to auth
      /hooks           ← Custom hooks for auth
      /services        ← Business logic (pure functions)
      /types           ← TypeScript types/interfaces
      /utils           ← Helper functions
      auth.contract.ts ← PUBLIC API (integration point)
      index.ts         ← Barrel export (facade)
    /products
      [same structure]
    /checkout
      [same structure]

  /shared               ← ONLY truly shared code
    /components         ← Reusable UI components
    /hooks             ← Generic hooks
    /utils             ← Generic utilities
    /types             ← Shared types

  /config              ← Environment variables, constants
  /lib                 ← Third-party integrations
```

### Why This Structure Works

- ✅ Features are self-contained (easier to understand context)
- ✅ Reduces code duplication
- ✅ Easier navigation for LLMs
- ✅ Clear ownership boundaries

---

## 🔌 Feature Integration Pattern

### Problem: Large features exceed token limits during integration

### Solution: Contract-Based Integration

#### Step 1: Define Contract (Interface)

````typescript
// src/features/auth/auth.contract.ts

/**
 * Public API for authentication feature
 *
 * @example Basic usage
 * ```ts
 * const auth = container.resolve<AuthContract>('auth')
 * const result = await auth.login(email, password)
 * ```
 *
 * @example Integration with other features
 * ```ts
 * class OrderService {
 *   constructor(private auth: AuthContract) {}
 *
 *   async createOrder() {
 *     const user = await this.auth.getCurrentUser()
 *     // use user data
 *   }
 * }
 * ```
 */
export interface AuthContract {
  /**
   * Authenticate user with email and password
   * @throws {InvalidCredentialsError} When credentials are wrong
   * @throws {UserBlockedError} When user is blocked
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Get currently authenticated user
   * @throws {UnauthorizedError} When no user is authenticated
   */
  getCurrentUser(): Promise<User>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Sign out current user
   */
  logout(): Promise<void>;
}

/** @public */
export type AuthResult = {
  user: User;
  token: string;
  expiresAt: Date;
};

/** @public */
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

/**
 * Events emitted by auth feature
 * Use for loose coupling between features
 */
export type AuthEvents = {
  'auth:login': User;
  'auth:logout': void;
  'auth:session-expired': void;
};
````

#### Step 2: Implement Contract

```typescript
// src/features/auth/services/auth.service.ts
// This can be 2000+ lines - doesn't matter, other features don't read it

import { AuthContract, AuthResult, User } from '../auth.contract';

export class AuthService implements AuthContract {
  // Full implementation here
  // Can be as large and complex as needed
}
```

#### Step 3: Export Only Contract

```typescript
// src/features/auth/index.ts

// ✅ ONLY export public API
export type { AuthContract, AuthResult, User, AuthEvents } from './auth.contract';
export { authService } from './services/auth.service';

// ❌ DO NOT export internal implementation details
// ❌ DO NOT export: AuthServiceImpl, internal helpers, private types
```

#### Step 4: Integration

```typescript
// Other features only import from index.ts
import { AuthContract } from '@/features/auth';

// They only see the contract, not the implementation
class CheckoutService {
  constructor(private auth: AuthContract) {}

  async processOrder(cart: Cart) {
    const user = await this.auth.getCurrentUser();
    // ...
  }
}
```

### Integration Checklist

When integrating Feature A with Feature B:

```markdown
- [ ] Read ONLY Feature B's contract file (\*.contract.ts)
- [ ] Import ONLY from Feature B's index.ts
- [ ] Use TypeScript to ensure type safety
- [ ] Mock Feature B's contract for testing
- [ ] Document integration in Feature A's INTEGRATION.md
```

---

## 🧪 Testing Strategy

### Test Pyramid for Frontend

```
         /\
        /E2E\           10% - Critical user flows only
       /------\
      /Integration\     20% - Features working together
     /------------\
    /  Unit Tests  \    70% - Business logic, components
   /----------------\
```

### What to Test (Priorities)

#### 🔴 ALWAYS Test (Critical)

1. **Business Logic (Services/Utils)**

   ```typescript
   // auth.service.test.ts
   describe('AuthService', () => {
     it('should hash password before storing', async () => {
       const service = new AuthService(mockRepo);
       await service.register('user@mail.com', 'password123');

       expect(mockRepo.save).toHaveBeenCalledWith(
         expect.objectContaining({
           password: expect.not.stringContaining('password123'),
         })
       );
     });

     it('should throw error if email exists', async () => {
       mockRepo.findByEmail.mockResolvedValue(existingUser);

       await expect(service.register('existing@mail.com', 'pass')).rejects.toThrow(
         'Email already registered'
       );
     });

     it('should handle empty password', async () => {
       await expect(service.register('user@mail.com', '')).rejects.toThrow('Password is required');
     });
   });
   ```

2. **Validation & Business Rules**

   ```typescript
   // validators.test.ts
   describe('Product Validation', () => {
     it('should reject negative price', () => {
       const result = validateProduct({ price: -10 });
       expect(result.errors).toContain('Price must be positive');
     });

     it('should require name', () => {
       const result = validateProduct({ name: '' });
       expect(result.errors).toContain('Name is required');
     });

     it('should accept valid product', () => {
       const result = validateProduct(validProduct);
       expect(result.isValid).toBe(true);
     });
   });
   ```

3. **Edge Cases**

   ```typescript
   describe('Shopping Cart', () => {
     it('should handle empty cart', () => {
       expect(cart.total).toBe(0);
       expect(cart.items).toHaveLength(0);
     });

     it('should limit max quantity per item', () => {
       cart.addItem(product, 1000);
       expect(cart.items[0].quantity).toBe(99); // max limit
     });

     it('should remove item when quantity is 0', () => {
       cart.addItem(product, 2);
       cart.updateQuantity(product.id, 0);
       expect(cart.items).toHaveLength(0);
     });

     it('should handle null/undefined gracefully', () => {
       expect(() => cart.addItem(null)).toThrow('Invalid product');
       expect(() => cart.addItem(undefined)).toThrow('Invalid product');
     });
   });
   ```

#### 🟡 CONSIDER Testing (Important)

4. **Custom Hooks**

   ```typescript
   // useProducts.test.ts
   import { renderHook, waitFor } from '@testing-library/react';
   ```

describe('useProducts', () => {
it('should load products on mount', async () => {
const { result } = renderHook(() => useProducts())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3)
      expect(result.current.isLoading).toBe(false)
    })

})

it('should filter by category', async () => {
const { result } = renderHook(() => useProducts())

    await waitFor(() => expect(result.current.products).toBeDefined())

    act(() => {
      result.current.filterByCategory('electronics')
    })

    expect(result.current.filtered).toHaveLength(1)

})

it('should handle API errors', async () => {
mockApi.getProducts.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProducts())

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load products')
    })

})
})

````
5. **Component Integration**
```typescript
// LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('LoginForm', () => {
  it('should login successfully', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    render(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('Email'), 'user@test.com')
    await user.type(screen.getByLabelText('Password'), 'pass123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        user: expect.objectContaining({ email: 'user@test.com' })
      })
    })
  })

  it('should show validation errors', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByText('Invalid email')).toBeInTheDocument()
  })
})
````

#### 🟢 OPTIONAL Testing

6. **Simple UI Components** (if time permits)

   ```typescript
   // Button.test.tsx
   describe('Button', () => {
   it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
   })

   it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
   })

   it('should be disabled when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
   })
   })
   ```

#### ⚪ NEVER Test

- ❌ Framework internals (React, Next.js)
- ❌ External libraries (Zod, React Query, etc)
- ❌ Trivial getters/setters
- ❌ CSS/styling
- ❌ Mock implementations themselves

### Test Patterns

#### Pattern 1: AAA (Arrange, Act, Assert)

```typescript
test('should calculate discount', () => {
  // Arrange
  const cart = new Cart();
  cart.addItem({ price: 100, quantity: 2 });

  // Act
  cart.applyDiscount(0.1); // 10% off

  // Assert
  expect(cart.total).toBe(180); // 200 - 20
});
```

#### Pattern 2: Test Builders

```typescript
// test/builders/user.builder.ts
export class UserBuilder {
  private data: Partial<User> = {
    email: 'test@mail.com',
    name: 'Test User',
    role: 'user',
  };

  withEmail(email: string) {
    this.data.email = email;
    return this;
  }

  asAdmin() {
    this.data.role = 'admin';
    return this;
  }

  build(): User {
    return this.data as User;
  }
}

// Usage
test('admin can delete users', () => {
  const admin = new UserBuilder().asAdmin().build();
  expect(service.canDelete(admin)).toBe(true);
});
```

#### Pattern 3: MSW for API Mocking

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();

    if (email === 'user@test.com' && password === 'pass123') {
      return HttpResponse.json({
        user: { id: '1', email, name: 'Test User' },
        token: 'fake-jwt-token',
      });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
];

// test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E Testing (Playwright)

Only for **critical user flows**:

- Authentication flow
- Checkout/payment flow
- Main user journeys

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('complete purchase flow', async ({ page }) => {
  // 1. Navigate to store
  await page.goto('/');

  // 2. Search product
  await page.getByPlaceholder('Search products').fill('iPhone');
  await page.getByRole('button', { name: 'Search' }).click();

  // 3. Add to cart
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(page.getByText('Added to cart')).toBeVisible();

  // 4. Go to cart
  await page.getByRole('link', { name: 'Cart (1)' }).click();
  await expect(page).toHaveURL('/cart');

  // 5. Checkout
  await page.getByRole('button', { name: 'Checkout' }).click();

  // 6. Fill payment info
  await page.getByLabel('Card number').fill('4111111111111111');
  await page.getByLabel('Name').fill('Anderson Silva');

  // 7. Confirm
  await page.getByRole('button', { name: 'Confirm payment' }).click();

  // 8. Verify success
  await expect(page.getByText('Order confirmed!')).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/\d+/);
});
```

### Coverage Goals (Pragmatic)

```
- Business logic (services/utils): 90%+
- Hooks: 80%+
- Components: 60%+
- Overall: 70%+

DO NOT pursue 100% - diminishing returns
```

---

## 🎨 Code Quality Standards

### 1. Types-First Development

```typescript
// ALWAYS define types/schemas FIRST

// Step 1: Define schema (single source of truth)
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'user']),
});

export type User = z.infer<typeof userSchema>;

// Step 2: Derive everything from schema
export const validateUser = (data: unknown) => userSchema.safeParse(data);

export const userFormSchema = userSchema.pick({ email: true, name: true });

export const mockUser: User = {
  email: 'test@mail.com',
  name: 'Test User',
  role: 'user',
};
```

### 2. Error Handling

```typescript
// ALWAYS handle errors explicitly

// ❌ BAD: No error handling
async function login(email: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

// ✅ GOOD: Comprehensive error handling
async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.message, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Network error. Please try again.', 500);
  }
}
```

### 3. Component Structure

````typescript
// Consistent component pattern

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components'
import { useAuth } from '../hooks/useAuth'
import type { LoginFormProps } from './types'

/**
 * Login form component
 *
 * @example
 * ```tsx
 * <LoginForm onSuccess={(user) => redirect('/dashboard')} />
 * ```
 */
export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  // 1. Hooks
  const router = useRouter()
  const { login, isLoading } = useAuth()

  // 2. State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 3. Effects
  useEffect(() => {
    // cleanup or subscriptions
  }, [])

  // 4. Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const validation = validateLoginForm({ email, password })
    if (!validation.success) {
      setErrors(validation.errors)
      return
    }

    // Submit
    try {
      const result = await login(email, password)
      onSuccess?.(result.user)
    } catch (error) {
      onError?.(error)
      setErrors({ form: error.message })
    }
  }

  // 5. Render
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
````

### 4. Naming Conventions

```typescript
// Components: PascalCase
export function ProductCard() {}

// Hooks: useCamelCase
export function useProducts() {}

// Services: camelCase + Service suffix
export class AuthService {}
export const authService = new AuthService();

// Types: PascalCase
export type User = {};
export interface AuthContract {}

// Constants: SCREAMING_SNAKE_CASE
export const MAX_ITEMS_PER_PAGE = 50;
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Files:
// - Components: PascalCase.tsx
// - Hooks: useCamelCase.ts
// - Services: camelCase.service.ts
// - Types: camelCase.types.ts
// - Tests: *.test.ts or *.spec.ts
```

---

## 🚀 Development Workflow

### Phase 1: Planning (REQUIRED)

```markdown
1. Understand requirements
   - What is the feature?
   - What are the acceptance criteria?
   - What are the edge cases?

2. Check existing features
   - What can be reused?
   - What integrations are needed?
   - Read relevant \*.contract.ts files

3. Propose architecture
   - Folder structure
   - Key files and their purpose
   - Data flow
   - Dependencies
   - Integration points

4. Wait for approval ⏸️
```

### Phase 2: Implementation

```markdown
1. Create types/schemas first
   - Define data structures
   - Create validation schemas
   - Export types

2. Implement business logic (services)
   - Pure functions when possible
   - Comprehensive error handling
   - Write unit tests alongside

3. Create hooks (if needed)
   - React hooks for state management
   - Test hooks with renderHook

4. Build UI components
   - Follow component structure pattern
   - Handle loading/error states
   - Write integration tests

5. Create contract file
   - Document public API
   - Add usage examples
   - Export only what's needed

6. Update index.ts
   - Export public API only
   - Hide implementation details
```

### Phase 3: Testing

```markdown
1. Unit tests for business logic ✅
2. Integration tests for features ✅
3. E2E tests for critical flows ✅
4. Run all tests: `npm test`
5. Check coverage: `npm run test:coverage`
```

### Phase 4: Documentation

```markdown
1. Add TSDoc comments to public APIs
2. Create/update INTEGRATION.md if feature is reusable
3. Update relevant ADRs if architecture changed
```

---

## 🛠️ Tech Stack Recommendations

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (global) + React Query (server state)
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest + Testing Library + Playwright

### Backend (if using Next.js API)

- **Validation:** Zod
- **Database:** Prisma (if using SQL) or Mongoose (if MongoDB)
- **Auth:** NextAuth.js or custom JWT

### Mobile (React Native)

- **Framework:** Expo
- **Navigation:** Expo Router
- **State:** Zustand + React Query
- **Styling:** NativeWind (Tailwind for RN)
- **Testing:** Jest + Testing Library

---

## 📋 Task Execution Protocol

### When receiving a task:

```typescript
// 1. ACKNOWLEDGE & CLARIFY
"I understand you need [feature] that does [X, Y, Z].
 Before I start, let me confirm:
 - [Question 1]?
 - [Question 2]?
 - [Question 3]?"

// 2. PROPOSE ARCHITECTURE
"Here's the proposed structure:

/src/features/[feature-name]
  /components
    ComponentA.tsx
    ComponentB.tsx
  /hooks
    use[Feature].ts
  /services
    [feature].service.ts
  /types
    [feature].types.ts
  [feature].contract.ts
  index.ts

Key decisions:
- Using [library] for [reason]
- Integration with [existing feature] via contract
- State management with [approach]

Does this approach work for you?"

// 3. WAIT FOR APPROVAL
[Don't write code until approved]

// 4. IMPLEMENT
[Write code following all patterns in this guide]

// 5. TEST PROMPT
"I've implemented [feature]. Please test:
 - [Scenario 1]
 - [Scenario 2]
 - [Edge case 3]

 Let me know if anything needs adjustment."
```

### When integrating features:

```typescript
// 1. REQUEST CONTRACTS
"To integrate [Feature A] with [Feature B], I need to read:
 - src/features/[feature-b]/[feature-b].contract.ts

 Please provide this file or confirm I should read it."

// 2. READ ONLY CONTRACT
[Read contract file, not full implementation]

// 3. IMPLEMENT INTEGRATION
[Use only the public API defined in contract]

// 4. DOCUMENT
"Integration complete. I've:
 - Used [Feature B]'s public API
 - Handled errors as specified
 - Added integration tests
 - Updated Feature A's INTEGRATION.md"
```

### When encountering errors:

```typescript
// 1. DIAGNOSE
"I see the error: [error message]
 This appears to be caused by [root cause]"

// 2. PROPOSE SOLUTION
"I can fix this by:
 Option 1: [approach 1] - [pros/cons]
 Option 2: [approach 2] - [pros/cons]

 Which approach do you prefer?"

// 3. IMPLEMENT FIX
[Apply chosen solution]

// 4. VERIFY
"Fix applied. Please verify:
 - [What should work now]
 - [What to test]"
```

---

## ⚠️ Common Pitfalls to Avoid

### 1. Over-Engineering

```typescript
// ❌ BAD: Over-abstracted for simple feature
abstract class BaseRepository<T> {
  abstract find(): Promise<T[]>;
  abstract findById(id: string): Promise<T>;
  // 20 more abstract methods...
}

// ✅ GOOD: Simple and direct
export const userRepository = {
  find: () => db.user.findMany(),
  findById: (id: string) => db.user.findUnique({ where: { id } }),
};
```

### 2. Premature Optimization

```typescript
// ❌ BAD: Optimizing before measuring
useMemo(() => items.filter((x) => x.active), [items]); // Unnecessary

// ✅ GOOD: Optimize when proven slow
// Profile first, optimize if needed
const filtered = items.filter((x) => x.active);
```

### 3. Missing Error Handling

```typescript
// ❌ BAD: Silent failure
const data = await fetch('/api/data').then((r) => r.json());

// ✅ GOOD: Explicit error handling
try {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to load data');
}
```

### 4. Tight Coupling

```typescript
// ❌ BAD: Direct dependency
import { AuthService } from '@/features/auth/services/auth.service';

// ✅ GOOD: Depend on contract
import { AuthContract } from '@/features/auth';

class OrderService {
  constructor(private auth: AuthContract) {}
}
```

### 5. Inconsistent Patterns

```typescript
// ❌ BAD: Mixed patterns
function Component1() { return <div /> } // Function declaration
const Component2 = () => <div />         // Arrow function
export default function Component3() {}  // Default export

// ✅ GOOD: Consistent pattern
export function Component1() { return <div /> }
export function Component2() { return <div /> }
export function Component3() { return <div /> }
```

---

## 📝 File Templates

### Contract Template

````typescript
// src/features/[feature]/[feature].contract.ts

/**
 * Public API for [feature] feature
 *
 * @example Basic usage
 * ```ts
 * const [feature] = container.resolve<[Feature]Contract>('[feature]')
 * await [feature].methodName(params)
 * ```
 *
 * @example Integration
 * ```ts
 * class MyService {
 *   constructor(private [feature]: [Feature]Contract) {}
 *
 *   async myMethod() {
 *     const result = await this.[feature].methodName()
 *   }
 * }
 * ```
 */
export interface [Feature]Contract {
  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   * @throws {ErrorType} When error occurs
   */
  methodName(param: Type): Promise<ReturnType>
}

/** @public */
export type [Feature]Result = {
  // type definition
}

/**
 * Events emitted by this feature
 */
export type [Feature]Events = {
  '[feature]:event-name': PayloadType
}
````

### Service Template

```typescript
// src/features/[feature]/services/[feature].service.ts

import { [Feature]Contract, [Feature]Result } from '../[feature].contract'

export class [Feature]Service implements [Feature]Contract {
  constructor(
    private dependency1: Dependency1Type,
    private dependency2: Dependency2Type
  ) {}

  async methodName(param: Type): Promise<ReturnType> {
    // Validate input
    const validation = validate(param)
    if (!validation.success) {
      throw new ValidationError(validation.errors)
    }

    // Business logic
    try {
      const result = await this.performOperation(param)
      return result
    } catch (error) {
      // Handle errors
      throw new [Feature]Error('Operation failed', error)
    }
  }

  private async performOperation(param: Type) {
    // Implementation details
  }
}

// Export singleton instance
export const [feature]Service = new [Feature]Service(
  dependency1,
  dependency2
)
```

### Test Template

```typescript
// src/features/[feature]/services/[feature].service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { [Feature]Service } from './[feature].service'

describe('[Feature]Service', () => {
  let service: [Feature]Service
  let mockDependency: MockType

  beforeEach(() => {
    mockDependency = {
      method: vi.fn()
    }
    service = new [Feature]Service(mockDependency)
  })

  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Arrange
      const input = { /* test data */ }
      mockDependency.method.mockResolvedValue({ /* mock response */ })

      // Act
      const result = await service.methodName(input)

      // Assert
      expect(result).toEqual({ /* expected output */ })
      expect(mockDependency.method).toHaveBeenCalledWith(/* expected args */)
    })

    it('should handle validation error', async () => {
      // Arrange
      const invalidInput = { /* invalid data */ }

      // Act & Assert
      await expect(service.methodName(invalidInput))
        .rejects.toThrow('Validation error message')
    })

    it('should handle edge case', async () => {
      // Test edge cases (null, undefined, empty, max values, etc)
    })
  })
})
```

---

## 🎯 Success Criteria

Before marking a feature as "complete", verify:

### Code Quality

- [ ] Follows architecture patterns in this guide
- [ ] Has comprehensive error handling
- [ ] Uses TypeScript properly (no `any` types)
- [ ] Follows naming conventions
- [ ] Has JSDoc comments on public APIs

### Testing

- [ ] Unit tests for business logic (>80% coverage)
- [ ] Integration tests for feature interactions
- [ ] E2E tests for critical flows (if applicable)
- [ ] All tests pass (`npm test`)

### Documentation

- [ ] Contract file created (if reusable feature)
- [ ] Public API documented with examples
- [ ] Integration patterns documented
- [ ] INTEGRATION.md updated (if needed)

### Integration

- [ ] Only exports public API through index.ts
- [ ] Depends on other features via contracts only
- [ ] No circular dependencies
- [ ] Works with existing features without breaking them

---

## 🔄 Continuous Improvement

### After each feature:

1. **Reflect:** What went well? What could be better?
2. **Update:** If you discovered better patterns, update this guide
3. **Share:** Document learnings in ADRs or team docs

### Red flags to watch for:

- ⚠️ Features taking >2 days to implement (scope too large)
- ⚠️ Tests consistently failing (architecture issues)
- ⚠️ Repeated debugging of same issues (missing patterns)
- ⚠️ Difficulty integrating features (contracts not clear)

---

## 📞 Getting Help

### When stuck:

1. **Clarify the requirement:** Re-read the task, ask questions
2. **Check contracts:** Read relevant feature contracts
3. **Review similar code:** Look for patterns in existing features
4. **Propose solution:** Don't guess - propose and get feedback

### Communication:

- Be explicit about uncertainties
- Propose multiple solutions when unclear
- Ask for feedback early and often
- Document decisions for future reference

---

## ✅ Final Checklist

Before considering any task complete:

```markdown
- [ ] Architecture approved before implementation
- [ ] Code follows all patterns in this guide
- [ ] Types/schemas defined first
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Contract created (if needed)
- [ ] Public API documented
- [ ] Integration tested
- [ ] No console.errors in production code
- [ ] User prompted to test functionality
```

---

**Remember:** Quality > Speed. It's better to build it right than build it fast and fix it later.

**This guide is your contract.** Follow it consistently, and you'll build maintainable, testable, robust applications every time.
