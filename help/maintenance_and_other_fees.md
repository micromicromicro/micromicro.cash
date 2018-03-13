<!-- Maintenance and Other Fees -->
micromicro takes a certain amount of money to run, for processing, data storage, network transfer, code updates, miscellaneous business costs, etc.  To cover these costs accounts are charged periodic maintenance fees and many operations also have a small surcharge.

In most cases the fee reflects the cost of whatever it's applied to - for example, if 80% of our monthly costs come from processing and storing transactions, the sum of money we collect from transaction surcharges should roughly cover that 80%.

# Dynamic pricing

Actually, we have a system that monitors our usage and costs in real time and adjusts the fees to match projected costs.

To prevent it from going out of control we've set a hard upper limit on each of the fees - currently the cost of a fast (immediately accounted) transaction, the largest fee, will not go above $0.01 USD.

Starting out, we're still losing money but if our calculations are at all reasonable we should be able to cover our costs through collected fees alone, and if the service grows enough we may even be able to reduce fees by an order of magnitude.

Expect a visualization of the fee calculations in the near future.

# Table of fees

Here's a list of fees and how they're applied.  For the current values, check out the table on the [front page](/index.html).

Fee | Description
--- | ---
Account maintenance | This is periodically deducted from each account and out address.  New accounts have a grace period where no maintenance fee is applied, to give users a chance to deposit money.
Fast receive | This is deducted from the amount sent before changing the receiver's balance. This is applied to transactions that are accounted immediately.
Slow receive | This is deducted from the amount sent before changing the receiver's balance. This is applied to transactions that have deferred accounting.
Create receive address | This is charged to the receiver's balance when they create a new receive address.
Receive address maintenance | This is the same as the address creation fee; it's charged periodically to the receiver for each receive address that exists at the time of application.

If an account or out address doesn't have enough balance to cover the maintenance fee it will be deleted.