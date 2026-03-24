//! Tests for tip record storage with temporary TTL (issue #10).
//!
//! All storage calls must run inside `env.as_contract()` because the Soroban
//! SDK enforces contract-context isolation in tests.
//!
//! Test cases:
//! - Sequential tip ID assignment
//! - Correct field values on stored tips
//! - `get_tip` returns `None` for missing / expired entries
//! - `get_recent_tips` returns only the target creator's tips
//! - `get_recent_tips` returns entries newest-first
//! - `get_recent_tips` respects the `count` limit
//! - `get_recent_tips` returns an empty list when there are no tips
//! - TTL expiry: entries are evicted after `TIP_TTL_LEDGERS` ledgers
//! - `get_recent_tips` silently skips expired entries

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{
    tips::{get_recent_tips, get_tip, store_tip, TIP_TTL_LEDGERS},
    TipzContract,
};

// ── helpers ───────────────────────────────────────────────────────────────────

fn make_string(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

/// Register a fresh contract instance and return its ID.
fn register(env: &Env) -> soroban_sdk::Address {
    env.register_contract(None, TipzContract)
}

/// Advance the ledger sequence and timestamp without changing other fields.
fn advance_ledger(env: &Env, delta: u32) {
    use soroban_sdk::testutils::Ledger as _;
    env.ledger().with_mut(|info| {
        info.sequence_number += delta;
        info.timestamp += delta as u64 * 5; // 5 s per ledger
    });
}

// ── store_tip / get_tip ───────────────────────────────────────────────────────

#[test]
fn store_tip_assigns_sequential_ids() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);
    let msg = make_string(&env, "great content!");

    let (id0, id1, id2) = env.as_contract(&contract_id, || {
        let i0 = store_tip(&env, &tipper, &creator, 1_000_000, msg.clone());
        let i1 = store_tip(&env, &tipper, &creator, 2_000_000, msg.clone());
        let i2 = store_tip(&env, &tipper, &creator, 3_000_000, msg.clone());
        (i0, i1, i2)
    });

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn get_tip_returns_correct_fields() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);
    let amount = 5_000_000_i128;
    let msg = make_string(&env, "love your work");

    env.as_contract(&contract_id, || {
        let tip_id = store_tip(&env, &tipper, &creator, amount, msg.clone());
        let tip = get_tip(&env, tip_id).expect("tip should be present");

        assert_eq!(tip.id, tip_id);
        assert_eq!(tip.tipper, tipper);
        assert_eq!(tip.creator, creator);
        assert_eq!(tip.amount, amount);
        assert_eq!(tip.message, msg);
    });
}

#[test]
fn get_tip_returns_none_for_nonexistent_id() {
    let env = Env::default();
    let contract_id = register(&env);

    env.as_contract(&contract_id, || {
        assert!(get_tip(&env, 0).is_none());
        assert!(get_tip(&env, 9999).is_none());
    });
}

// ── TTL expiry ────────────────────────────────────────────────────────────────

#[test]
fn get_tip_returns_none_after_ttl_expires() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);

    let tip_id = env.as_contract(&contract_id, || {
        store_tip(
            &env,
            &tipper,
            &creator,
            1_000_000,
            make_string(&env, "hello"),
        )
    });

    // Entry should still be present before expiry.
    env.as_contract(&contract_id, || {
        assert!(get_tip(&env, tip_id).is_some());

        // Extend the contract instance TTL so the instance survives the
        // ledger advance below (instance TTL is independent of temp TTL).
        env.storage()
            .instance()
            .extend_ttl(TIP_TTL_LEDGERS + 10, TIP_TTL_LEDGERS + 10);
    });

    // Advance past the TTL.
    advance_ledger(&env, TIP_TTL_LEDGERS + 1);

    env.as_contract(&contract_id, || {
        assert!(
            get_tip(&env, tip_id).is_none(),
            "tip should be evicted after TTL expires"
        );
    });
}

// ── get_recent_tips ───────────────────────────────────────────────────────────

#[test]
fn get_recent_tips_returns_empty_when_no_tips_exist() {
    let env = Env::default();
    let contract_id = register(&env);
    let creator = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let tips = get_recent_tips(&env, &creator, 10);
        assert_eq!(tips.len(), 0);
    });
}

#[test]
fn get_recent_tips_returns_only_target_creator_tips() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator_a = Address::generate(&env);
    let creator_b = Address::generate(&env);

    env.as_contract(&contract_id, || {
        store_tip(
            &env,
            &tipper,
            &creator_a,
            1_000_000,
            make_string(&env, "a1"),
        );
        store_tip(
            &env,
            &tipper,
            &creator_b,
            2_000_000,
            make_string(&env, "b1"),
        );
        store_tip(
            &env,
            &tipper,
            &creator_a,
            3_000_000,
            make_string(&env, "a2"),
        );
        store_tip(
            &env,
            &tipper,
            &creator_b,
            4_000_000,
            make_string(&env, "b2"),
        );

        let tips_a = get_recent_tips(&env, &creator_a, 10);
        assert_eq!(tips_a.len(), 2);
        for tip in tips_a.iter() {
            assert_eq!(tip.creator, creator_a);
        }

        let tips_b = get_recent_tips(&env, &creator_b, 10);
        assert_eq!(tips_b.len(), 2);
        for tip in tips_b.iter() {
            assert_eq!(tip.creator, creator_b);
        }
    });
}

#[test]
fn get_recent_tips_returns_newest_first() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let id0 = store_tip(
            &env,
            &tipper,
            &creator,
            1_000_000,
            make_string(&env, "first"),
        );
        let id1 = store_tip(
            &env,
            &tipper,
            &creator,
            2_000_000,
            make_string(&env, "second"),
        );
        let id2 = store_tip(
            &env,
            &tipper,
            &creator,
            3_000_000,
            make_string(&env, "third"),
        );

        let tips = get_recent_tips(&env, &creator, 3);
        assert_eq!(tips.len(), 3);

        // Scan is backwards so highest ID comes first.
        assert_eq!(tips.get(0).unwrap().id, id2);
        assert_eq!(tips.get(1).unwrap().id, id1);
        assert_eq!(tips.get(2).unwrap().id, id0);
    });
}

#[test]
fn get_recent_tips_respects_count_limit() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&contract_id, || {
        for i in 0_u32..5 {
            store_tip(
                &env,
                &tipper,
                &creator,
                (i as i128 + 1) * 1_000_000,
                make_string(&env, "msg"),
            );
        }

        let tips = get_recent_tips(&env, &creator, 3);
        assert_eq!(tips.len(), 3);
    });
}

#[test]
fn get_recent_tips_skips_expired_entries() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);

    // Store two tips that will expire.
    env.as_contract(&contract_id, || {
        store_tip(
            &env,
            &tipper,
            &creator,
            1_000_000,
            make_string(&env, "old1"),
        );
        store_tip(
            &env,
            &tipper,
            &creator,
            2_000_000,
            make_string(&env, "old2"),
        );

        // Extend the contract instance TTL so the instance survives the
        // ledger advance below (instance TTL is independent of temp TTL).
        env.storage()
            .instance()
            .extend_ttl(TIP_TTL_LEDGERS + 10, TIP_TTL_LEDGERS + 10);
    });

    // Advance past TTL to evict the old tips.
    advance_ledger(&env, TIP_TTL_LEDGERS + 1);

    // Store two fresh tips after the expiry window.
    let (fresh_id0, fresh_id1) = env.as_contract(&contract_id, || {
        let i0 = store_tip(
            &env,
            &tipper,
            &creator,
            3_000_000,
            make_string(&env, "new1"),
        );
        let i1 = store_tip(
            &env,
            &tipper,
            &creator,
            4_000_000,
            make_string(&env, "new2"),
        );
        (i0, i1)
    });

    // Requesting 10 should return only the 2 fresh tips; the 2 expired ones
    // are silently skipped.
    env.as_contract(&contract_id, || {
        let tips = get_recent_tips(&env, &creator, 10);
        assert_eq!(tips.len(), 2);
        assert_eq!(tips.get(0).unwrap().id, fresh_id1);
        assert_eq!(tips.get(1).unwrap().id, fresh_id0);
    });
}

#[test]
fn get_recent_tips_returns_empty_for_unknown_creator() {
    let env = Env::default();
    let contract_id = register(&env);
    let tipper = Address::generate(&env);
    let creator = Address::generate(&env);
    let other = Address::generate(&env);

    env.as_contract(&contract_id, || {
        store_tip(&env, &tipper, &creator, 1_000_000, make_string(&env, "hi"));

        let tips = get_recent_tips(&env, &other, 10);
        assert_eq!(tips.len(), 0);
    });
}
