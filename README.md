UniformEX Real-Time Inventory app

## Order Lifecycle

Orders are stored in the  `orders` collection. Website intake should create orders through `createReceivedOrder` in `src/orderLifecycle.ts`, or write the same document shape:

```ts
{
	orderNumber: "27/01001/A",
	customerName: "Example Customer",
	school: "Example School",
	status: "Received",
	claimedBy: null,
	items: [{ skuId: "inventory-sku-id", quantity: 2, itemStatus: "pending" }]
}
```

Approval reserves matching `inventory` documents by `skuid` in a Firestore transaction. Orders with sufficient stock become `Ready to Pick`; otherwise they become `Awaiting Stock`. Claiming writes the authenticated user's UID to `claimedBy` and updates `order_claim_counters/{uid}` in the same transaction. The counter enforces a five-order claim limit. Completing an order releases the user's claim; unpicked reserved quantities are returned to inventory and the order moves to `Awaiting Stock`.

The current website order-intake source is not part of this repository. It must call the shared intake helper or create documents with this contract for new website orders to enter as `Received`. The current permissive Firestore rules also allow direct writes that bypass these client-side workflow checks; production deployments should enforce equivalent authorization in Firestore Security Rules or trusted server-side code.
