# Smart Contract Specification

> Technical reference for the Stellar Tipz Soroban smart contract.

---

## Overview

The Tipz contract manages creator profiles, XLM tipping, withdrawal accounting,
credit scoring, and leaderboard state directly on Soroban.

**Language**: Rust (Soroban SDK)  
**Network target**: Stellar Testnet -> Mainnet

---

## Data Structures

### Profile

```rust
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Profile {
    pub owner: Address,            // Stellar address of the creator
    pub username: String,          // Unique username (3-32 chars, lowercase)
    pub display_name: String,      // Display name (1-64 chars)
    pub bio: String,               // Bio (0-280 chars)
    pub image_url: String,         // Profile image URL or IPFS CID
    pub x_handle: String,          // X handle
    pub x_followers: u32,          // X follower count
    pub x_engagement_avg: u32,     // Average X engagement per post
    pub credit_score: u32,         // Current credit score (0-100)
    pub total_tips_received: i128, // Lifetime tips received in stroops
    pub total_tips_count: u32,     // Number of tips received
    pub balance: i128,             // Current withdrawable balance in stroops
    pub registered_at: u64,        // Ledger timestamp of registration
    pub updated_at: u64,           // Last profile update timestamp
}
```

### Tip

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct Tip {
    pub id: u32,          // Global tip id
    pub tipper: Address,  // Sender address
    pub creator: Address, // Recipient address
    pub amount: i128,     // Tip amount in stroops
    pub message: String,  // Optional message
    pub timestamp: u64,   // Ledger timestamp
}
```

### LeaderboardEntry

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct LeaderboardEntry {
    pub address: Address,
    pub username: String,
    pub total_tips_received: i128,
    pub credit_score: u32,
}
```

### ContractStats

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractStats {
    pub total_creators: u32,
    pub total_tips_count: u32,
    pub total_tips_volume: i128,
    pub total_fees_collected: i128,
    pub fee_bps: u32,
}
```

### ContractConfig

```rust
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct ContractConfig {
    pub admin: Address,
    pub fee_collector: Address,
    pub fee_bps: u32,
    pub native_token: Address,
    pub total_creators: u32,
    pub total_tips_count: u32,
    pub total_tips_volume: i128,
    pub total_fees_collected: i128,
    pub is_initialized: bool,
    pub version: u32,
}
```

### DataKey (Storage Keys)

The current contract defines **21 `DataKey` variants** across Soroban's
`instance`, `persistent`, and `temporary` storage tiers.

| DataKey                     | Storage tier | Stored value            | Purpose                                                          |
| --------------------------- | ------------ | ----------------------- | ---------------------------------------------------------------- |
| `Admin`                     | Instance     | `Address`               | Current contract admin                                           |
| `FeePercent`                | Instance     | `u32`                   | Withdrawal fee in basis points                                   |
| `FeeCollector`              | Instance     | `Address`               | Address that receives protocol fees                              |
| `ContractVersion`           | Instance     | `u32`                   | On-chain interface version written at init and bumped on upgrade |
| `TotalFeesCollected`        | Instance     | `i128`                  | Lifetime protocol fees collected                                 |
| `Profile(Address)`          | Persistent   | `Profile`               | Creator profile keyed by owner address                           |
| `UsernameToAddress(String)` | Persistent   | `Address`               | Reverse lookup from username to creator address                  |
| `TipCount`                  | Instance     | `u32`                   | Global monotonic tip counter                                     |
| `Tip(u32)`                  | Temporary    | `Tip`                   | Individual tip record by global tip id                           |
| `Leaderboard`               | Instance     | `Vec<LeaderboardEntry>` | Cached top-creators leaderboard                                  |
| `TotalCreators`             | Instance     | `u32`                   | Total registered creators                                        |
| `TotalTipsVolume`           | Instance     | `i128`                  | Lifetime tip volume                                              |
| `Initialized`               | Instance     | `bool`                  | One-time initialization guard                                    |
| `NativeToken`               | Instance     | `Address`               | Native XLM SAC address used for transfers                        |
| `Paused`                    | Instance     | `bool`                  | Emergency pause flag                                             |
| `MinTipAmount`              | Instance     | `i128`                  | Minimum allowed tip amount in stroops                            |
| `TipperTipCount(Address)`   | Temporary    | `u32`                   | Number of tips sent by a specific tipper                         |
| `TipperTip(Address, u32)`   | Temporary    | `u32`                   | Reverse index from `(tipper, local_index)` to global tip id      |
| `CreatorTipCount(Address)`  | Temporary    | `u32`                   | Number of tips received by a specific creator                    |
| `CreatorTip(Address, u32)`  | Temporary    | `u32`                   | Reverse index from `(creator, local_index)` to global tip id     |
| `PendingAdmin`              | Instance     | `Address`               | Proposed admin during the two-step admin transfer flow           |

---

## Public Functions

### Initialization

#### `initialize(admin: Address, fee_collector: Address, fee_bps: u32, native_token: Address)`

Initializes the contract. This can only be called once.

| Parameter       | Type      | Description                                   |
| --------------- | --------- | --------------------------------------------- |
| `admin`         | `Address` | Admin address                                 |
| `fee_collector` | `Address` | Address that receives withdrawal fees         |
| `fee_bps`       | `u32`     | Fee in basis points                           |
| `native_token`  | `Address` | Stellar Asset Contract address for native XLM |

**Errors**: `AlreadyInitialized`, `InvalidFee`

### Profile Management

#### `register_profile(caller, username, display_name, bio, image_url, x_handle) -> Profile`

Registers a new creator profile.

#### `update_profile(caller, display_name, bio, image_url, x_handle)`

Updates an existing creator profile.

#### `deregister_profile(caller)`

Removes a creator profile. Caller must be registered, have zero balance, and
the contract must not be paused.

#### `get_profile(address) -> Profile`

Returns a profile by owner address.

#### `get_profile_by_username(username) -> Profile`

Returns a profile by username.

### Tipping

#### `send_tip(tipper, creator, amount, message)`

Transfers native XLM from the tipper to the contract, credits the creator,
stores a temporary tip record, updates counters, and refreshes leaderboard
state.

#### `withdraw_tips(caller, amount)`

Withdraws part or all of the creator's balance. The contract computes the fee
as `amount * fee_bps / 10000`, transfers the net payout to the creator, and
sends the fee to the fee collector.

#### `get_tip(tip_id) -> Tip`

Fetches one tip record by global tip id.

#### `get_recent_tips(creator, limit, offset) -> Vec<Tip>`

Fetches recent tips for a creator, newest first, skipping expired temporary
entries.

#### `get_tips_by_tipper(tipper, limit) -> Vec<Tip>`

Fetches recent tips sent by a specific tipper.

#### `get_creator_tip_count(creator) -> u32`

Returns how many tips a creator has received.

#### `get_tipper_tip_count(tipper) -> u32`

Returns how many tips a tipper has sent.

### Credit and Leaderboard

#### `get_credit_tier(address) -> CreditTier`

Returns the creator's current credit tier derived from their on-chain score.

#### `get_credit_breakdown(address) -> CreditBreakdown`

Returns the component-level breakdown of the creator's score.

#### `get_leaderboard(limit) -> Vec<LeaderboardEntry>`

Returns the top creators by total tips received.

### Admin and Config

#### `get_stats() -> ContractStats`

Returns aggregate platform statistics.

#### `get_config() -> ContractConfig`

Returns the full contract configuration, including admin and native token.

#### `set_fee(caller, fee_bps)`

Updates the withdrawal fee. Admin-only.

#### `set_fee_collector(caller, new_collector)`

Updates the fee collector. Admin-only.

#### `set_admin(caller, new_admin)`

Immediate admin transfer. Admin-only.

#### `propose_admin(caller, new_admin)`

Starts a two-step admin transfer. Admin-only.

#### `accept_admin(caller)`

Accepts a pending admin transfer. Callable only by the pending admin.

#### `cancel_admin_proposal(caller)`

Cancels the pending admin transfer. Admin-only.

#### `pause_contract(caller)` / `unpause_contract(caller)`

Toggles the emergency pause flag. Admin-only.

#### `set_min_tip_amount(caller, amount)` / `get_min_tip_amount() -> i128`

Updates or reads the minimum allowed tip amount.

#### `update_x_metrics(caller, creator, x_followers, x_engagement_avg)`

Updates creator X metrics. Admin-only.

#### `batch_update_x_metrics(caller, updates) -> Vec<BatchSkip>`

Batch updates X metrics for multiple creators. Admin-only.

#### `batch_update_x_metrics_preview(caller, updates) -> Vec<BatchSkip>`

Dry-run preview for batch X metric updates. Admin-only.

---

## Storage Layout

| Key                                | Type                    | Tier / TTL behavior                             |
| ---------------------------------- | ----------------------- | ----------------------------------------------- |
| `DataKey::Admin`                   | `Address`               | Instance, bumped with contract writes           |
| `DataKey::FeePercent`              | `u32`                   | Instance, bumped with contract writes           |
| `DataKey::FeeCollector`            | `Address`               | Instance, bumped with contract writes           |
| `DataKey::ContractVersion`         | `u32`                   | Instance, bumped with contract writes           |
| `DataKey::TotalFeesCollected`      | `i128`                  | Instance, bumped with contract writes           |
| `DataKey::Profile(addr)`           | `Profile`               | Persistent, refreshed on profile activity       |
| `DataKey::UsernameToAddress(name)` | `Address`               | Persistent, refreshed alongside `Profile(addr)` |
| `DataKey::TipCount`                | `u32`                   | Instance, bumped with contract writes           |
| `DataKey::Tip(index)`              | `Tip`                   | Temporary, approximately 7-day TTL              |
| `DataKey::Leaderboard`             | `Vec<LeaderboardEntry>` | Instance, bumped with contract writes           |
| `DataKey::TotalCreators`           | `u32`                   | Instance, bumped with contract writes           |
| `DataKey::TotalTipsVolume`         | `i128`                  | Instance, bumped with contract writes           |
| `DataKey::Initialized`             | `bool`                  | Instance, bumped with contract writes           |
| `DataKey::NativeToken`             | `Address`               | Instance, bumped with contract writes           |
| `DataKey::Paused`                  | `bool`                  | Instance, bumped with contract writes           |
| `DataKey::MinTipAmount`            | `i128`                  | Instance, bumped with contract writes           |
| `DataKey::TipperTipCount(addr)`    | `u32`                   | Temporary, follows tip index TTL                |
| `DataKey::TipperTip(addr, idx)`    | `u32`                   | Temporary, follows tip index TTL                |
| `DataKey::CreatorTipCount(addr)`   | `u32`                   | Temporary, follows tip index TTL                |
| `DataKey::CreatorTip(addr, idx)`   | `u32`                   | Temporary, follows tip index TTL                |
| `DataKey::PendingAdmin`            | `Address`               | Instance, bumped with contract writes           |

> Contract-wide config and counters live in `instance()` storage, profile
> records live in `persistent()` storage, and tip history plus reverse tip
> indexes live in `temporary()` storage.
