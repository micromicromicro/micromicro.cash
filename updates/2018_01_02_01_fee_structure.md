<!-- 2018-01-02T12:31:55.725308+00:00 Micromicro Fee Structure -->
A number of actions in Micromicro have a small fee.  In most cases the fee mirrors the storage and processing costs of the action.  The cost of some actions small enough that I haven't implemented a fee and instead those costs are rolled into the actions with fees.

Similarly, there are maintenance fees for things that are stored on our servers.  These fees are applied periodically to the associated account.

The fees are calculated regularly based on cost reports and usage.  Without low fees this wouldn't be much of a microtransaction service, so there's a fee limit - the cost of a fast transaction will not go above $0.01 USD.  It's possible that this number will be revised in the future, but without intervention the fees are expected to drop significantly if regular usage increases.

# Table of fees

Fee | Context | Description
--- | --- | ---
Account maintenance | *Periodic* | The account maintenance fee.
Fast receive | *Action* | This is deducted from the amount sent before changing the receiver's balance.
Slow receive | *Action* | This is deducted from the amount sent before changing the receiver's balance.
Create receive address | *Action* | This is charged to the receiver when they create a new receive address.
Receive address maintenance | *Periodic* | This is the same as the address creation fee; it's charged periodically to the receiver.

View the [front page](index.html) for the most up to date fees.
