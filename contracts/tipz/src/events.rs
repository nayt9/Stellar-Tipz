//! Contract event definitions for the Tipz contract.
//!
//! All events are published via `env.events().publish()`.
//!
//! Events:
//! - ProfileRegistered(address, username)
//! - ProfileUpdated(address)
//! - TipSent(from, to, amount)
//! - TipsWithdrawn(address, amount, fee)
//! - CreditScoreUpdated(address, old_score, new_score)
//! - XMetricsBatchSkipped(creator) — batch update skipped unregistered address
//! - AdminChanged(old_admin, new_admin)
//! - FeeUpdated(old_fee, new_fee)

use soroban_sdk::{symbol_short, Address, Env, String};

/// Emit a `ProfileRegistered` event containing the creator's address and username.
///
/// Topic: ("profile", "registered")
pub fn emit_profile_registered(env: &Env, address: &Address, username: &String) {
    env.events().publish(
        (symbol_short!("profile"), symbol_short!("register")),
        (address.clone(), username.clone()),
    );
}

/// Emit a `ProfileUpdated` event when a profile is modified.
///
/// Topic: ("profile", "updated")
#[allow(dead_code)]
pub fn emit_profile_updated(env: &Env, address: &Address) {
    env.events().publish(
        (symbol_short!("profile"), symbol_short!("updated")),
        address.clone(),
    );
}

/// Emit a `TipSent` event when a tip is successfully sent.
///
/// Topic: ("tip", "sent")
pub fn emit_tip_sent(env: &Env, from: &Address, to: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("tip"), symbol_short!("sent")),
        (from, to, amount),
    );
}

/// Emit a `TipsWithdrawn` event when a creator withdraws their tips.
///
/// Topic: ("tip", "withdrawn")
#[allow(dead_code)]
pub fn emit_tips_withdrawn(env: &Env, address: &Address, amount: i128, fee: i128) {
    env.events().publish(
        (symbol_short!("tip"), symbol_short!("withdrawn")),
        (address.clone(), amount, fee),
    );
}

/// Emit a `CreditScoreUpdated` event when a creator's credit score changes.
///
/// Topic: ("credit", "updated")
pub fn emit_credit_score_updated(env: &Env, address: &Address, old_score: u32, new_score: u32) {
    env.events().publish(
        (symbol_short!("credit"), symbol_short!("updated")),
        (address.clone(), old_score, new_score),
    );
}

/// Emitted when a batch X metrics update skips a creator who is not registered.
pub fn emit_x_metrics_batch_skipped(env: &Env, creator: &Address) {
    env.events().publish(
        (symbol_short!("xbatch"), symbol_short!("skipped")),
        creator.clone(),
    );
}

/// Emit an `AdminChanged` event when the admin role is transferred.
///
/// Topic: ("admin", "changed")
#[allow(dead_code)]
pub fn emit_admin_changed(env: &Env, old_admin: &Address, new_admin: &Address) {
    env.events().publish(
        (symbol_short!("admin"), symbol_short!("changed")),
        (old_admin.clone(), new_admin.clone()),
    );
}

/// Emit a `FeeUpdated` event when the withdrawal fee is changed.
///
/// Topic: ("fee", "updated")
#[allow(dead_code)]
pub fn emit_fee_updated(env: &Env, old_bps: u32, new_bps: u32) {
    env.events().publish(
        (symbol_short!("fee"), symbol_short!("updated")),
        (old_bps, new_bps),
    );
}
