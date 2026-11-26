#!/usr/bin/env python3
"""Tests for scripts/ab/read.py. Run: python3 -I scripts/ab/test_read.py

Needs gbstats (scripts/ab/requirements.txt). CI runs it in the `ab-stats`
job with a pinned setup-python. Loads read.py by path, so -I (isolated mode,
no script dir on sys.path) still works.
"""

import importlib.util
import io
import json
import math
import os
import unittest
from contextlib import redirect_stderr, redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ab_read", os.path.join(HERE, "read.py"))
read = importlib.util.module_from_spec(spec)
spec.loader.exec_module(read)


def payload(control="list", arms=(("list", 14, 3), ("direct", 17, 6))):
    return {"control": control, "arms": [{"arm": a, "users": u, "conversions": c} for a, u, c in arms]}


class Validation(unittest.TestCase):
    def test_control_goes_first_whatever_the_input_order(self):
        p = read.validate(payload(control="list", arms=(("direct", 17, 6), ("list", 14, 3))))
        self.assertEqual([a["arm"] for a in p["arms"]], ["list", "direct"])

    def test_default_control_is_the_first_arm(self):
        p = read.validate({"arms": [{"arm": "x", "users": 4, "conversions": 1}, {"arm": "y", "users": 4, "conversions": 2}]})
        self.assertEqual(p["control"], "x")

    def test_rejects_bad_counts(self):
        for bad in (
            payload(arms=(("list", 3, 5), ("direct", 4, 1))),        # conversions > users
            payload(arms=(("list", -1, 0), ("direct", 4, 1))),       # negative
            payload(arms=(("list", 4, 1),)),                         # one arm
            payload(control="nope"),                                 # unknown control
            payload(arms=(("list", 4, 1), ("list", 5, 2))),          # duplicate arm
        ):
            with self.assertRaises(read.InputError):
                read.validate(bad)

    def test_arm_spec(self):
        self.assertEqual(read.parse_arm_spec("one:12:5"), {"arm": "one", "users": 12, "conversions": 5})
        for bad in ("one:12", "one:x:1", ":3:1"):
            with self.assertRaises(read.InputError):
                read.parse_arm_spec(bad)


class Engine(unittest.TestCase):
    def test_chance_to_beat_matches_the_normal_posterior(self):
        # 3/14 vs 6/17. gbstats' flat-prior absolute test is a normal
        # posterior on the difference: P(diff > 0) = Phi(d / sd).
        r = read.analyse(payload())
        c = r["comparisons"][0]
        pa, pb = 3 / 14, 6 / 17
        sd = math.sqrt(pa * (1 - pa) / 14 + pb * (1 - pb) / 17)
        expected = 0.5 * (1 + math.erf((pb - pa) / sd / math.sqrt(2)))
        self.assertEqual(c["arm"], "direct")
        self.assertAlmostEqual(c["bayes"]["chance_to_beat_control"], expected, places=6)
        self.assertAlmostEqual(c["bayes"]["abs_diff_pts"], (pb - pa) * 100, places=6)
        lo, hi = c["bayes"]["abs_ci_pts"]
        self.assertLess(lo, 0)
        self.assertGreater(hi, 0)
        self.assertAlmostEqual(c["bayes"]["rel_uplift"], pb / pa - 1, places=6)
        self.assertTrue(0 < c["frequentist"]["p_value"] < 1)
        self.assertTrue(r["small_sample"])

    def test_a_worse_variant_has_low_chance(self):
        r = read.analyse(payload(arms=(("list", 200, 80), ("direct", 200, 40))))
        c = r["comparisons"][0]
        self.assertLess(c["bayes"]["chance_to_beat_control"], 0.01)
        self.assertLess(c["frequentist"]["p_value"], 0.01)
        self.assertFalse(r["small_sample"])

    def test_engine_declines_a_zero_variance_arm(self):
        # 0/3 control: gbstats refuses rather than inventing a number.
        r = read.analyse(payload(control="control", arms=(("control", 3, 0), ("one", 2, 2))))
        c = r["comparisons"][0]
        self.assertIsNone(c["bayes"]["chance_to_beat_control"])
        self.assertTrue(c["bayes"]["error"])
        self.assertIsNone(c["frequentist"]["p_value"])
        text = read.render(r)
        self.assertIn("gbstats declined", text)
        self.assertIn("directional only", text)


class Cli(unittest.TestCase):
    def run_main(self, argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            rc = read.main(argv)
        return rc, out.getvalue(), err.getvalue()

    def test_arm_flags_print_text(self):
        rc, out, _ = self.run_main(["--control", "list", "--arm", "list:14:3", "--arm", "direct:17:6"])
        self.assertEqual(rc, 0)
        self.assertIn("chance to beat control 80.8%", out)
        self.assertIn("(control)", out)

    def test_json_in_json_out(self):
        rc, out, _ = self.run_main(["--json", json.dumps(payload()), "--format", "json"])
        self.assertEqual(rc, 0)
        self.assertEqual(json.loads(out)["control"], "list")

    def test_bad_input_exits_2(self):
        rc, _, err = self.run_main(["--arm", "list:3:5", "--arm", "direct:4:1"])
        self.assertEqual(rc, 2)
        self.assertIn("more conversions", err)


if __name__ == "__main__":
    unittest.main(verbosity=1)
