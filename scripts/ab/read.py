#!/usr/bin/env python3
"""Read a two-arm A/B on a binomial metric with GrowthBook's stats engine.

gbstats (MIT, growthbook/growthbook packages/stats) does the statistics; this
file only turns per-arm counts into its ProportionStatistic inputs and prints
what its own test classes return. No formula here is hand-rolled.

    python3 -I scripts/ab/read.py --control list --arm list:14:3 --arm direct:17:6
    python3 -I scripts/ab/read.py --json '{"test":"companyDirectOpen","metric":"first_solve_10m",
        "control":"list","arms":[{"arm":"list","users":14,"conversions":3},
                                 {"arm":"direct","users":17,"conversions":6}]}'
    echo '<same json>' | python3 -I scripts/ab/read.py            # JSON on stdin
    ... --format json                                              # machine output

For every non-control arm it prints, against control:
  - each arm's rate (conversions / users);
  - Bayesian (EffectBayesianABTest, GrowthBook's default flat prior):
    chance to beat control, relative uplift with its 95% credible interval,
    and the absolute difference in points with its 95% credible interval;
  - frequentist (TwoSidedTTest, Welch): p-value and the 95% CI of the
    relative uplift.

The ledger's pre-registered rule still decides a claim. These numbers inform
the read (docs/agent/metrics.md, "Reading an A/B with gbstats"); they never
replace a claim's falsification rule. Under SMALL_N people in an arm the line
is marked directional: the engine's normal approximation is weak there.

Install (never into the system site-packages):
    uv venv --python 3.11 <scratchpad>/gbvenv
    VIRTUAL_ENV=<scratchpad>/gbvenv uv pip install -r scripts/ab/requirements.txt
    <scratchpad>/gbvenv/bin/python -I scripts/ab/read.py ...
"""

import argparse
import json
import math
import sys
import warnings

SMALL_N = 15  # the ledger's "fewer than 15 per arm = directional" line


class InputError(ValueError):
    pass


def parse_arm_spec(spec):
    """'name:users:conversions' -> dict."""
    parts = spec.split(":")
    if len(parts) != 3 or not parts[0]:
        raise InputError(f"--arm wants name:users:conversions, got {spec!r}")
    try:
        users, conv = int(parts[1]), int(parts[2])
    except ValueError:
        raise InputError(f"--arm counts must be whole numbers, got {spec!r}")
    return {"arm": parts[0], "users": users, "conversions": conv}


def validate(payload):
    """Check the counts and put control first. Returns a normalised copy."""
    arms = payload.get("arms")
    if not isinstance(arms, list) or len(arms) < 2:
        raise InputError("need at least two arms")
    seen = set()
    clean = []
    for a in arms:
        name = str(a.get("arm", "")).strip()
        if not name:
            raise InputError("an arm has no name")
        if name in seen:
            raise InputError(f"arm {name!r} appears twice")
        seen.add(name)
        try:
            users, conv = int(a["users"]), int(a["conversions"])
        except (KeyError, TypeError, ValueError):
            raise InputError(f"arm {name!r} needs whole-number users and conversions")
        if users < 0 or conv < 0:
            raise InputError(f"arm {name!r} has a negative count")
        if conv > users:
            raise InputError(f"arm {name!r} has more conversions ({conv}) than users ({users})")
        clean.append({"arm": name, "users": users, "conversions": conv})
    control = payload.get("control") or clean[0]["arm"]
    if control not in seen:
        raise InputError(f"control arm {control!r} is not among the arms {sorted(seen)}")
    clean.sort(key=lambda a: a["arm"] != control)  # control first, order kept otherwise
    out = dict(payload)
    out["arms"] = clean
    out["control"] = control
    return out


def _num(x):
    """A finite float, or None (gbstats returns zeros/NaN when it declines)."""
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def compare(control, variant, alpha=0.05):
    """Run gbstats' own Bayesian and frequentist tests on two arms."""
    from gbstats.models.statistics import ProportionStatistic
    from gbstats.bayesian.tests import EffectBayesianABTest, EffectBayesianConfig
    from gbstats.frequentist.tests import TwoSidedTTest, FrequentistConfig

    a = ProportionStatistic(n=control["users"], sum=control["conversions"])
    b = ProportionStatistic(n=variant["users"], sum=variant["conversions"])

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        rel = EffectBayesianABTest(a, b, EffectBayesianConfig(alpha=alpha, difference_type="relative")).compute_result()
        ab = EffectBayesianABTest(a, b, EffectBayesianConfig(alpha=alpha, difference_type="absolute")).compute_result()
        fq = TwoSidedTTest(a, b, FrequentistConfig(alpha=alpha, difference_type="relative")).compute_result()

    return {
        "arm": variant["arm"],
        "bayes": {
            "chance_to_beat_control": None if ab.error_message else _num(ab.chance_to_win),
            "abs_diff_pts": None if ab.error_message else _num(ab.expected * 100),
            "abs_ci_pts": None if ab.error_message else [_num(v * 100) for v in ab.ci],
            "rel_uplift": None if rel.error_message else _num(rel.expected),
            "rel_ci": None if rel.error_message else [_num(v) for v in rel.ci],
            "error": ab.error_message or rel.error_message,
        },
        "frequentist": {
            "p_value": None if fq.error_message else _num(fq.p_value),
            "rel_uplift": None if fq.error_message else _num(fq.expected),
            "rel_ci": None if fq.error_message else [_num(v) for v in fq.ci],
            "error": fq.error_message,
        },
    }


def analyse(payload, alpha=0.05):
    import gbstats  # noqa: F401  (fail early with a clear message if missing)
    from importlib.metadata import version

    p = validate(payload)
    arms = p["arms"]
    for a in arms:
        a["rate"] = a["conversions"] / a["users"] if a["users"] else None
    control = arms[0]
    result = {
        "test": p.get("test"),
        "metric": p.get("metric"),
        "window": p.get("window"),
        "engine": f"gbstats {version('gbstats')}",
        "alpha": alpha,
        "control": control["arm"],
        "arms": arms,
        "comparisons": [compare(control, v, alpha) for v in arms[1:]],
        "small_sample": any(a["users"] < SMALL_N for a in arms),
    }
    return result


def _pct(x, signed=False):
    if x is None:
        return "n/a"
    return f"{x * 100:+.1f}%" if signed else f"{x * 100:.1f}%"


def _pts(x):
    return "n/a" if x is None else f"{x:+.1f} pts"


def _ci(lo_hi, fmt):
    if not lo_hi or any(v is None for v in lo_hi):
        return "n/a"
    return f"[{fmt(lo_hi[0])}, {fmt(lo_hi[1])}]"


def render(r):
    lines = []
    head = " · ".join(x for x in [r.get("test"), r.get("metric"), r.get("window")] if x)
    lines.append(f"{head + ' · ' if head else ''}{r['engine']}")
    lines.append(f"{'arm':<12}{'users':>7}{'conv':>7}{'rate':>9}")
    for a in r["arms"]:
        tag = "  (control)" if a["arm"] == r["control"] else ""
        lines.append(f"{a['arm']:<12}{a['users']:>7}{a['conversions']:>7}{_pct(a['rate']):>9}{tag}")
    ci_pct = int(round((1 - r["alpha"]) * 100))
    for c in r["comparisons"]:
        b, f = c["bayes"], c["frequentist"]
        lines.append(f"{c['arm']} vs {r['control']}:")
        if b["error"]:
            lines.append(f"  Bayesian: gbstats declined: {b['error']}")
        else:
            lines.append(f"  Bayesian (EffectBayesianABTest, flat prior): chance to beat control {_pct(b['chance_to_beat_control'])}")
            lines.append(f"    absolute {_pts(b['abs_diff_pts'])}, {ci_pct}% credible interval {_ci(b['abs_ci_pts'], _pts)}")
            lines.append(f"    relative {_pct(b['rel_uplift'], True)}, {ci_pct}% credible interval {_ci(b['rel_ci'], lambda v: _pct(v, True))}")
        if f["error"]:
            lines.append(f"  Frequentist: gbstats declined: {f['error']}")
        else:
            lines.append(f"  Frequentist (TwoSidedTTest, Welch): p = {f['p_value']:.3f}, relative {_pct(f['rel_uplift'], True)}, {ci_pct}% CI {_ci(f['rel_ci'], lambda v: _pct(v, True))}")
    if r["small_sample"]:
        lines.append(f"note: an arm has fewer than {SMALL_N} people — directional only. The ledger's pre-registered rule decides.")
    else:
        lines.append("note: the ledger's pre-registered rule decides; these numbers inform it.")
    return "\n".join(lines)


def build_parser():
    ap = argparse.ArgumentParser(description="Two-arm binomial A/B read with gbstats.")
    ap.add_argument("--json", help="payload JSON: {test?, metric?, window?, control?, arms:[{arm, users, conversions}]}")
    ap.add_argument("--arm", action="append", default=[], help="name:users:conversions (repeat)")
    ap.add_argument("--control", help="control arm name (default: the first arm)")
    ap.add_argument("--test", help="test id, for the header")
    ap.add_argument("--metric", help="metric name, for the header")
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--format", choices=["text", "json"], default="text")
    return ap


def payload_from_args(args, stdin_text=None):
    if args.json and args.arm:
        raise InputError("give --json or --arm, not both")
    if args.json:
        payload = json.loads(args.json)
    elif args.arm:
        payload = {"arms": [parse_arm_spec(s) for s in args.arm]}
    elif stdin_text and stdin_text.strip():
        payload = json.loads(stdin_text)
    else:
        raise InputError("no counts: pass --arm name:users:conversions (twice or more), --json, or JSON on stdin")
    for key in ("control", "test", "metric"):
        if getattr(args, key):
            payload[key] = getattr(args, key)
    return payload


def main(argv=None):
    args = build_parser().parse_args(argv)
    stdin_text = None
    if not args.json and not args.arm and not sys.stdin.isatty():
        stdin_text = sys.stdin.read()
    try:
        payload = payload_from_args(args, stdin_text)
        result = analyse(payload, alpha=args.alpha)
    except (InputError, json.JSONDecodeError) as e:
        print(f"read.py: {e}", file=sys.stderr)
        return 2
    except ModuleNotFoundError as e:
        print(f"read.py: {e}. Install scripts/ab/requirements.txt into a venv (see the header).", file=sys.stderr)
        return 3
    print(json.dumps(result, indent=2) if args.format == "json" else render(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
